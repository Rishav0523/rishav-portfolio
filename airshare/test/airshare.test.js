import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { MAX_FILE_BYTES, startServer } from "../server.js";

let app;

before(async () => {
  app = await startServer({ port: 0, host: "127.0.0.1", quiet: true });
});

after(async () => {
  await app.close();
});

function wsUrl() {
  return `ws://127.0.0.1:${app.port}/ws`;
}

class TestClient {
  constructor(ws) {
    this.ws = ws;
    this.messages = [];
    this.waiters = new Set();
    this.binaryFrames = [];
    this.binaryListeners = new Set();
    this.id = null;
    this.closed = false;

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        const frame = Buffer.from(data);
        this.binaryFrames.push(frame);
        for (const listener of [...this.binaryListeners]) listener(frame);
        return;
      }
      let msg;
      try {
        msg = JSON.parse(data.toString("utf8"));
      } catch {
        return;
      }
      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(msg)) {
          this.waiters.delete(waiter);
          clearTimeout(waiter.timer);
          waiter.resolve(msg);
          return;
        }
      }
      this.messages.push(msg);
    });

    ws.on("close", () => {
      this.closed = true;
      for (const waiter of [...this.waiters]) {
        this.waiters.delete(waiter);
        clearTimeout(waiter.timer);
        waiter.reject(new Error(`Socket closed while waiting for ${waiter.label}`));
      }
    });

    ws.on("error", () => {
      // Assertions surface connection problems through the close/timeout path.
    });
  }

  static async connect(name) {
    const ws = new WebSocket(wsUrl(), { perMessageDeflate: false });
    const client = new TestClient(ws);
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    client.send({ type: "hello", name });
    const welcome = await client.waitForType("welcome");
    client.id = welcome.id;
    return client;
  }

  send(message) {
    this.ws.send(JSON.stringify(message));
  }

  sendBinaryFrame(stream, payload) {
    const frame = Buffer.alloc(4 + payload.length);
    frame.writeUInt32BE(stream, 0);
    payload.copy(frame, 4);
    this.ws.send(frame);
  }

  waitFor(predicate, label = "message", timeout = 5000) {
    const index = this.messages.findIndex(predicate);
    if (index >= 0) {
      const [message] = this.messages.splice(index, 1);
      return Promise.resolve(message);
    }
    return new Promise((resolve, reject) => {
      const waiter = { predicate, label, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter);
        const queued = this.messages.map((msg) => msg.type).join(", ") || "none";
        reject(new Error(`Timed out waiting for ${label}. Queued message types: ${queued}`));
      }, timeout);
      this.waiters.add(waiter);
    });
  }

  waitForType(type, timeout = 5000) {
    return this.waitFor((msg) => msg.type === type, type, timeout);
  }

  /** Resolve once `size` payload bytes for `stream` have arrived, in order. */
  waitForFileBytes(stream, size, timeout = 10_000) {
    const chunks = [];
    let total = 0;
    let settled = false;

    const take = (frame) => {
      if (frame.length < 4 || frame.readUInt32BE(0) !== stream) return;
      const payload = frame.subarray(4);
      chunks.push(Buffer.from(payload));
      total += payload.length;
    };

    for (const frame of this.binaryFrames) take(frame);
    if (total >= size && size > 0) return Promise.resolve(Buffer.concat(chunks));

    return new Promise((resolve, reject) => {
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.binaryListeners.delete(listener);
        resolve(Buffer.concat(chunks));
      };
      const listener = (frame) => {
        take(frame);
        if (total >= size) finish();
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.binaryListeners.delete(listener);
        reject(new Error(`Timed out receiving file bytes (${total} of ${size})`));
      }, timeout);
      this.binaryListeners.add(listener);
    });
  }

  async close() {
    if (this.closed) return;
    await new Promise((resolve) => {
      this.ws.once("close", resolve);
      try {
        this.ws.close();
      } catch {
        resolve();
      }
      setTimeout(resolve, 1000).unref();
    });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("serves the static client with a 200", async () => {
  const response = await fetch(`http://127.0.0.1:${app.port}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  const html = await response.text();
  assert.match(html, /AirShare/);
  assert.match(html, /\/app\.js/);

  const script = await fetch(`http://127.0.0.1:${app.port}/app.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type") ?? "", /javascript/);

  const missing = await fetch(`http://127.0.0.1:${app.port}/nope.txt`);
  assert.equal(missing.status, 404);
});

test("two clients handshake and see each other", async () => {
  const alpha = await TestClient.connect("Alpha");
  const beta = await TestClient.connect("Beta");
  try {
    assert.ok(alpha.id);
    assert.ok(beta.id);
    assert.notEqual(alpha.id, beta.id);

    const joined = await alpha.waitFor(
      (msg) => msg.type === "peer-joined" && msg.peer.name === "Beta",
      "peer-joined for Beta"
    );
    assert.equal(joined.peer.id, beta.id);

    const list = await alpha.waitFor(
      (msg) => msg.type === "peers" && msg.peers.some((peer) => peer.name === "Beta"),
      "peer list containing Beta"
    );
    assert.deepEqual(
      list.peers.map((peer) => peer.name).sort(),
      ["Alpha", "Beta"]
    );

    const betaList = await beta.waitFor(
      (msg) => msg.type === "peers" && msg.peers.some((peer) => peer.name === "Alpha"),
      "peer list containing Alpha"
    );
    assert.ok(betaList.peers.some((peer) => peer.id === alpha.id));
  } finally {
    await alpha.close();
    await beta.close();
  }
});

test("text messages are broadcast with the sender name", async () => {
  const alpha = await TestClient.connect("Alpha");
  const beta = await TestClient.connect("Beta");
  try {
    await alpha.waitFor(
      (msg) => msg.type === "peers" && msg.peers.some((peer) => peer.id === beta.id),
      "Beta in Alpha's peer list"
    );

    alpha.send({ type: "text", text: "hello from Alpha" });

    const received = await beta.waitFor(
      (msg) => msg.type === "text" && msg.text === "hello from Alpha",
      "text broadcast"
    );
    assert.equal(received.from, alpha.id);
    assert.equal(received.fromName, "Alpha");

    const echoed = await alpha.waitFor(
      (msg) => msg.type === "text" && msg.text === "hello from Alpha",
      "text echo to sender"
    );
    assert.equal(echoed.from, alpha.id);
  } finally {
    await alpha.close();
    await beta.close();
  }
});

test("a 300 KB file reassembles byte-for-byte on the receiver", async () => {
  const sender = await TestClient.connect("Sender");
  const receiver = await TestClient.connect("Receiver");
  try {
    await sender.waitFor(
      (msg) => msg.type === "peers" && msg.peers.some((peer) => peer.id === receiver.id),
      "Receiver in Sender's peer list"
    );

    const size = 300 * 1024;
    const fileBytes = randomBytes(size);
    const transferId = randomUUID();

    sender.send({
      type: "file-start",
      id: transferId,
      name: "payload.bin",
      size,
      mime: "application/octet-stream"
    });

    const start = await receiver.waitFor(
      (msg) => msg.type === "file-start" && msg.id === transferId,
      "file-start broadcast"
    );
    assert.equal(start.name, "payload.bin");
    assert.equal(start.size, size);
    assert.equal(start.from, sender.id);

    const accepted = await sender.waitFor(
      (msg) => msg.type === "file-accepted" && msg.id === transferId,
      "file-accepted"
    );
    assert.equal(accepted.stream, start.stream);
    assert.equal(accepted.recipients, 1);

    const assembled = receiver.waitForFileBytes(start.stream, size);

    const chunkSize = 64 * 1024;
    for (let offset = 0; offset < size; offset += chunkSize) {
      sender.sendBinaryFrame(start.stream, fileBytes.subarray(offset, Math.min(offset + chunkSize, size)));
    }
    sender.send({ type: "file-end", id: transferId });

    const received = await assembled;
    assert.equal(received.length, size);
    assert.ok(received.equals(fileBytes), "received bytes differ from sent bytes");

    const end = await receiver.waitFor(
      (msg) => msg.type === "file-end" && msg.id === transferId,
      "file-end broadcast"
    );
    assert.equal(end.stream, start.stream);
  } finally {
    await sender.close();
    await receiver.close();
  }
});

test("a sender can cancel an in-flight transfer", async () => {
  const sender = await TestClient.connect("Sender");
  const receiver = await TestClient.connect("Receiver");
  try {
    await sender.waitFor(
      (msg) => msg.type === "peers" && msg.peers.some((peer) => peer.id === receiver.id),
      "Receiver in Sender's peer list"
    );

    const transferId = randomUUID();
    sender.send({
      type: "file-start",
      id: transferId,
      name: "partial.bin",
      size: 4096,
      mime: "application/octet-stream"
    });

    const start = await receiver.waitFor(
      (msg) => msg.type === "file-start" && msg.id === transferId,
      "file-start broadcast"
    );
    await sender.waitFor(
      (msg) => msg.type === "file-accepted" && msg.id === transferId,
      "file-accepted"
    );

    sender.sendBinaryFrame(start.stream, Buffer.alloc(1000, 7));
    sender.send({ type: "file-cancel", id: transferId });

    const cancel = await receiver.waitFor(
      (msg) => msg.type === "file-cancel" && msg.id === transferId,
      "file-cancel broadcast"
    );
    assert.equal(cancel.reason, "cancelled-by-sender");
    assert.equal(cancel.stream, start.stream);
  } finally {
    await sender.close();
    await receiver.close();
  }
});

test("a sender disconnect cancels its open transfers", async () => {
  const sender = await TestClient.connect("Sender");
  const receiver = await TestClient.connect("Receiver");
  try {
    await sender.waitFor(
      (msg) => msg.type === "peers" && msg.peers.some((peer) => peer.id === receiver.id),
      "Receiver in Sender's peer list"
    );

    const transferId = randomUUID();
    sender.send({
      type: "file-start",
      id: transferId,
      name: "interrupted.bin",
      size: 8192,
      mime: "application/octet-stream"
    });

    const start = await receiver.waitFor(
      (msg) => msg.type === "file-start" && msg.id === transferId,
      "file-start broadcast"
    );
    await sender.waitFor(
      (msg) => msg.type === "file-accepted" && msg.id === transferId,
      "file-accepted"
    );
    sender.sendBinaryFrame(start.stream, Buffer.alloc(500, 3));

    sender.ws.terminate();

    const cancel = await receiver.waitFor(
      (msg) => msg.type === "file-cancel" && msg.id === transferId,
      "file-cancel after disconnect"
    );
    assert.equal(cancel.reason, "sender-disconnected");

    const left = await receiver.waitFor(
      (msg) => msg.type === "peer-left" && msg.id === sender.id,
      "peer-left after disconnect"
    );
    assert.equal(left.id, sender.id);
  } finally {
    await sender.close();
    await receiver.close();
  }
});

test("oversized file-start is rejected without taking the server down", async () => {
  const client = await TestClient.connect("BigSender");
  try {
    client.send({
      type: "file-start",
      id: randomUUID(),
      name: "huge.bin",
      size: MAX_FILE_BYTES + 1,
      mime: "application/octet-stream"
    });

    const error = await client.waitFor(
      (msg) => msg.type === "error" && msg.code === "file-too-large",
      "file-too-large error"
    );
    assert.match(error.message, /500 MB/);
    assert.equal(client.ws.readyState, WebSocket.OPEN, "server should not close the client");

    const response = await fetch(`http://127.0.0.1:${app.port}/`);
    assert.equal(response.status, 200);
  } finally {
    await client.close();
  }
});

test("unknown transfer ids are ignored without crashing the server", async () => {
  const alpha = await TestClient.connect("Alpha");
  const beta = await TestClient.connect("Beta");
  try {
    await alpha.waitFor(
      (msg) => msg.type === "peers" && msg.peers.some((peer) => peer.id === beta.id),
      "Beta in Alpha's peer list"
    );

    // A binary frame for a stream the server never allocated...
    alpha.sendBinaryFrame(0x7ffffff0, Buffer.from("orphan bytes"));
    // ...and a file-end for a transfer that does not exist.
    alpha.send({ type: "file-end", id: "missing-transfer-id" });

    const error = await alpha.waitFor(
      (msg) => msg.type === "error" && msg.code === "unknown-transfer",
      "unknown-transfer error"
    );
    assert.ok(error);

    // The server must still relay normally afterwards.
    beta.send({ type: "text", text: "still alive" });
    const received = await alpha.waitFor(
      (msg) => msg.type === "text" && msg.text === "still alive",
      "text after invalid frames"
    );
    assert.equal(received.fromName, "Beta");

    await sleep(50);
    assert.equal(alpha.ws.readyState, WebSocket.OPEN);

    const response = await fetch(`http://127.0.0.1:${app.port}/`);
    assert.equal(response.status, 200);
  } finally {
    await alpha.close();
    await beta.close();
  }
});
