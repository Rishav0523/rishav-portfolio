/**
 * AirShare server.
 *
 * A small, dependency-light HTTP + WebSocket server for moving files between
 * devices on the same local network. Nothing is persisted: the server streams
 * binary WebSocket frames from sender to receivers without buffering files.
 *
 * Run directly:  npm start   (PORT defaults to 8787)
 * Import:        import { startServer, createServer } from "./server.js"
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";

export const DEFAULT_PORT = 8787;
export const MAX_FILE_BYTES = 500 * 1024 * 1024;
export const MAX_JSON_BYTES = 64 * 1024;
export const MAX_TEXT_LENGTH = 4000;
export const MAX_PEER_NAME_LENGTH = 40;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_OUTGOING_TRANSFERS = 2;
export const MAX_WS_PAYLOAD = 4 * 1024 * 1024;
export const TRANSFER_IDLE_MS = 60_000;
const HEARTBEAT_MS = 30_000;
const SWEEP_MS = 15_000;
const MAX_PROTOCOL_VIOLATIONS = 5;
const RELAY_HIGH_WATER = 8 * 1024 * 1024;
const RELAY_LOW_WATER = 1 * 1024 * 1024;
const RELAY_CHECK_MS = 50;

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"]
]);

const TRANSFER_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Strip control characters and clamp a display name. Returns null if empty. */
function cleanDisplayName(value, maxLength) {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

/** Normalise a file name: drop path components and control characters. */
function cleanFileName(value) {
  if (typeof value !== "string") return null;
  const base = value.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

function cleanMime(value) {
  if (typeof value !== "string") return "application/octet-stream";
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
  return cleaned.length > 0 ? cleaned : "application/octet-stream";
}

function parsePort(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function headerFor(ext) {
  return MIME_TYPES.get(ext.toLowerCase()) ?? "application/octet-stream";
}

/** Resolve a URL path inside publicDir, refusing traversal outside it. */
function resolveStaticPath(publicDir, rawUrlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(rawUrlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (pathname.includes("\0")) return null;
  if (pathname === "/" || pathname === "") pathname = "/index.html";

  const root = path.resolve(publicDir);
  const full = path.resolve(root, "." + path.posix.normalize(pathname));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function serveStatic(req, res, publicDir) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed\n");
    return;
  }

  const filePath = resolveStaticPath(publicDir, req.url ?? "/");
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request\n");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if ((req.url ?? "").startsWith("/favicon.ico")) {
        res.writeHead(204, { "Cache-Control": "no-store" });
        res.end();
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found\n");
      return;
    }

    const headers = {
      "Content-Type": headerFor(path.extname(filePath)),
      "Content-Length": stats.size,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-AirShare-Server": "1",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data: blob:; " +
        "style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; " +
        "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    };

    if (req.method === "HEAD") {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error\n");
    });
    stream.pipe(res);
  });
}

export function getLanAddresses() {
  const addresses = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const entry of interfaces ?? []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(entry.address);
    }
  }
  return [...new Set(addresses)];
}

/**
 * Create an (unstarted) AirShare app.
 *
 * @param {object} [options]
 * @param {string} [options.publicDir] Directory of static files.
 * @param {boolean} [options.quiet] Suppress connection logs (used by tests).
 * @returns {{
 *   httpServer: import("node:http").Server,
 *   wss: WebSocketServer,
 *   listen: (port?: number, host?: string) => Promise<{port: number, host: string}>,
 *   close: () => Promise<void>
 * }}
 */
export function createServer({ publicDir = PUBLIC_DIR, quiet = false } = {}) {
  const log = (...args) => {
    if (!quiet) console.log("[airshare]", ...args);
  };

  const peers = new Map(); // peer id -> { id, name, ws, outgoing: Map }
  const transfersByStream = new Map(); // stream -> transfer
  let nextStream = 1 + Math.floor(Math.random() * 1_000_000);
  let relayMonitor = null;
  let stopping = false;

  const httpServer = http.createServer((req, res) => {
    try {
      serveStatic(req, res, publicDir);
    } catch {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error\n");
    }
  });

  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    maxPayload: MAX_WS_PAYLOAD,
    perMessageDeflate: false
  });

  function sendJson(ws, message) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // A failed send means the socket is going away; the close handler cleans up.
    }
  }

  function sendError(ws, code, message, id) {
    sendJson(ws, { type: "error", code, message, ...(id ? { id } : {}) });
  }

  function closeWithError(ws, code, message) {
    sendError(ws, code, message);
    try {
      ws.close(1008, message.slice(0, 120));
    } catch {
      ws.terminate();
    }
  }

  function peersList() {
    return [...peers.values()].map((peer) => ({ id: peer.id, name: peer.name }));
  }

  function broadcastPeers() {
    const list = peersList();
    for (const peer of peers.values()) sendJson(peer.ws, { type: "peers", peers: list });
  }

  function broadcastToOthers(sender, message) {
    for (const peer of peers.values()) {
      if (peer.id !== sender.id) sendJson(peer.ws, message);
    }
  }

  function allocateStream() {
    for (let attempt = 0; attempt < 10_000; attempt++) {
      const candidate = nextStream;
      nextStream = nextStream >= 0xffffffff ? 1 : nextStream + 1;
      if (!transfersByStream.has(candidate)) return candidate;
    }
    throw new Error("Unable to allocate a transfer stream id");
  }

  /** True while any receiver of this transfer has a full send buffer. */
  function relayCongested(transfer) {
    for (const targetId of transfer.targets) {
      const target = peers.get(targetId);
      if (target && target.ws.bufferedAmount > RELAY_LOW_WATER) return true;
    }
    return false;
  }

  /** Mark one transfer unblocked; resume the sender socket if none are blocked. */
  function releasePause(transfer) {
    if (!transfer.paused) return;
    transfer.paused = false;
    const sender = transfer.sender;
    const anotherPaused = [...sender.outgoing.values()].some(
      (other) => other !== transfer && other.paused
    );
    if (!anotherPaused) {
      try {
        sender.ws.resume();
      } catch {
        // The socket is going away; the close handler cleans up.
      }
    }
  }

  /**
   * Stop reading from a sender whose receivers cannot keep up. This is what
   * keeps a slow phone from making the server queue the whole file in memory.
   */
  function pauseSender(transfer) {
    if (transfer.paused || transfer.closed) return;
    transfer.paused = true;
    try {
      transfer.sender.ws.pause();
    } catch {
      transfer.paused = false;
      return;
    }
    ensureRelayMonitor();
  }

  function ensureRelayMonitor() {
    if (relayMonitor) return;
    relayMonitor = setInterval(() => {
      let anyPaused = false;
      for (const transfer of [...transfersByStream.values()]) {
        if (!transfer.paused) continue;
        if (transfer.closed || !relayCongested(transfer)) {
          releasePause(transfer);
        }
        if (transfer.paused) anyPaused = true;
      }
      if (!anyPaused) {
        clearInterval(relayMonitor);
        relayMonitor = null;
      }
    }, RELAY_CHECK_MS);
    relayMonitor.unref();
  }

  function cancelTransfer(transfer, reason, notifySender = true) {
    if (transfer.closed) return;
    transfer.closed = true;
    transfersByStream.delete(transfer.stream);
    if (transfer.sender && transfer.sender.outgoing.get(transfer.id) === transfer) {
      transfer.sender.outgoing.delete(transfer.id);
    }
    releasePause(transfer);
    const payload = {
      type: "file-cancel",
      id: transfer.id,
      stream: transfer.stream,
      reason
    };
    for (const targetId of transfer.targets) {
      const target = peers.get(targetId);
      if (target) sendJson(target.ws, payload);
    }
    if (notifySender) sendJson(transfer.sender.ws, payload);
  }

  function finishTransfer(transfer) {
    transfersByStream.delete(transfer.stream);
    if (transfer.sender.outgoing.get(transfer.id) === transfer) {
      transfer.sender.outgoing.delete(transfer.id);
    }
    transfer.closed = true;
    releasePause(transfer);
  }

  function removePeer(peer) {
    if (!peers.delete(peer.id)) return;

    // Cancel every transfer this peer was sending.
    for (const transfer of [...peer.outgoing.values()]) {
      cancelTransfer(transfer, "sender-disconnected", false);
    }
    // Stop relaying transfers that were being delivered to this peer.
    for (const transfer of transfersByStream.values()) {
      transfer.targets.delete(peer.id);
    }

    broadcastToOthers(peer, { type: "peer-left", id: peer.id, name: peer.name });
    broadcastPeers();
    log(`${peer.name} left (${peers.size} online)`);
  }

  function handleHello(ws, msg) {
    if (ws.peer) {
      closeWithError(ws, "already-registered", "This connection already sent hello.");
      return;
    }

    const name = cleanDisplayName(msg.name, MAX_PEER_NAME_LENGTH);
    if (!name) {
      closeWithError(ws, "invalid-name", "Send a name between 1 and 40 characters.");
      return;
    }

    const peer = {
      id: randomUUID(),
      name,
      ws,
      outgoing: new Map()
    };
    ws.peer = peer;
    peers.set(peer.id, peer);

    sendJson(ws, {
      type: "welcome",
      id: peer.id,
      name: peer.name,
      peers: peersList().filter((entry) => entry.id !== peer.id),
      limits: {
        maxFileBytes: MAX_FILE_BYTES,
        maxTextLength: MAX_TEXT_LENGTH,
        maxOutgoingTransfers: MAX_OUTGOING_TRANSFERS
      }
    });

    broadcastToOthers(peer, { type: "peer-joined", peer: { id: peer.id, name: peer.name } });
    broadcastPeers();
    log(`${peer.name} joined (${peers.size} online)`);
  }

  function handleRename(peer, msg) {
    const name = cleanDisplayName(msg.name, MAX_PEER_NAME_LENGTH);
    if (!name) {
      sendError(peer.ws, "invalid-name", "Send a name between 1 and 40 characters.");
      return;
    }
    peer.name = name;
    sendJson(peer.ws, { type: "renamed", name });
    broadcastToOthers(peer, { type: "peer-renamed", id: peer.id, name });
    broadcastPeers();
  }

  function handleText(peer, msg) {
    if (typeof msg.text !== "string") {
      sendError(peer.ws, "invalid-text", "Text messages must be strings.");
      return;
    }
    const text = msg.text.trim();
    if (text.length === 0) {
      sendError(peer.ws, "invalid-text", "Text messages cannot be empty.");
      return;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      sendError(peer.ws, "text-too-long", `Text is limited to ${MAX_TEXT_LENGTH} characters.`);
      return;
    }

    const payload = {
      type: "text",
      mid: randomUUID(),
      from: peer.id,
      fromName: peer.name,
      text,
      at: Date.now()
    };
    for (const other of peers.values()) sendJson(other.ws, payload);
  }

  function handleFileStart(peer, msg) {
    if (typeof msg.id !== "string" || !TRANSFER_ID_PATTERN.test(msg.id)) {
      sendError(peer.ws, "invalid-transfer-id", "Transfer ids are 8-64 URL-safe characters.");
      return;
    }
    if (peer.outgoing.has(msg.id)) {
      sendError(peer.ws, "duplicate-transfer", "That transfer id is already active.", msg.id);
      return;
    }
    if (peer.outgoing.size >= MAX_OUTGOING_TRANSFERS) {
      sendError(
        peer.ws,
        "too-many-transfers",
        `You can have at most ${MAX_OUTGOING_TRANSFERS} outgoing transfers at once.`,
        msg.id
      );
      return;
    }

    const name = cleanFileName(msg.name);
    if (!name) {
      sendError(peer.ws, "invalid-file-name", "Provide a file name between 1 and 255 characters.", msg.id);
      return;
    }

    const size = msg.size;
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) {
      sendError(peer.ws, "invalid-file-size", "Size must be a whole number of bytes.", msg.id);
      return;
    }
    if (size > MAX_FILE_BYTES) {
      sendError(
        peer.ws,
        "file-too-large",
        `Files are limited to ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB.`,
        msg.id
      );
      return;
    }

    const stream = allocateStream();
    const transfer = {
      id: msg.id,
      stream,
      name,
      size,
      mime: cleanMime(msg.mime),
      sender: peer,
      targets: new Set([...peers.keys()].filter((id) => id !== peer.id)),
      bytes: 0,
      lastActivity: Date.now(),
      closed: false,
      paused: false
    };

    transfersByStream.set(stream, transfer);
    peer.outgoing.set(transfer.id, transfer);

    broadcastToOthers(peer, {
      type: "file-start",
      id: transfer.id,
      stream,
      from: peer.id,
      fromName: peer.name,
      name: transfer.name,
      size: transfer.size,
      mime: transfer.mime
    });

    sendJson(peer.ws, {
      type: "file-accepted",
      id: transfer.id,
      stream,
      recipients: transfer.targets.size
    });
    log(`${peer.name} is sending "${transfer.name}" (${transfer.size} bytes)`);
  }

  function handleFileEnd(peer, msg) {
    if (typeof msg.id !== "string") {
      sendError(peer.ws, "invalid-transfer-id", "Missing transfer id.");
      return;
    }
    const transfer = peer.outgoing.get(msg.id);
    if (!transfer) {
      sendError(peer.ws, "unknown-transfer", "Unknown or already finished transfer.", msg.id);
      return;
    }
    if (transfer.bytes !== transfer.size) {
      cancelTransfer(transfer, "size-mismatch");
      return;
    }

    const payload = { type: "file-end", id: transfer.id, stream: transfer.stream };
    for (const targetId of transfer.targets) {
      const target = peers.get(targetId);
      if (target) sendJson(target.ws, payload);
    }
    finishTransfer(transfer);
  }

  function handleFileCancel(peer, msg) {
    if (typeof msg.id !== "string") return;
    const transfer = peer.outgoing.get(msg.id);
    // Cancelling an unknown or already finished transfer is harmless: ignore it.
    if (!transfer) return;
    cancelTransfer(transfer, "cancelled-by-sender", false);
  }

  function handleBinaryFrame(peer, data) {
    if (data.length < 4) {
      noteViolation(peer, "Binary frames need a 4-byte stream header.");
      return;
    }
    const stream = data.readUInt32BE(0);
    const transfer = transfersByStream.get(stream);
    if (!transfer || transfer.sender !== peer) {
      noteViolation(peer, "Unknown transfer stream.");
      return;
    }

    const payloadBytes = data.length - 4;
    if (payloadBytes === 0) return;
    if (transfer.bytes + payloadBytes > transfer.size) {
      cancelTransfer(transfer, "size-mismatch");
      return;
    }

    transfer.bytes += payloadBytes;
    transfer.lastActivity = Date.now();

    // Relay the frame byte-for-byte (the receiver strips the stream header).
    let congested = false;
    for (const targetId of transfer.targets) {
      const target = peers.get(targetId);
      if (target && target.ws.readyState === WebSocket.OPEN) {
        try {
          target.ws.send(data, { binary: true });
          if (target.ws.bufferedAmount > RELAY_HIGH_WATER) congested = true;
        } catch {
          transfer.targets.delete(targetId);
        }
      } else if (!target) {
        transfer.targets.delete(targetId);
      }
    }
    if (congested) pauseSender(transfer);
  }

  function noteViolation(peer, reason) {
    peer.violations = (peer.violations ?? 0) + 1;
    if (peer.violations >= MAX_PROTOCOL_VIOLATIONS) {
      closeWithError(peer.ws, "protocol-violation", "Too many invalid frames.");
      return;
    }
    log(`ignored invalid frame from ${peer.name}: ${reason}`);
  }

  function handleJson(peer, raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString("utf8"));
    } catch {
      closeWithError(peer.ws, "invalid-json", "Messages must be valid JSON.");
      return;
    }
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      closeWithError(peer.ws, "invalid-message", "Messages must be JSON objects.");
      return;
    }

    switch (msg.type) {
      case "hello":
        handleHello(peer.ws, msg);
        break;
      case "rename":
        handleRename(peer, msg);
        break;
      case "text":
        handleText(peer, msg);
        break;
      case "file-start":
        handleFileStart(peer, msg);
        break;
      case "file-end":
        handleFileEnd(peer, msg);
        break;
      case "file-cancel":
        handleFileCancel(peer, msg);
        break;
      default:
        closeWithError(peer.ws, "unknown-type", `Unknown message type: ${String(msg.type).slice(0, 40)}`);
    }
  }

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.peer = null;
    ws.violations = 0;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data, isBinary) => {
      try {
        if (!ws.peer) {
          if (isBinary) {
            closeWithError(ws, "hello-required", "Send hello before binary frames.");
            return;
          }
          if (data.length > MAX_JSON_BYTES) {
            closeWithError(ws, "message-too-large", "Messages are limited to 64 KB.");
            return;
          }
          let msg;
          try {
            msg = JSON.parse(data.toString("utf8"));
          } catch {
            closeWithError(ws, "invalid-json", "Messages must be valid JSON.");
            return;
          }
          if (!msg || typeof msg !== "object" || Array.isArray(msg) || msg.type !== "hello") {
            closeWithError(ws, "hello-required", "Send hello first.");
            return;
          }
          handleHello(ws, msg);
          return;
        }

        if (isBinary) {
          handleBinaryFrame(ws.peer, data);
          return;
        }

        if (data.length > MAX_JSON_BYTES) {
          closeWithError(ws, "message-too-large", "Messages are limited to 64 KB.");
          return;
        }
        handleJson(ws.peer, data);
      } catch (error) {
        console.error("[airshare] message handler failed:", error?.message ?? error);
        sendError(ws, "internal-error", "The server could not process that message.");
        try {
          ws.close(1011, "internal error");
        } catch {
          ws.terminate();
        }
      }
    });

    ws.on("error", (error) => {
      log(`socket error: ${error?.message ?? error}`);
    });

    ws.on("close", () => {
      if (ws.peer) removePeer(ws.peer);
      ws.peer = null;
    });
  });

  wss.on("error", (error) => {
    console.error("[airshare] websocket server error:", error?.message ?? error);
  });

  // Drop sockets that stop answering pings (phones going out of range, etc.).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        ws.terminate();
      }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  // Cancel transfers whose senders vanished mid-stream.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const transfer of [...transfersByStream.values()]) {
      if (now - transfer.lastActivity > TRANSFER_IDLE_MS) {
        cancelTransfer(transfer, "idle-timeout");
      }
    }
  }, SWEEP_MS);
  sweeper.unref();

  async function listen(port = DEFAULT_PORT, host = "0.0.0.0") {
    const listenPort = parsePort(port);
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        httpServer.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        httpServer.off("error", onError);
        resolve();
      };
      httpServer.once("error", onError);
      httpServer.once("listening", onListening);
      httpServer.listen(listenPort, host);
    });
    const address = httpServer.address();
    return { port: typeof address === "object" && address ? address.port : listenPort, host };
  }

  async function close() {
    if (stopping) return;
    stopping = true;
    clearInterval(heartbeat);
    clearInterval(sweeper);
    if (relayMonitor) {
      clearInterval(relayMonitor);
      relayMonitor = null;
    }

    for (const transfer of [...transfersByStream.values()]) {
      cancelTransfer(transfer, "server-stopping", false);
    }
    for (const ws of wss.clients) {
      try {
        ws.close(1001, "server shutting down");
      } catch {
        ws.terminate();
      }
    }
    // Give graceful closes a brief moment, then force the sockets shut.
    const forceTimer = setTimeout(() => {
      for (const ws of wss.clients) ws.terminate();
    }, 100);
    forceTimer.unref();

    await new Promise((resolve) => {
      wss.close(() => resolve());
    });
    await new Promise((resolve) => {
      if (!httpServer.listening) {
        resolve();
        return;
      }
      httpServer.close(() => resolve());
      httpServer.closeAllConnections?.();
    });
    clearTimeout(forceTimer);
  }

  return { httpServer, wss, listen, close, get peers() { return peers; } };
}

/** Create and start an AirShare server. */
export async function startServer(options = {}) {
  const app = createServer(options);
  const { port = process.env.PORT, host = "0.0.0.0" } = options;
  try {
    const bound = await app.listen(port, host);
    app.port = bound.port;
    app.host = bound.host;
    app.url = `http://localhost:${bound.port}`;
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

async function localhostServesAirShare(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      signal: controller.signal,
      headers: { connection: "close" }
    });
    await response.body?.cancel();
    return response.headers.get("x-airshare-server") === "1";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function printStartupBanner(port) {
  const addresses = getLanAddresses();
  const localWorks = await localhostServesAirShare(port);
  const lines = [
    "",
    "AirShare is running (LAN only, nothing leaves your Wi-Fi).",
    `  Local:    http://localhost:${port}`,
    ...addresses.map((address) => `  Network:  http://${address}:${port}`)
  ];
  if (addresses.length === 0) {
    lines.push("  Network:  no LAN IPv4 address found - connect this computer to Wi-Fi.");
  }
  if (!localWorks) {
    lines.push(
      `  Warning:  http://localhost:${port} is answered by another program on this PC.`,
      "            Use a Network URL above, or start AirShare with a different PORT."
    );
  }
  lines.push("", "Open a Network URL on any phone or laptop on the same Wi-Fi.", "");
  console.log(lines.join("\n"));
}

const isMain =
  typeof process.argv[1] === "string" &&
  pathToFileURL(path.resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase();

if (isMain) {
  startServer()
    .then(async (app) => {
      await printStartupBanner(app.port);
      const shutdown = async () => {
        console.log("\nShutting down AirShare...");
        await app.close();
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    })
    .catch((error) => {
      console.error(`[airshare] failed to start: ${error?.message ?? error}`);
      process.exit(1);
    });
}
