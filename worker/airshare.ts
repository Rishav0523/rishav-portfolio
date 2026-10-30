import { Hono } from "hono";
import { sha256Hex } from "./auth";
import type { Env } from "./env";

// D1 holds presence and WebRTC signaling only. File bytes travel directly
// between the two browsers, so nothing in this module can reassemble a file.

const PIN_PATTERN = /^\d{6,10}$/;
const PEER_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const SESSION_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const ROOM_PATTERN = /^[a-f0-9]{64}$/;

const MAX_PEERS_PER_ROOM = 8;
const PEER_TTL_MS = 90_000;
const SIGNAL_TTL_MS = 10 * 60_000;
const JOIN_WINDOW_MS = 10 * 60_000;
const JOIN_MAX_PER_WINDOW = 30;
const SIGNAL_WINDOW_MS = 60_000;
const SIGNAL_MAX_PER_MINUTE = 120;
const MAX_SIGNAL_BYTES = 64 * 1024;
const MAX_POLL_SIGNALS = 50;

type PeerRow = { peer_id: string; name: string; last_seen: string };
type SignalRow = { id: number; from_peer: string; payload: string };
type PeerView = { id: string; name: string; lastSeen: string };

const airshare = new Hono<{ Bindings: Env }>();

function jsonError(
  message: string,
  status: 400 | 403 | 409 | 410 | 429 | 503,
) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function originAllowed(request: Request, siteUrl?: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin || origin === siteUrl;
}

async function ipHash(request: Request): Promise<string> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  return sha256Hex(`airshare:${ip}`);
}

function isoBefore(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

async function prune(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM airshare_peers WHERE last_seen < ?").bind(isoBefore(PEER_TTL_MS)),
    env.DB.prepare("DELETE FROM airshare_signals WHERE created_at < ?").bind(isoBefore(SIGNAL_TTL_MS)),
    env.DB.prepare("DELETE FROM airshare_join_attempts WHERE attempted_at < ?").bind(
      isoBefore(24 * 60 * 60_000),
    ),
  ]);
}

async function readPeers(env: Env, room: string): Promise<PeerView[]> {
  const rows = await env.DB.prepare(
    "SELECT peer_id, name, last_seen FROM airshare_peers WHERE room_id = ? AND last_seen > ? " +
      "ORDER BY name COLLATE NOCASE, peer_id",
  )
    .bind(room, isoBefore(PEER_TTL_MS))
    .all<PeerRow>();
  return (rows.results ?? []).map((row) => ({
    id: row.peer_id,
    name: row.name,
    lastSeen: row.last_seen,
  }));
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function validName(name: string): boolean {
  return name.length >= 1 && name.length <= 40 && !/[\u0000-\u001f\u007f]/.test(name);
}

function validSession(value: string): boolean {
  return SESSION_PATTERN.test(value);
}

function normalizeSignal(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;

  if (payload.kind !== "sdp" && payload.kind !== "ice") return null;

  const session = asString(payload.session);
  if (!validSession(session)) return null;

  if (payload.kind === "sdp") {
    const type = payload.type;
    const sdp = payload.sdp;
    if ((type !== "offer" && type !== "answer") || typeof sdp !== "string") return null;
    if (sdp.length === 0 || sdp.length > 60_000) return null;
    return JSON.stringify({ kind: "sdp", session, type, sdp });
  }

  const candidate = payload.candidate;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const source = candidate as Record<string, unknown>;
  const line = asString(source.candidate);
  if (!line || line.length > 2048) return null;
  const mid = typeof source.sdpMid === "string" ? source.sdpMid.slice(0, 32) : null;
  const index =
    typeof source.sdpMLineIndex === "number" && Number.isInteger(source.sdpMLineIndex)
      ? source.sdpMLineIndex
      : null;
  return JSON.stringify({
    kind: "ice",
    session,
    candidate: { candidate: line, sdpMid: mid, sdpMLineIndex: index },
  });
}

airshare.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    if (!originAllowed(c.req.raw, c.env.SITE_URL)) return jsonError("Origin not allowed.", 403);
  }
  await next();
  c.header("Cache-Control", "no-store");
});

airshare.post("/join", async (c) => {
  const body = await readJson(c.req.raw);
  if (!body) return jsonError("Invalid request body.", 400);

  const pin = asString(body.pin);
  const peerId = asString(body.peerId);
  const name = asString(body.name).trim();

  if (!PIN_PATTERN.test(pin)) return jsonError("Use a PIN of 6 to 10 digits.", 400);
  if (!PEER_PATTERN.test(peerId)) return jsonError("Invalid device identifier.", 400);
  if (!validName(name)) return jsonError("Enter a device name of 1 to 40 characters.", 400);

  const hash = await ipHash(c.req.raw);
  const attempts = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM airshare_join_attempts WHERE ip_hash = ? AND attempted_at > ?",
  )
    .bind(hash, isoBefore(JOIN_WINDOW_MS))
    .first<{ count: number }>();

  if ((attempts?.count ?? 0) >= JOIN_MAX_PER_WINDOW) {
    return jsonError("Too many join attempts from this connection. Try again later.", 429);
  }
  await c.env.DB.prepare("INSERT INTO airshare_join_attempts (ip_hash, attempted_at) VALUES (?, ?)")
    .bind(hash, new Date().toISOString())
    .run();

  const room = await sha256Hex(`airshare:v1:${pin}`);
  await prune(c.env);

  const existing = await c.env.DB.prepare(
    "SELECT peer_id FROM airshare_peers WHERE room_id = ? AND peer_id = ?",
  )
    .bind(room, peerId)
    .first<{ peer_id: string }>();

  if (!existing) {
    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM airshare_peers WHERE room_id = ? AND last_seen > ?",
    )
      .bind(room, isoBefore(PEER_TTL_MS))
      .first<{ count: number }>();
    if ((count?.count ?? 0) >= MAX_PEERS_PER_ROOM) {
      return jsonError("This room is full. Ask everyone to leave and try again.", 409);
    }
  }

  await c.env.DB.prepare(
    "INSERT INTO airshare_peers (room_id, peer_id, name, last_seen) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT(room_id, peer_id) DO UPDATE SET name = excluded.name, last_seen = excluded.last_seen",
  )
    .bind(room, peerId, name, new Date().toISOString())
    .run();

  return c.json({ room, peers: await readPeers(c.env, room) });
});

airshare.post("/heartbeat", async (c) => {
  const body = await readJson(c.req.raw);
  if (!body) return jsonError("Invalid request body.", 400);

  const room = asString(body.room);
  const peerId = asString(body.peerId);
  if (!ROOM_PATTERN.test(room) || !PEER_PATTERN.test(peerId)) {
    return jsonError("Invalid session.", 400);
  }

  const result = await c.env.DB.prepare(
    "UPDATE airshare_peers SET last_seen = ? WHERE room_id = ? AND peer_id = ?",
  )
    .bind(new Date().toISOString(), room, peerId)
    .run();

  if ((result.meta.changes ?? 0) === 0) {
    return jsonError("Your session expired. Join again with the PIN.", 410);
  }

  if (Math.random() < 0.2) await prune(c.env);
  return c.json({ peers: await readPeers(c.env, room) });
});

airshare.post("/signal", async (c) => {
  const body = await readJson(c.req.raw);
  if (!body) return jsonError("Invalid request body.", 400);

  const room = asString(body.room);
  const from = asString(body.from);
  const to = asString(body.to);

  if (!ROOM_PATTERN.test(room) || !PEER_PATTERN.test(from) || !PEER_PATTERN.test(to)) {
    return jsonError("Invalid session.", 400);
  }
  if (from === to) return jsonError("A device cannot signal itself.", 400);

  const signal = normalizeSignal(body.payload);
  if (!signal) return jsonError("Invalid signal.", 400);
  if (new TextEncoder().encode(signal).length > MAX_SIGNAL_BYTES) {
    return jsonError("Signal is too large.", 400);
  }

  const members = await c.env.DB.prepare(
    "SELECT peer_id FROM airshare_peers WHERE room_id = ? AND last_seen > ? AND peer_id IN (?, ?)",
  )
    .bind(room, isoBefore(PEER_TTL_MS), from, to)
    .all<{ peer_id: string }>();
  if ((members.results?.length ?? 0) < 2) {
    return jsonError("That device is no longer in the room.", 409);
  }

  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM airshare_signals WHERE room_id = ? AND from_peer = ? AND created_at > ?",
  )
    .bind(room, from, isoBefore(SIGNAL_WINDOW_MS))
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= SIGNAL_MAX_PER_MINUTE) {
    return jsonError("Too many connection messages. Try again in a moment.", 429);
  }

  await c.env.DB.prepare(
    "INSERT INTO airshare_signals (room_id, from_peer, to_peer, payload, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(room, from, to, signal, new Date().toISOString())
    .run();

  return c.json({ ok: true }, 201);
});

airshare.get("/signals", async (c) => {
  const room = c.req.query("room") ?? "";
  const peerId = c.req.query("peer") ?? "";
  const since = Number.parseInt(c.req.query("since") ?? "0", 10);

  if (!ROOM_PATTERN.test(room) || !PEER_PATTERN.test(peerId)) {
    return jsonError("Invalid session.", 400);
  }
  if (!Number.isFinite(since) || since < 0) return jsonError("Invalid cursor.", 400);

  const member = await c.env.DB.prepare(
    "SELECT peer_id FROM airshare_peers WHERE room_id = ? AND peer_id = ? AND last_seen > ?",
  )
    .bind(room, peerId, isoBefore(PEER_TTL_MS))
    .first<{ peer_id: string }>();
  if (!member) return jsonError("Your session expired. Join again with the PIN.", 410);

  const signals = await c.env.DB.prepare(
    "SELECT id, from_peer, payload FROM airshare_signals " +
      "WHERE room_id = ? AND to_peer = ? AND id > ? ORDER BY id ASC LIMIT ?",
  )
    .bind(room, peerId, since, MAX_POLL_SIGNALS)
    .all<SignalRow>();

  const rows = signals.results ?? [];
  const peers = await readPeers(c.env, room);
  const cursor = rows.length > 0 ? rows[rows.length - 1].id : since;

  return c.json({
    signals: rows.map((row) => ({ id: row.id, from: row.from_peer, payload: row.payload })),
    cursor,
    peers,
  });
});

airshare.post("/leave", async (c) => {
  const body = await readJson(c.req.raw);
  if (!body) return jsonError("Invalid request body.", 400);

  const room = asString(body.room);
  const peerId = asString(body.peerId);
  if (!ROOM_PATTERN.test(room) || !PEER_PATTERN.test(peerId)) {
    return jsonError("Invalid session.", 400);
  }

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM airshare_signals WHERE room_id = ? AND (from_peer = ? OR to_peer = ?)").bind(
      room,
      peerId,
      peerId,
    ),
    c.env.DB.prepare("DELETE FROM airshare_peers WHERE room_id = ? AND peer_id = ?").bind(room, peerId),
  ]);

  return c.json({ ok: true });
});

export default airshare;
