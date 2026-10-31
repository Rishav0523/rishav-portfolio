"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileText,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Mail,
  MailOpen,
  RefreshCw,
  Rocket,
  Save,
  Trash2,
} from "lucide-react";
import type { ContentDoc } from "@/lib/content";
import {
  AchievementsEditor,
  EducationEditor,
  ExperienceEditor,
  ProfileEditor,
  ProjectsEditor,
  SkillsEditor,
  type Patch,
} from "./content-editors";

type Message = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
  is_read: number;
};

type MediaItem = {
  key: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
};

type Notice = { kind: "success" | "error" | "info"; text: string; details?: string[] };

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "achievements", label: "Achievements" },
  { id: "resume", label: "Resume" },
  { id: "messages", label: "Messages" },
  { id: "media", label: "Media" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ApiResult<T> = { status: number; body: T };

async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(path, { credentials: "same-origin", ...init });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

function formatDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const palette =
    notice.kind === "success"
      ? "border-[color-mix(in_srgb,var(--teal)_45%,var(--line))]"
      : notice.kind === "error"
        ? "border-[color-mix(in_srgb,var(--coral)_55%,var(--line))]"
        : "";
  const Icon = notice.kind === "success" ? CheckCircle2 : AlertCircle;
  const iconColor = notice.kind === "success" ? "text-[var(--teal)]" : "text-[var(--coral)]";

  return (
    <div className={`form-status ${palette} mb-5`} role="status">
      <p className="inline-flex items-start gap-2 font-medium text-[var(--ink)]">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden />
        {notice.text}
      </p>
      {notice.details && notice.details.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[var(--muted)]">
          {notice.details.slice(0, 8).map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LoginPanel({
  mode,
  onSignedIn,
}: {
  mode: "login" | "unconfigured" | "offline";
  onSignedIn: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await api<{ error?: string }>("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (result.status === 200) {
        setPassword("");
        onSignedIn();
        return;
      }
      setError(result.body.error ?? "Sign-in failed. Please try again.");
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="container-page relative py-16 md:py-24">
        <div className="mx-auto max-w-md">
          <p className="eyebrow">Private area</p>
          <h1 className="display mt-4 text-3xl">Admin sign-in</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            This page manages the portfolio content. Only the site owner has the password.
          </p>

          {mode === "unconfigured" ? (
            <div className="card mt-8 p-6">
              <h2 className="text-base font-semibold">Admin is not configured yet</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Set the two Worker secrets below, then reload this page.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-4 text-xs leading-relaxed">
                <code>{`node scripts/hash-password.mjs "<password>"
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put SESSION_SECRET`}</code>
              </pre>
            </div>
          ) : mode === "offline" ? (
            <div className="card mt-8 p-6">
              <h2 className="text-base font-semibold">The API is unreachable</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                The dashboard could not reach the Worker. Check the deployment, then reload.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card mt-8 grid gap-4 p-6">
              <div className="form-field">
                <label className="form-label" htmlFor="admin-password">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error ? <p className="form-error">{error}</p> : null}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <p className="form-hint">
                Sessions last 12 hours. Sign-in attempts are rate limited per connection.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function ResumePanel({
  doc,
  patch,
  setNotice,
}: {
  doc: ContentDoc;
  patch: Patch;
  setNotice: (notice: Notice | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<"checking" | "enabled" | "disabled">("checking");

  useEffect(() => {
    void (async () => {
      try {
        const result = await api<{ error?: string }>("/api/admin/media");
        setMedia(result.status === 200 ? "enabled" : "disabled");
      } catch {
        setMedia("disabled");
      }
    })();
  }, []);

  async function handleUpload(file: File | undefined) {
    if (!file || busy) return;
    if (file.type !== "application/pdf") {
      setNotice({ kind: "error", text: "Choose a PDF file." });
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api<{ error?: string; href?: string }>("/api/admin/resume", {
        method: "POST",
        body: form,
      });
      if (result.status === 201 && result.body.href) {
        patch("resumePdf", { href: result.body.href, approvedForPublish: true });
        setNotice({
          kind: "success",
          text: "Resume uploaded to R2 and approved. Save, then publish to rebuild the site.",
        });
      } else {
        setNotice({ kind: "error", text: result.body.error ?? "Upload failed." });
      }
    } catch {
      setNotice({ kind: "error", text: "Upload failed. Check your connection." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="display text-2xl">Resume PDF</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          The public pages only link the PDF when it is approved. Replacing the file needs R2 media
          storage; without it the PDF is swapped in the repository.
        </p>
      </div>

      <div className="card grid gap-5 p-5 md:p-6">
        <div className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Current PDF
          </span>
          {doc.resumePdf.approvedForPublish ? (
            <a
              href={doc.resumePdf.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-medium text-[var(--link)] hover:underline"
            >
              <FileText className="h-4 w-4" aria-hidden />
              {doc.resumePdf.href}
            </a>
          ) : (
            <span className="text-[var(--muted)]">Not approved for publish.</span>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--cerulean)]"
            checked={doc.resumePdf.approvedForPublish}
            onChange={(event) =>
              patch("resumePdf", { ...doc.resumePdf, approvedForPublish: event.target.checked })
            }
          />
          Approved for public download
        </label>

        <div className="border-t border-[var(--line)] pt-4">
          {media === "enabled" ? (
            <>
              <label className="form-label" htmlFor="resume-upload">
                Replace the PDF (R2)
              </label>
              <input
                id="resume-upload"
                type="file"
                accept="application/pdf"
                className="mt-2 block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--cerulean)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                onChange={(event) => {
                  void handleUpload(event.target.files?.[0]);
                  event.target.value = "";
                }}
                disabled={busy}
              />
              <p className="form-hint mt-2">
                PDF only, up to 5 MB. The static PDF in the build is unaffected.
              </p>
              {busy ? (
                <p className="form-hint mt-2 inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Uploading…
                </p>
              ) : null}
            </>
          ) : null}

          {media === "disabled" ? (
            <div className="text-sm leading-relaxed text-[var(--muted)]">
              <p className="font-semibold text-[var(--ink)]">No R2 bucket on this account</p>
              <p className="mt-2">
                Uploads are off, so replace the file in the repository instead: put the new PDF at{" "}
                <code className="rounded bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] px-1 py-0.5 text-xs">
                  public/resume/rishav-prasad-resume.pdf
                </code>{" "}
                and push. The deploy rebuilds the site with it, and the public link above keeps
                working because the path does not change.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MessagesPanel({ setNotice }: { setNotice: (notice: Notice | null) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ messages?: Message[]; error?: string }>("/api/admin/messages");
      if (result.status === 200) setMessages(result.body.messages ?? []);
      else setNotice({ kind: "error", text: result.body.error ?? "Could not load messages." });
    } catch {
      setNotice({ kind: "error", text: "Could not load messages." });
    } finally {
      setLoading(false);
    }
  }, [setNotice]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: number) {
    setBusyId(id);
    await api(`/api/admin/messages/${id}`, { method: "PATCH" });
    setMessages((current) => current.map((m) => (m.id === id ? { ...m, is_read: 1 } : m)));
    setBusyId(null);
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this message permanently?")) return;
    setBusyId(id);
    await api(`/api/admin/messages/${id}`, { method: "DELETE" });
    setMessages((current) => current.filter((m) => m.id !== id));
    setBusyId(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl">Messages</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Contact form submissions, newest first. Messages are stored in D1; there is no email
            notification.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="btn btn-outline min-h-0 px-4 py-2 text-xs">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="form-status inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading messages…
        </p>
      ) : messages.length === 0 ? (
        <p className="form-status">No messages yet.</p>
      ) : (
        <ul className="grid gap-3">
          {messages.map((message) => (
            <li key={message.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {message.is_read ? (
                      <MailOpen className="mr-1.5 inline h-4 w-4 text-[var(--muted)]" aria-hidden />
                    ) : (
                      <Mail className="mr-1.5 inline h-4 w-4 text-[var(--coral)]" aria-hidden />
                    )}
                    {message.subject || "No subject"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {message.name} · {message.email} · {formatDate(message.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!message.is_read ? (
                    <button
                      type="button"
                      onClick={() => void markRead(message.id)}
                      disabled={busyId === message.id}
                      className="btn btn-outline min-h-0 px-3 py-1.5 text-xs"
                    >
                      Mark read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void remove(message.id)}
                    disabled={busyId === message.id}
                    className="btn btn-outline min-h-0 px-3 py-1.5 text-xs text-[#b23c33] dark:text-[#ff9a92]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line border-t border-[var(--line)] pt-3 text-sm leading-relaxed text-[var(--muted)]">
                {message.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MediaPanel({ setNotice }: { setNotice: (notice: Notice | null) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ media?: MediaItem[]; error?: string }>("/api/admin/media");
      if (result.status === 200) {
        setItems(result.body.media ?? []);
        setEnabled(true);
      } else if (result.status === 503) {
        setEnabled(false);
      } else {
        setNotice({ kind: "error", text: result.body.error ?? "Could not load media." });
      }
    } catch {
      setNotice({ kind: "error", text: "Could not load media." });
    } finally {
      setLoading(false);
    }
  }, [setNotice]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api<{ error?: string; href?: string }>("/api/admin/media", {
        method: "POST",
        body: form,
      });
      if (result.status === 201) {
        setNotice({ kind: "success", text: "Image uploaded." });
        await load();
      } else {
        setNotice({ kind: "error", text: result.body.error ?? "Upload failed." });
      }
    } catch {
      setNotice({ kind: "error", text: "Upload failed." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(key: string) {
    if (!window.confirm("Delete this image? Links to it will break.")) return;
    setBusy(true);
    await api(`/api/admin/media/${key}`, { method: "DELETE" });
    setBusy(false);
    await load();
  }

  if (!enabled) {
    return (
      <div>
        <h2 className="display text-2xl">Media</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          R2 media storage is not enabled on this account yet.
        </p>
        <div className="card mt-5 p-6 text-sm leading-relaxed text-[var(--muted)]">
          <p>Enable R2 in the Cloudflare dashboard, create a bucket, then uncomment the binding:</p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-4 text-xs">
            <code>{`npx wrangler r2 bucket create rishav-portfolio-media
# wrangler.jsonc
"r2_buckets": [{ "binding": "MEDIA", "bucket_name": "rishav-portfolio-media" }]`}</code>
          </pre>
          <p className="mt-3">The site works without it; media uploads stay unavailable until then.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl">Media</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Images stored in R2, served from /media/.</p>
        </div>
        <label className="btn btn-outline min-h-0 cursor-pointer px-4 py-2 text-xs">
          <CloudUpload className="h-3.5 w-3.5" aria-hidden />
          {busy ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
            disabled={busy}
          />
        </label>
      </div>

      {loading ? (
        <p className="form-status inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading media…
        </p>
      ) : items.length === 0 ? (
        <p className="form-status">No images uploaded yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.key} className="card overflow-hidden">
              <div className="aspect-[4/3] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/${item.key}`}
                  alt={item.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{item.filename}</p>
                  <p className="text-[11px] text-[var(--muted)]">{Math.round(item.size / 1024)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(item.key)}
                  className="rounded-full p-2 text-[#b23c33] transition-colors hover:bg-[rgba(240,113,103,0.12)] dark:text-[#ff9a92]"
                  aria-label={`Delete ${item.filename}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [phase, setPhase] = useState<"checking" | "login" | "ready" | "unconfigured" | "offline">(
    "checking",
  );
  const [doc, setDoc] = useState<ContentDoc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<TabId>("profile");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);

  const loadContent = useCallback(async () => {
    const result = await api<ContentDoc & { error?: string }>("/api/admin/content");
    if (result.status === 200) {
      setDoc(result.body);
      setDirty(false);
      setPhase("ready");
    } else if (result.status === 401) {
      setPhase("login");
    } else if (result.status === 503) {
      setPhase("unconfigured");
    } else {
      setPhase("offline");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const result = await api<{ authenticated?: boolean }>("/api/admin/session");
        if (result.status === 200) await loadContent();
        else if (result.status === 503) setPhase("unconfigured");
        else setPhase("login");
      } catch {
        setPhase("offline");
      }
    })();
  }, [loadContent]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch: Patch = (key, value) => {
    setDoc((current) => (current ? { ...current, [key]: value } : current));
    setDirty(true);
    setNotice(null);
  };

  async function save(): Promise<boolean> {
    if (!doc || busy) return false;
    setBusy("save");
    setNotice(null);
    try {
      const result = await api<{ error?: string; details?: string[] }>("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (result.status === 200) {
        setDirty(false);
        setNotice({ kind: "success", text: "Saved to D1. Publish to rebuild the public site." });
        return true;
      }
      if (result.status === 401) {
        setPhase("login");
        return false;
      }
      setNotice({
        kind: "error",
        text: result.body.error ?? "Save failed.",
        details: result.body.details,
      });
      return false;
    } catch {
      setNotice({ kind: "error", text: "Save failed. Check your connection." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (busy) return;
    if (dirty) {
      setNotice({ kind: "info", text: "Save your changes before publishing." });
      return;
    }
    setBusy("publish");
    setNotice(null);
    try {
      const result = await api<{ error?: string; message?: string }>("/api/admin/publish", {
        method: "POST",
      });
      if (result.status === 202) {
        setNotice({
          kind: "success",
          text: result.body.message ?? "Rebuild queued. The site updates in a minute or two.",
        });
      } else if (result.status === 401) {
        setDoc(null);
        setPhase("login");
      } else {
        setNotice({
          kind: "error",
          text:
            result.body.error ??
            "Publish failed. Check the GITHUB_TOKEN secret and the repository dispatch workflow.",
        });
      }
    } catch {
      setNotice({ kind: "error", text: "Publish failed. Check your connection." });
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    setDoc(null);
    setDirty(false);
    setPhase("login");
  }

  if (phase === "checking") {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center py-20">
        <p className="form-status inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Checking session…
        </p>
      </div>
    );
  }

  if (phase !== "ready" || !doc) {
    return (
      <LoginPanel
        mode={phase === "unconfigured" ? "unconfigured" : phase === "offline" ? "offline" : "login"}
        onSignedIn={() => void loadContent()}
      />
    );
  }

  return (
    <section className="min-h-dvh">
      <div className="container-page py-8 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Private dashboard</p>
            <h1 className="display mt-3 text-3xl">Content manager</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Edits are saved to D1, then published by rebuilding the static site.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void save()} className="btn btn-outline" disabled={!!busy}>
              {busy === "save" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Save changes
            </button>
            <button type="button" onClick={() => void publish()} className="btn btn-primary" disabled={!!busy}>
              {busy === "publish" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Rocket className="h-4 w-4" aria-hidden />
              )}
              Publish
            </button>
            <button type="button" onClick={() => void logout()} className="btn btn-outline" aria-label="Sign out">
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                tab === item.id
                  ? "bg-[var(--cerulean)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {dirty ? (
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
            <AlertCircle className="h-3.5 w-3.5 text-[var(--coral)]" aria-hidden />
            Unsaved changes
          </p>
        ) : null}

        <div className="mt-6">
          {notice ? <NoticeBanner notice={notice} /> : null}

          {tab === "profile" ? <ProfileEditor doc={doc} patch={patch} /> : null}
          {tab === "education" ? <EducationEditor doc={doc} patch={patch} /> : null}
          {tab === "skills" ? <SkillsEditor doc={doc} patch={patch} /> : null}
          {tab === "experience" ? <ExperienceEditor doc={doc} patch={patch} /> : null}
          {tab === "projects" ? <ProjectsEditor doc={doc} patch={patch} /> : null}
          {tab === "achievements" ? <AchievementsEditor doc={doc} patch={patch} /> : null}
          {tab === "resume" ? <ResumePanel doc={doc} patch={patch} setNotice={setNotice} /> : null}
          {tab === "messages" ? <MessagesPanel setNotice={setNotice} /> : null}
          {tab === "media" ? <MediaPanel setNotice={setNotice} /> : null}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-xs text-[var(--muted)] md:flex-row md:items-center md:justify-between">
          <span className="inline-flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
            Media requires the R2 binding. Messages and content use D1.
          </span>
          <a href="/" className="font-semibold text-[var(--link)] hover:underline">
            View public site
          </a>
        </div>
      </div>
    </section>
  );
}
