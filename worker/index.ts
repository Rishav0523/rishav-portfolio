import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { defaultContent, type ContentDoc } from "../lib/content";
import airshare from "./airshare";
import { createSession, sha256Hex, verifyPassword, verifySession } from "./auth";
import { validateContent } from "./content-schema";
import type { Env } from "./env";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL = 12 * 60 * 60;
const MAX_BODY_BYTES = 1024 * 1024;
const CONTACT_WINDOW_MINUTES = 60;
const CONTACT_MAX_PER_WINDOW = 5;
const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 8;

type MessageRow = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
  is_read: number;
};

type MediaRow = {
  key: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
};

function originAllowed(request: Request, siteUrl?: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin || origin === siteUrl;
}

const app = new Hono<{ Bindings: Env }>();

function jsonError(message: string, status: 400 | 401 | 403 | 404 | 409 | 429 | 503) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

async function ipHash(request: Request): Promise<string> {
  return sha256Hex(`contact:${clientIp(request)}`);
}

// Timestamps are stored as ISO-8601 UTC strings, so compare against an ISO
// threshold computed in JS rather than SQLite's "YYYY-MM-DD HH:MM:SS" format.
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

// Public pages must keep rendering if D1 is down, but the admin editor must see
// the failure: serving defaults there would overwrite real content on next save.
async function readDoc(env: Env, strict = false): Promise<ContentDoc> {
  try {
    const row = await env.DB.prepare("SELECT document FROM site_content WHERE id = 1").first<{
      document: string;
    }>();
    if (!row) return defaultContent;
    const parsed = validateContent(JSON.parse(row.document));
    if (parsed.ok) return parsed.doc;
    if (strict) throw new Error("Stored content failed validation.");
    return defaultContent;
  } catch (error) {
    if (strict) throw error;
    return defaultContent;
  }
}

async function writeDoc(env: Env, doc: ContentDoc): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO site_content (id, document, updated_at) VALUES (1, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET document = excluded.document, updated_at = excluded.updated_at",
  )
    .bind(JSON.stringify(doc), new Date().toISOString())
    .run();
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip !== "unknown") body.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

app.use("*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const length = Number.parseInt(c.req.header("content-length") ?? "0", 10);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      return jsonError("Request body is too large.", 400);
    }
  }
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
});

app.get("/api/health", async (c) => {
  try {
    await c.env.DB.prepare("SELECT 1").first();
    return c.json({ ok: true, service: "portfolio-api", database: "ok" });
  } catch {
    return c.json({ ok: false, service: "portfolio-api", database: "unavailable" }, 503);
  }
});

app.get("/api/content", async (c) => {
  const doc = await readDoc(c.env);
  c.header("Cache-Control", "public, max-age=60");
  return c.json(doc);
});

app.post("/api/contact", async (c) => {
  if (!c.env.TURNSTILE_SECRET) {
    return jsonError("The contact form is not configured yet. Please send email instead.", 503);
  }

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  if (typeof body.website === "string" && body.website.trim() !== "") {
    return c.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";

  if (name.length < 2 || name.length > 80) return jsonError("Please enter your name.", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) {
    return jsonError("Please enter a valid email address.", 400);
  }
  if (subject.length > 120) return jsonError("Subject is too long.", 400);
  if (message.length < 10 || message.length > 4000) {
    return jsonError("Message must be between 10 and 4000 characters.", 400);
  }
  if (!token) return jsonError("Please complete the verification challenge.", 400);

  if (!(await verifyTurnstile(c.env.TURNSTILE_SECRET, token, clientIp(c.req.raw)))) {
    return jsonError("Verification failed. Please try again.", 400);
  }

  const hash = await ipHash(c.req.raw);
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM contact_messages WHERE ip_hash = ? AND created_at > ?",
  )
    .bind(hash, minutesAgo(CONTACT_WINDOW_MINUTES))
    .first<{ count: number }>();

  if ((recent?.count ?? 0) >= CONTACT_MAX_PER_WINDOW) {
    return jsonError("Too many messages from this connection. Please try again later.", 429);
  }

  await c.env.DB.prepare(
    "INSERT INTO contact_messages (name, email, subject, message, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(name, email, subject || null, message, hash, new Date().toISOString())
    .run();

  return c.json({ ok: true }, 201);
});

const admin = new Hono<{ Bindings: Env }>();

app.route("/api/airshare", airshare);

admin.post("/login", async (c) => {
  if (!c.env.ADMIN_PASSWORD_HASH || !c.env.SESSION_SECRET) {
    return jsonError("Admin login is not configured yet.", 503);
  }

  if (!originAllowed(c.req.raw, c.env.SITE_URL)) {
    return jsonError("Origin not allowed.", 403);
  }

  let body: { password?: unknown };
  try {
    body = (await c.req.json()) as { password?: unknown };
  } catch {
    return jsonError("Invalid request body.", 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 1 || password.length > 200) return jsonError("Invalid credentials.", 401);

  const hash = await ipHash(c.req.raw);
  const attempts = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM login_attempts WHERE ip_hash = ? AND attempted_at > ?",
  )
    .bind(hash, minutesAgo(LOGIN_WINDOW_MINUTES))
    .first<{ count: number }>();

  if ((attempts?.count ?? 0) >= LOGIN_MAX_ATTEMPTS) {
    return jsonError("Too many attempts. Try again in a few minutes.", 429);
  }

  const valid = await verifyPassword(password, c.env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    await c.env.DB.prepare("INSERT INTO login_attempts (ip_hash, attempted_at) VALUES (?, ?)")
      .bind(hash, new Date().toISOString())
      .run();
    return jsonError("Invalid credentials.", 401);
  }

  await c.env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at < ?")
    .bind(minutesAgo(24 * 60))
    .run();
  const token = await createSession(c.env.SESSION_SECRET, SESSION_TTL);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Strict",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_TTL,
  });
  return c.json({ ok: true });
});

admin.use("*", async (c, next) => {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return jsonError("Admin is not configured yet.", 503);

  const session = await verifySession(getCookie(c, SESSION_COOKIE), secret);
  if (!session) return jsonError("Not signed in.", 401);

  if (c.req.method !== "GET" && c.req.method !== "HEAD" && !originAllowed(c.req.raw, c.env.SITE_URL)) {
    return jsonError("Origin not allowed.", 403);
  }
  await next();
});

admin.post("/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

admin.get("/session", (c) => c.json({ authenticated: true }));

admin.get("/content", async (c) => {
  try {
    const doc = await readDoc(c.env, true);
    return c.json(doc);
  } catch {
    return jsonError("Stored content could not be read. Nothing was changed.", 503);
  }
});

admin.put("/content", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  const parsed = validateContent(body);
  if (!parsed.ok) return c.json({ error: "Validation failed.", details: parsed.errors }, 400);
  await writeDoc(c.env, parsed.doc);
  return c.json({ ok: true, updatedAt: new Date().toISOString() });
});

admin.post("/publish", async (c) => {
  if (!c.env.GITHUB_TOKEN || !c.env.GITHUB_REPO) {
    return jsonError("Publishing is not configured. Set the GITHUB_TOKEN secret.", 503);
  }
  const response = await fetch(`https://api.github.com/repos/${c.env.GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "rishav-portfolio-admin",
    },
    body: JSON.stringify({ event_type: "content-published" }),
  });
  if (!response.ok) {
    return jsonError(`GitHub rejected the rebuild request (${response.status}).`, 503);
  }
  return c.json({ ok: true, message: "Rebuild queued." }, 202);
});

admin.get("/messages", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, name, email, subject, message, created_at, is_read FROM contact_messages ORDER BY id DESC LIMIT 100",
  ).all<MessageRow>();
  return c.json({ messages: rows.results ?? [] });
});

admin.patch("/messages/:id", async (c) => {
  const id = Number.parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return jsonError("Invalid id.", 400);
  await c.env.DB.prepare("UPDATE contact_messages SET is_read = 1 WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

admin.delete("/messages/:id", async (c) => {
  const id = Number.parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return jsonError("Invalid id.", 400);
  await c.env.DB.prepare("DELETE FROM contact_messages WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

admin.get("/media", async (c) => {
  if (!c.env.MEDIA) return jsonError("R2 media storage is not enabled.", 503);
  const rows = await c.env.DB.prepare(
    "SELECT key, filename, content_type, size, created_at FROM media ORDER BY created_at DESC LIMIT 100",
  ).all<MediaRow>();
  return c.json({ media: rows.results ?? [] });
});

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

admin.post("/media", async (c) => {
  if (!c.env.MEDIA) return jsonError("R2 media storage is not enabled.", 503);
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Attach an image file.", 400);
  const extension = IMAGE_TYPES[file.type];
  if (!extension) return jsonError("Images must be JPEG, PNG, WebP or GIF.", 400);
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return jsonError("Images must be smaller than 5 MB.", 400);
  }

  const key = `media/${crypto.randomUUID()}.${extension}`;
  await c.env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  await c.env.DB.prepare(
    "INSERT INTO media (key, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(key, file.name.slice(0, 200), file.type, file.size, new Date().toISOString())
    .run();
  return c.json({ ok: true, key, href: `/${key}` }, 201);
});

admin.delete("/media/:key{.+}", async (c) => {
  if (!c.env.MEDIA) return jsonError("R2 media storage is not enabled.", 503);
  const key = c.req.param("key");
  if (!key.startsWith("media/") || key.includes("..")) return jsonError("Invalid key.", 400);
  await c.env.MEDIA.delete(key);
  await c.env.DB.prepare("DELETE FROM media WHERE key = ?").bind(key).run();
  return c.json({ ok: true });
});

admin.post("/resume", async (c) => {
  if (!c.env.MEDIA) return jsonError("R2 media storage is not enabled.", 503);
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Attach a PDF file.", 400);
  if (file.type !== "application/pdf") return jsonError("The resume must be a PDF.", 400);
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return jsonError("The PDF must be smaller than 5 MB.", 400);
  }

  const key = "resume/rishav-prasad-resume.pdf";
  let doc: ContentDoc;
  try {
    doc = await readDoc(c.env, true);
  } catch {
    return jsonError("Stored content could not be read. The file was not uploaded.", 503);
  }
  await c.env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: "application/pdf" },
  });

  doc.resumePdf = { href: `/media/${key}`, approvedForPublish: true };
  await writeDoc(c.env, doc);
  return c.json({ ok: true, href: `/media/${key}`, size: file.size }, 201);
});

app.route("/api/admin", admin);

app.get("/media/:key{.+}", async (c) => {
  if (!c.env.MEDIA) return jsonError("R2 media storage is not enabled.", 503);
  const key = c.req.param("key");
  if (key.includes("..")) return jsonError("Invalid key.", 400);
  const object = await c.env.MEDIA.get(key);
  if (!object) return jsonError("Not found.", 404);
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

app.notFound((c) => jsonError("Not found.", 404));

app.onError((error) => {
  console.error("api_error", error instanceof Error ? error.message : "unknown");
  return jsonError("Something went wrong.", 503);
});

export default app;
