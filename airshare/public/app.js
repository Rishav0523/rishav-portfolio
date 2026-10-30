/**
 * AirShare client.
 *
 * Everything runs in the browser with native APIs: a WebSocket for signalling
 * and binary frames for file data. No frameworks, no build step, no CDN.
 *
 * Wire format for file chunks: [4-byte big-endian stream id][raw bytes].
 * The stream id is assigned by the server in `file-accepted` / `file-start`.
 */

const MAX_FILE_BYTES = 500 * 1024 * 1024;
const CHUNK_SIZE = 64 * 1024;
const STREAM_HEADER_BYTES = 4;
const BUFFER_HIGH_WATER = 4 * 1024 * 1024;
const MAX_OUTGOING = 2;
const NAME_STORAGE_KEY = "airshare.deviceName";
const RECONNECT_BASE_MS = 800;
const RECONNECT_MAX_MS = 10_000;
const ACCEPT_TIMEOUT_MS = 15_000;

const els = {
  status: document.getElementById("status"),
  statusText: document.getElementById("statusText"),
  nameInput: document.getElementById("nameInput"),
  saveName: document.getElementById("saveName"),
  peerList: document.getElementById("peerList"),
  peerCount: document.getElementById("peerCount"),
  noPeers: document.getElementById("noPeers"),
  shareUrl: document.getElementById("shareUrl"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("fileInput"),
  outgoing: document.getElementById("outgoing"),
  incoming: document.getElementById("incoming"),
  noIncoming: document.getElementById("noIncoming"),
  messages: document.getElementById("messages"),
  noMessages: document.getElementById("noMessages"),
  clearMessages: document.getElementById("clearMessages"),
  textForm: document.getElementById("textForm"),
  textInput: document.getElementById("textInput"),
  toasts: document.getElementById("toasts")
};

const state = {
  ws: null,
  connected: false,
  selfId: null,
  name: readStoredName(),
  peers: new Map(),
  outgoing: new Map(),
  inbound: new Map(),
  inboundById: new Map(),
  queue: [],
  reconnectTimer: null,
  reconnectAttempt: 0,
  warnedUnreachable: false,
  handshakeTimer: null,
  messageCount: 0,
  dragDepth: 0
};

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${units[unit]}`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp || Date.now());
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sanitizeText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeFileName(value) {
  if (typeof value !== "string") return "file";
  const base = value.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = sanitizeText(base, 255);
  return cleaned || "file";
}

function defaultDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Android phone" : "Android tablet";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/CrOS/i.test(ua)) return "Chromebook";
  if (/Linux/i.test(ua)) return "Linux device";
  return "My device";
}

function readStoredName() {
  try {
    const stored = localStorage.getItem(NAME_STORAGE_KEY);
    const cleaned = sanitizeText(stored ?? "", 40);
    if (cleaned) return cleaned;
  } catch {
    // localStorage can be unavailable in private browsing; use a default.
  }
  return defaultDeviceName();
}

function storeName(name) {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {
    // Non-fatal: the name still applies to this session.
  }
}

function peerCount() {
  return [...state.peers.values()].filter((peer) => peer.id !== state.selfId).length;
}

function toast(message, kind = "info", timeout = 4500) {
  const node = document.createElement("div");
  node.className = `toast${kind === "error" ? " toast--error" : kind === "success" ? " toast--success" : ""}`;
  node.textContent = message;
  els.toasts.append(node);
  setTimeout(() => node.remove(), timeout);
}

/* ------------------------------------------------------------------ */
/* Connection                                                         */
/* ------------------------------------------------------------------ */

function setStatus(status, label) {
  const labels = {
    online: "Connected",
    offline: "Disconnected",
    connecting: "Connecting…"
  };
  els.status.className = `status status--${status}`;
  els.statusText.textContent = label ?? labels[status] ?? status;
  state.connected = status === "online";
  updateDropzoneState();
}

function updateDropzoneState() {
  const ready = state.connected && peerCount() > 0;
  els.dropzone.classList.toggle("is-disabled", !ready);
  els.dropzone.setAttribute("aria-disabled", ready ? "false" : "true");
}

function websocketUrl() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws`;
}

function connect() {
  clearTimeout(state.reconnectTimer);
  state.reconnectTimer = null;

  let ws;
  try {
    ws = new WebSocket(websocketUrl());
  } catch {
    scheduleReconnect();
    return;
  }
  state.ws = ws;
  ws.binaryType = "arraybuffer";

  setStatus("connecting");

  ws.addEventListener("open", () => {
    sendJson({ type: "hello", name: state.name });
    clearTimeout(state.handshakeTimer);
    state.handshakeTimer = setTimeout(() => {
      if (!state.connected) {
        toast("The AirShare server did not answer. Check the terminal window.", "error");
        ws.close();
      }
    }, 8000);
  });

  ws.addEventListener("message", (event) => {
    try {
      if (typeof event.data === "string") {
        handleServerMessage(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        handleBinaryFrame(new Uint8Array(event.data));
      }
    } catch (error) {
      console.error("AirShare: failed to handle message", error);
    }
  });

  ws.addEventListener("close", () => {
    if (state.ws !== ws) return;
    clearTimeout(state.handshakeTimer);
    state.ws = null;
    handleDisconnect();
  });

  ws.addEventListener("error", () => {
    // The close event that follows handles state cleanup and retries.
  });
}

function handleDisconnect() {
  const wasConnected = state.connected;
  state.selfId = null;
  state.peers.clear();
  renderPeers();
  setStatus("offline");

  for (const entry of state.outgoing.values()) {
    if (entry.status === "waiting" || entry.status === "sending") {
      entry.reject?.(new Error("Connection lost. Reconnecting…"));
      failOutgoing(entry, "Connection lost. Reconnecting…");
    } else if (entry.status === "queued") {
      entry.status = "queued";
      updateFileItem(entry);
    }
  }

  for (const entry of state.inbound.values()) {
    cancelInbound(entry, "Connection lost before the file finished.");
  }
  state.inbound.clear();
  state.inboundById.clear();

  if (wasConnected) toast("Connection lost. Trying to reconnect…", "error");
  scheduleReconnect();
}

function scheduleReconnect() {
  clearTimeout(state.reconnectTimer);
  const attempt = state.reconnectAttempt++;
  const base = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
  const jitter = Math.round(Math.random() * 250);
  setStatus("connecting", attempt === 0 ? "Connecting…" : "Reconnecting…");
  if (attempt >= 2 && !state.warnedUnreachable) {
    state.warnedUnreachable = true;
    toast("Cannot reach the AirShare server. Is it still running on this network?", "error", 7000);
  }
  state.reconnectTimer = setTimeout(connect, base + jitter);
}

function sendJson(message) {
  const ws = state.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Server messages                                                    */
/* ------------------------------------------------------------------ */

function handleServerMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  if (!msg || typeof msg !== "object") return;

  switch (msg.type) {
    case "welcome": {
      if (typeof msg.id !== "string") return;
      state.selfId = msg.id;
      state.reconnectAttempt = 0;
      state.warnedUnreachable = false;
      clearTimeout(state.handshakeTimer);
      if (Array.isArray(msg.peers)) {
        state.peers = new Map(
          msg.peers
            .filter((peer) => peer && typeof peer.id === "string" && typeof peer.name === "string")
            .map((peer) => [peer.id, { id: peer.id, name: sanitizeText(peer.name, 40) || "Device" }])
        );
      }
      setStatus("online");
      renderPeers();
      pumpQueue();
      break;
    }

    case "peers": {
      if (!Array.isArray(msg.peers)) return;
      state.peers = new Map(
        msg.peers
          .filter((peer) => peer && typeof peer.id === "string" && typeof peer.name === "string")
          .map((peer) => [peer.id, { id: peer.id, name: sanitizeText(peer.name, 40) || "Device" }])
      );
      renderPeers();
      pumpQueue();
      break;
    }

    case "peer-joined": {
      if (!msg.peer || typeof msg.peer.id !== "string") return;
      const name = sanitizeText(msg.peer.name, 40) || "A device";
      state.peers.set(msg.peer.id, { id: msg.peer.id, name });
      renderPeers();
      if (msg.peer.id !== state.selfId) toast(`${name} joined`, "info", 2500);
      pumpQueue();
      break;
    }

    case "peer-left": {
      if (typeof msg.id !== "string") return;
      const name = state.peers.get(msg.id)?.name;
      state.peers.delete(msg.id);
      renderPeers();
      if (name) toast(`${name} left`, "info", 2500);
      break;
    }

    case "peer-renamed": {
      if (typeof msg.id !== "string" || typeof msg.name !== "string") return;
      const existing = state.peers.get(msg.id);
      if (existing) {
        existing.name = sanitizeText(msg.name, 40) || existing.name;
        renderPeers();
      }
      break;
    }

    case "renamed": {
      const name = sanitizeText(msg.name, 40);
      if (name) {
        state.name = name;
        storeName(name);
        els.nameInput.value = name;
        els.saveName.hidden = true;
      }
      break;
    }

    case "text": {
      appendMessage(msg);
      break;
    }

    case "file-start": {
      beginInbound(msg);
      break;
    }

    case "file-accepted": {
      const entry = state.outgoing.get(msg.id);
      if (entry && typeof msg.stream === "number" && Number.isInteger(msg.stream)) {
        if (entry.accept) entry.accept(msg.stream, msg.recipients);
      }
      break;
    }

    case "file-end": {
      finishInbound(msg);
      break;
    }

    case "file-cancel": {
      handleFileCancel(msg);
      break;
    }

    case "error": {
      handleServerError(msg);
      break;
    }

    default:
      // Forward-compatible: ignore message types this client does not know.
      break;
  }
}

function handleServerError(msg) {
  const message = typeof msg.message === "string" ? msg.message : "The server rejected that request.";
  if (msg.id && state.outgoing.has(msg.id)) {
    const entry = state.outgoing.get(msg.id);
    if (entry.status === "sent" || entry.status === "failed") {
      toast(message, "error");
      return;
    }
    if (entry.reject) {
      entry.reject(new Error(message));
    } else {
      failOutgoing(entry, message);
    }
    return;
  }
  if (msg.id && state.inboundById.has(msg.id)) {
    const entry = state.inboundById.get(msg.id);
    cancelInbound(entry, message);
    return;
  }
  toast(message, "error");
}

/* ------------------------------------------------------------------ */
/* Peer list                                                          */
/* ------------------------------------------------------------------ */

function renderPeers() {
  const others = [...state.peers.values()].filter((peer) => peer.id !== state.selfId);
  els.peerCount.textContent = String(others.length);
  els.peerList.replaceChildren();

  for (const peer of others) {
    const item = document.createElement("li");
    item.className = "peer";

    const avatar = document.createElement("span");
    avatar.className = "peer-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (peer.name || "?").slice(0, 1).toUpperCase();

    const name = document.createElement("span");
    name.className = "peer-name";
    name.textContent = peer.name;

    const note = document.createElement("span");
    note.className = "peer-note";
    note.textContent = "online";

    item.append(avatar, name, note);
    els.peerList.append(item);
  }

  els.noPeers.hidden = others.length > 0;
  updateDropzoneState();
}

/* ------------------------------------------------------------------ */
/* Text messages                                                      */
/* ------------------------------------------------------------------ */

function appendMessage(msg) {
  const text = sanitizeText(msg.text, 4000);
  if (!text) return;
  const isSelf = msg.from === state.selfId;
  const name = isSelf ? state.name : sanitizeText(msg.fromName, 40) || "Device";

  const item = document.createElement("li");
  item.className = `msg${isSelf ? " msg--self" : ""}`;

  const head = document.createElement("div");
  head.className = "msg-head";

  const nameNode = document.createElement("span");
  nameNode.className = "msg-name";
  nameNode.textContent = name;

  const time = document.createElement("span");
  time.className = "msg-time";
  time.textContent = formatTime(msg.at);

  const body = document.createElement("p");
  body.className = "msg-text";
  body.textContent = text;

  head.append(nameNode, time);
  item.append(head, body);
  els.messages.append(item);

  state.messageCount += 1;
  while (els.messages.children.length > 200) {
    els.messages.firstElementChild?.remove();
  }
  els.noMessages.hidden = true;
  els.clearMessages.hidden = false;
  els.messages.scrollTop = els.messages.scrollHeight;
}

function sendText(event) {
  event.preventDefault();
  if (!state.connected) {
    toast("Not connected to the AirShare server.", "error");
    return;
  }
  if (peerCount() === 0) {
    toast("No other devices online to message.", "error");
    return;
  }
  const text = els.textInput.value.trim();
  if (!text) return;
  if (text.length > 4000) {
    toast("Messages are limited to 4000 characters.", "error");
    return;
  }
  if (!sendJson({ type: "text", text })) {
    toast("Could not send the message. Reconnecting…", "error");
    return;
  }
  els.textInput.value = "";
  els.textInput.focus();
}

/* ------------------------------------------------------------------ */
/* Outgoing files                                                     */
/* ------------------------------------------------------------------ */

function queueFiles(fileList) {
  const files = [...fileList];
  if (files.length === 0) return;
  if (!state.connected) {
    toast("Not connected. Open this page from the AirShare server first.", "error");
    return;
  }
  if (peerCount() === 0) {
    toast("No other devices online. Open the Network URL on another device.", "error");
    return;
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      toast(`"${file.name}" is larger than the 500 MB limit.`, "error", 6000);
      continue;
    }
    createOutgoing(file);
  }
  pumpQueue();
}

function createOutgoing(file) {
  const entry = {
    kind: "out",
    id: randomId(),
    name: sanitizeFileName(file.name),
    size: file.size,
    mime: file.type || "application/octet-stream",
    file,
    stream: null,
    sent: 0,
    status: "queued",
    error: null,
    cancelled: false,
    accept: null,
    reject: null,
    dom: null
  };
  state.outgoing.set(entry.id, entry);
  state.queue.push(entry);
  buildFileItem(entry);
  updateFileItem(entry);
}

function activeOutgoingCount() {
  let count = 0;
  for (const entry of state.outgoing.values()) {
    if (entry.status === "waiting" || entry.status === "sending") count += 1;
  }
  return count;
}

function pumpQueue() {
  if (!state.connected || peerCount() === 0) return;

  while (state.queue.length > 0) {
    const next = state.queue[0];
    if (next.status !== "queued") {
      state.queue.shift();
      continue;
    }
    if (activeOutgoingCount() >= MAX_OUTGOING) break;
    state.queue.shift();
    void startTransfer(next);
  }
}

async function startTransfer(entry) {
  entry.status = "waiting";
  updateFileItem(entry);

  const ws = state.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    failOutgoing(entry, "Not connected. Reconnecting…");
    pumpQueue();
    return;
  }
  if (peerCount() === 0) {
    entry.status = "queued";
    state.queue.unshift(entry);
    updateFileItem(entry);
    return;
  }

  const accepted = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      entry.accept = null;
      entry.reject = null;
      reject(new Error("The server did not acknowledge the transfer."));
    }, ACCEPT_TIMEOUT_MS);

    entry.accept = (stream) => {
      clearTimeout(timer);
      entry.accept = null;
      entry.reject = null;
      resolve(stream);
    };
    entry.reject = (error) => {
      clearTimeout(timer);
      entry.accept = null;
      entry.reject = null;
      reject(error);
    };
  });

  const sent = sendJson({
    type: "file-start",
    id: entry.id,
    name: entry.name,
    size: entry.size,
    mime: entry.mime
  });
  if (!sent) {
    failOutgoing(entry, "Not connected. Reconnecting…");
    pumpQueue();
    return;
  }

  try {
    entry.stream = await accepted;
    entry.status = "sending";
    updateFileItem(entry);

    while (entry.sent < entry.size) {
      if (entry.cancelled || entry.status === "failed") throw new Error("aborted");
      const socket = state.ws;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("Connection lost. Reconnecting…");
      }
      await waitForBuffer(socket, entry);
      if (entry.cancelled || entry.status === "failed") throw new Error("aborted");

      const start = entry.sent;
      const end = Math.min(start + CHUNK_SIZE, entry.size);
      const chunk = await entry.file.slice(start, end).arrayBuffer();
      if (entry.cancelled || entry.status === "failed") throw new Error("aborted");

      const frame = new Uint8Array(STREAM_HEADER_BYTES + chunk.byteLength);
      new DataView(frame.buffer).setUint32(0, entry.stream);
      frame.set(new Uint8Array(chunk), STREAM_HEADER_BYTES);
      socket.send(frame);

      entry.sent = end;
      scheduleFileUpdate(entry);
    }

    if (entry.cancelled || entry.status === "failed") throw new Error("aborted");
    const socket = state.ws;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Connection lost before the transfer finished.");
    }
    sendJson({ type: "file-end", id: entry.id });

    entry.status = "sent";
    entry.sent = entry.size;
    entry.file = null;
    updateFileItem(entry);
  } catch (error) {
    if (entry.cancelled) {
      entry.status = "cancelled";
      entry.error = "Cancelled";
      entry.file = null;
      updateFileItem(entry);
      sendJson({ type: "file-cancel", id: entry.id });
    } else if (entry.status !== "failed") {
      failOutgoing(entry, error?.message || "Transfer failed.");
    }
  } finally {
    entry.accept = null;
    entry.reject = null;
    pumpQueue();
  }
}

async function waitForBuffer(socket, entry) {
  while (socket.bufferedAmount > BUFFER_HIGH_WATER) {
    await delay(25);
    if (entry.cancelled || entry.status === "failed") throw new Error("aborted");
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error("Connection lost. Reconnecting…");
    }
  }
}

function failOutgoing(entry, message) {
  if (entry.status === "failed" || entry.status === "sent" || entry.status === "cancelled") return;
  const wasSending = entry.status === "sending";
  entry.status = "failed";
  entry.error = message;
  entry.file = null;
  if (wasSending && entry.stream !== null) {
    sendJson({ type: "file-cancel", id: entry.id });
  }
  updateFileItem(entry);
}

function cancelOutgoing(entry) {
  if (entry.status === "sent" || entry.status === "failed" || entry.status === "cancelled") return;
  entry.cancelled = true;
  entry.reject?.(new Error("cancelled"));
  if (entry.status === "queued") {
    entry.status = "cancelled";
    entry.error = "Cancelled";
    entry.file = null;
    state.queue = state.queue.filter((queued) => queued !== entry);
    updateFileItem(entry);
    return;
  }
  entry.status = "cancelled";
  entry.error = "Cancelled";
  entry.file = null;
  sendJson({ type: "file-cancel", id: entry.id });
  updateFileItem(entry);
  setTimeout(pumpQueue, 0);
}

/* ------------------------------------------------------------------ */
/* Incoming files                                                     */
/* ------------------------------------------------------------------ */

function beginInbound(msg) {
  if (
    typeof msg.id !== "string" ||
    typeof msg.stream !== "number" ||
    !Number.isInteger(msg.stream) ||
    typeof msg.size !== "number" ||
    !Number.isSafeInteger(msg.size) ||
    msg.size < 0 ||
    msg.size > MAX_FILE_BYTES
  ) {
    return;
  }
  if (state.inbound.has(msg.stream) || state.inboundById.has(msg.id)) return;

  const sender = state.peers.get(msg.from);
  const entry = {
    kind: "in",
    id: msg.id,
    stream: msg.stream,
    from: typeof msg.from === "string" ? msg.from : "",
    fromName: sanitizeText(msg.fromName, 40) || sender?.name || "Device",
    name: sanitizeFileName(msg.name),
    size: msg.size,
    mime: typeof msg.mime === "string" && msg.mime.length <= 120 ? msg.mime : "application/octet-stream",
    received: 0,
    chunks: [],
    status: "receiving",
    error: null,
    url: null,
    dom: null
  };

  state.inbound.set(entry.stream, entry);
  state.inboundById.set(entry.id, entry);
  buildFileItem(entry);
  updateFileItem(entry);
  els.noIncoming.hidden = true;
}

function handleBinaryFrame(frame) {
  if (frame.byteLength <= STREAM_HEADER_BYTES) return;
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const stream = view.getUint32(0);
  const entry = state.inbound.get(stream);
  if (!entry || entry.status !== "receiving") return;

  const payload = frame.subarray(STREAM_HEADER_BYTES);
  if (entry.received + payload.byteLength > entry.size) {
    cancelInbound(entry, "Received more data than expected.");
    return;
  }

  entry.chunks.push(payload.slice());
  entry.received += payload.byteLength;
  scheduleFileUpdate(entry);
}

function finishInbound(msg) {
  const entry = state.inboundById.get(msg.id);
  if (!entry || entry.status !== "receiving") return;

  if (entry.received !== entry.size) {
    cancelInbound(entry, `Transfer incomplete (${formatBytes(entry.received)} of ${formatBytes(entry.size)}).`);
    return;
  }

  const blob = new Blob(entry.chunks, { type: entry.mime });
  entry.chunks = [];
  entry.url = URL.createObjectURL(blob);
  entry.status = "done";
  state.inbound.delete(entry.stream);
  state.inboundById.delete(entry.id);
  updateFileItem(entry);
  toast(`Received "${entry.name}"`, "success");
}

function cancelInbound(entry, reason) {
  entry.status = "cancelled";
  entry.error = reason || "Transfer cancelled.";
  entry.chunks = [];
  state.inbound.delete(entry.stream);
  state.inboundById.delete(entry.id);
  updateFileItem(entry);
}

function handleFileCancel(msg) {
  if (msg.id && state.inboundById.has(msg.id)) {
    const reasons = {
      "sender-disconnected": "The sender disconnected.",
      "cancelled-by-sender": "The sender cancelled the transfer.",
      "idle-timeout": "The transfer timed out.",
      "size-mismatch": "The transfer size did not match."
    };
    const entry = state.inboundById.get(msg.id);
    cancelInbound(entry, reasons[msg.reason] || "Transfer cancelled.");
    return;
  }
  if (msg.id && state.outgoing.has(msg.id)) {
    const entry = state.outgoing.get(msg.id);
    if (entry.status !== "sent" && entry.status !== "failed" && entry.status !== "cancelled") {
      failOutgoing(entry, "The server cancelled this transfer.");
    }
  }
}

/* ------------------------------------------------------------------ */
/* File item UI                                                       */
/* ------------------------------------------------------------------ */

function buildFileItem(entry) {
  const item = document.createElement("li");
  item.className = "file-item";

  const top = document.createElement("div");
  top.className = "file-top";

  const icon = document.createElement("span");
  icon.className = "file-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    entry.kind === "out"
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>';

  const meta = document.createElement("div");
  meta.className = "file-meta";

  const name = document.createElement("span");
  name.className = "file-name";
  name.textContent = entry.name;

  const sub = document.createElement("span");
  sub.className = "file-sub";

  const action = document.createElement("div");
  action.className = "file-action";

  const progress = document.createElement("div");
  progress.className = "progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  progress.setAttribute("aria-valuenow", "0");
  progress.setAttribute("aria-label", `${entry.name} transfer progress`);

  const fill = document.createElement("div");
  fill.className = "progress-fill";
  progress.append(fill);

  const pct = document.createElement("div");
  pct.className = "file-pct";
  const pctLabel = document.createElement("span");
  const pctBytes = document.createElement("span");
  pct.append(pctLabel, pctBytes);

  meta.append(name, sub);
  top.append(icon, meta, action);
  item.append(top, progress, pct);

  entry.dom = { item, sub, action, progress, fill, pctLabel, pctBytes };
  if (entry.kind === "in") {
    els.incoming.append(item);
    els.noIncoming.hidden = true;
  } else {
    els.outgoing.append(item);
  }
}

function scheduleFileUpdate(entry) {
  if (entry.uiQueued) return;
  entry.uiQueued = true;
  requestAnimationFrame(() => {
    entry.uiQueued = false;
    updateFileItem(entry);
  });
}

function updateFileItem(entry) {
  const dom = entry.dom;
  if (!dom) return;

  const isOut = entry.kind === "out";
  const total = entry.size || 0;
  const done = isOut ? entry.sent : entry.received;
  const fraction = total === 0 ? (entry.status === "sent" || entry.status === "done" ? 1 : 0) : Math.min(1, done / total);
  const percent = Math.round(fraction * 100);

  dom.fill.style.setProperty("--p", String(fraction));
  dom.progress.setAttribute("aria-valuenow", String(percent));
  dom.progress.classList.toggle("progress--done", entry.status === "sent" || entry.status === "done");
  dom.progress.classList.toggle("progress--error", entry.status === "failed" || entry.status === "cancelled");

  const bytesLine = total > 0 ? `${formatBytes(done)} of ${formatBytes(total)}` : formatBytes(total);
  dom.pctBytes.textContent = entry.status === "failed" || entry.status === "cancelled" ? "" : bytesLine;
  dom.pctLabel.textContent =
    entry.status === "failed" || entry.status === "cancelled" ? "" : `${percent}%`;

  dom.sub.classList.remove("is-error", "is-done");

  if (isOut) {
    dom.action.replaceChildren();
    switch (entry.status) {
      case "queued":
        dom.sub.textContent = "Queued";
        dom.pctLabel.textContent = "Waiting";
        break;
      case "waiting":
        dom.sub.textContent = "Waiting for the server…";
        break;
      case "sending":
        dom.sub.textContent = `Sending to ${peerCount()} device${peerCount() === 1 ? "" : "s"}`;
        dom.action.append(cancelButton(entry));
        break;
      case "sent":
        dom.sub.textContent = "Sent";
        dom.sub.classList.add("is-done");
        dom.pctLabel.textContent = "100%";
        dom.pctBytes.textContent = formatBytes(entry.size);
        break;
      case "failed":
        dom.sub.textContent = entry.error || "Transfer failed.";
        dom.sub.classList.add("is-error");
        dom.pctBytes.textContent = "";
        break;
      case "cancelled":
        dom.sub.textContent = "Cancelled";
        dom.sub.classList.add("is-error");
        dom.pctBytes.textContent = "";
        break;
      default:
        break;
    }
  } else {
    dom.action.replaceChildren();
    switch (entry.status) {
      case "receiving":
        dom.sub.textContent = `Receiving from ${entry.fromName}`;
        break;
      case "done":
        dom.sub.textContent = `From ${entry.fromName} · ${formatBytes(entry.size)}`;
        dom.sub.classList.add("is-done");
        dom.pctLabel.textContent = "100%";
        dom.pctBytes.textContent = formatBytes(entry.size);
        if (entry.url) dom.action.append(downloadButton(entry));
        break;
      case "cancelled":
        dom.sub.textContent = entry.error || "Transfer cancelled.";
        dom.sub.classList.add("is-error");
        dom.pctBytes.textContent = "";
        if (entry.url) dom.action.append(downloadButton(entry));
        break;
      default:
        break;
    }
  }
}

function cancelButton(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn--small btn--danger";
  button.textContent = "Cancel";
  button.addEventListener("click", () => cancelOutgoing(entry));
  return button;
}

function downloadButton(entry) {
  const link = document.createElement("a");
  link.className = "btn btn--small btn--download";
  link.href = entry.url;
  link.download = entry.name;
  link.textContent = "Download";
  return link;
}

/* ------------------------------------------------------------------ */
/* Wiring                                                             */
/* ------------------------------------------------------------------ */

function setupNameField() {
  els.nameInput.value = state.name;
  els.saveName.hidden = true;

  const refreshButton = () => {
    const next = sanitizeText(els.nameInput.value, 40);
    els.saveName.hidden = next === "" || next === state.name;
  };

  els.nameInput.addEventListener("input", refreshButton);
  els.nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveName();
    }
  });
  els.saveName.addEventListener("click", saveName);

  function saveName() {
    const next = sanitizeText(els.nameInput.value, 40);
    if (!next) {
      els.nameInput.value = state.name;
      els.saveName.hidden = true;
      toast("Device name cannot be empty.", "error");
      return;
    }
    state.name = next;
    storeName(next);
    els.nameInput.value = next;
    els.saveName.hidden = true;
    if (state.connected && !sendJson({ type: "rename", name: next })) {
      toast("Name saved. It will apply when the connection returns.", "info");
    }
  }
}

function setupDropzone() {
  const openPicker = () => {
    if (!state.connected) {
      toast("Not connected. Check the AirShare server is running.", "error");
      return;
    }
    if (peerCount() === 0) {
      toast("No other devices online yet.", "error");
      return;
    }
    els.fileInput.click();
  };

  els.dropzone.addEventListener("click", openPicker);
  els.dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  });

  els.fileInput.addEventListener("change", () => {
    if (els.fileInput.files?.length) queueFiles(els.fileInput.files);
    els.fileInput.value = "";
  });

  els.dropzone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    state.dragDepth += 1;
    els.dropzone.classList.add("is-dragging");
  });
  els.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  els.dropzone.addEventListener("dragleave", () => {
    state.dragDepth = Math.max(0, state.dragDepth - 1);
    if (state.dragDepth === 0) els.dropzone.classList.remove("is-dragging");
  });
  els.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    state.dragDepth = 0;
    els.dropzone.classList.remove("is-dragging");
    const files = event.dataTransfer?.files;
    if (files?.length) queueFiles(files);
  });

  for (const type of ["dragover", "drop"]) {
    document.addEventListener(type, (event) => {
      if (type === "drop" && els.dropzone.contains(event.target)) return;
      event.preventDefault();
    });
  }
}

function setupTextForm() {
  els.textForm.addEventListener("submit", sendText);
  els.clearMessages.addEventListener("click", () => {
    els.messages.replaceChildren();
    state.messageCount = 0;
    els.noMessages.hidden = false;
    els.clearMessages.hidden = true;
  });
}

function setupShareUrl() {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
    els.shareUrl.textContent = "the Network URL printed in the server terminal";
  } else {
    els.shareUrl.textContent = location.origin;
  }
}

function init() {
  setupNameField();
  setupDropzone();
  setupTextForm();
  setupShareUrl();
  setStatus("connecting");
  connect();

  window.addEventListener("online", () => {
    if (!state.ws) {
      state.reconnectAttempt = 0;
      connect();
    }
  });
}

init();
