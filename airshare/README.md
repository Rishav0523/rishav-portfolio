# AirShare

AirShare is a small, LAN-only file transfer app. Run it on one computer, open the printed
address on any phone or laptop connected to the same Wi-Fi, and send files or text between
them. Files travel through your own computer over the local network — there is no cloud, no
account, no database, and no telemetry.

- **Server:** one Node.js process using only [`ws`](https://www.npmjs.com/package/ws) plus
  Node built-ins.
- **Client:** a dependency-free HTML/CSS/JS page served by the same process.
- **Storage:** none. The server relays binary WebSocket frames as they arrive; it never writes
  files to disk or holds a whole file in memory. Received files live in the receiver's browser
  tab until it is closed.

> AirShare is designed for a home or office network you trust. It has no authentication and no
> encryption. Do not expose it to the internet or run it on public Wi-Fi.

---

## Requirements

- Node.js **24 or newer** (developed against Node 24).
- npm.
- Two devices on the same local network (same Wi-Fi/LAN).
- TCP port **8787** free on the host computer, or set `PORT` to another port.

## Install and start

```bash
cd airshare
npm install
npm start
```

The server prints a banner with every LAN IPv4 address:

```text
AirShare is running (LAN only, nothing leaves your Wi-Fi).
  Local:    http://localhost:8787
  Network:  http://192.168.1.42:8787

Open a Network URL on any phone or laptop on the same Wi-Fi.
```

Use a **Network** URL from another device. `localhost` only works on the host itself.

Change the port (default `8787`):

```bash
# Git Bash / macOS / Linux
PORT=9000 npm start

# PowerShell
$env:PORT=9000; npm start

# cmd.exe
set PORT=9000 && npm start
```

Stop the server with `Ctrl+C`. Run the tests with:

```bash
npm test
```

## How to find your IP address

The startup banner already lists it. To look it up yourself:

- **Windows:** `ipconfig` → the IPv4 address of the Wi-Fi/Ethernet adapter.
- **macOS/Linux:** `ip addr` or `ifconfig` → the `inet` address of the active interface.

Then build the URL: `http://<that-ip>:8787` (or your custom port).

## Windows firewall

The first time Node listens, Windows may show a **Windows Defender Firewall** dialog. Allow
access on **Private networks** (not Public). If you dismissed the prompt by accident, phones
will not be able to connect until Node is allowed:

1. Open **Windows Security → Firewall & network protection → Allow an app through firewall**.
2. Change settings (admin), find **Node.js** in the list, tick **Private**, and confirm.
3. Ensure the Wi-Fi network profile is **Private** in **Settings → Network & internet → Wi-Fi →
   your network → Network profile type**.

Alternatively, from an **administrator** terminal you can add a private-profile rule:

```bat
netsh advfirewall firewall add rule name="AirShare 8787" dir=in action=allow protocol=TCP localport=8787 profile=private
```

Only TCP is needed (HTTP and WebSocket share the port).

## Two-device test

1. Start AirShare on the host laptop and leave the terminal open.
2. Note the `Network:` URL, e.g. `http://192.168.1.42:8787`.
3. On your phone, join the **same Wi-Fi** and open that exact URL in a browser.
4. Both devices should appear under **Devices online** within a second.
5. Send a text message from the phone; it appears on both screens with the sender name.
6. On the laptop, choose a small file in **Send files**. The phone shows the incoming transfer
   with progress, then a **Download** button.
7. Download the file and compare it with the original (size/hash). Repeat in the other
   direction.
8. Close one tab; the other device should announce that the peer left.

## Security and limits

- **Plaintext on the LAN.** HTTP/WS are unencrypted. Anyone who can reach the port can join,
  see device names, text messages, and file metadata, and receive broadcast files. Use only on
  a network you trust; guest Wi-Fi with client isolation will also stop transfers.
- **No authentication or accounts.** Device names are self-declared and not unique. A malicious
  LAN client could impersonate a name. The server has no concept of approval prompts.
- **No internet exposure.** The server binds `0.0.0.0` so LAN devices can reach it. Do not port
  forward it, place it behind a public reverse proxy, or run it on public Wi-Fi.
- **No persistence.** Files are never written by the server. Received files are assembled in
  browser memory; closing the tab discards them. The server keeps only transfer metadata
  (name, size, byte count, recipients) while a transfer is active.
- **500 MB per file.** Large transfers consume memory on the receiving browser tab and network
  bandwidth on the host; the server itself streams chunks instead of buffering the file.
- **Message limits.** JSON control messages are capped at 64 KB, text messages at 4,000
  characters, device names at 40 characters, file names at 255 characters. Each device may have
  at most 2 outgoing transfers at once. WebSocket frames are capped at 4 MB; the web client
  sends 64 KB chunks.
- **Abuse guards.** Clients that send malformed JSON or binary frames for unknown transfers are
  ignored; repeated violations close the socket. Dead sockets are dropped by a 30-second
  ping/pong heartbeat, and transfers with no data for 60 seconds are cancelled. When a receiver
  cannot keep up (more than 8 MB queued in its socket), the server pauses the sender's socket
  until the receiver drains, so a slow phone cannot make the server buffer a whole file.
- **Disconnect cleanup.** When a sender disconnects, its open transfers are cancelled and
  receivers are told; a peer-left event updates everyone's device list.
- **Port is LAN-visible.** Only run AirShare when you need it, and stop it with `Ctrl+C` when
  finished.

## Troubleshooting

**Phone says "server unreachable" / page does not load**

- Confirm both devices are on the same Wi-Fi (not one on cellular or a different band/VLAN).
- Use the `Network:` URL, not `localhost` or `127.0.0.1`.
- Check the firewall steps above; the Windows prompt often defaults to Public networks.
- Some routers/guest networks enable **AP/client isolation**, which blocks device-to-device
  traffic entirely. Disable isolation or use another network.
- VPNs on either device can route LAN traffic away. Disconnect the VPN while testing.
- Verify the server is still running and the port matches (`PORT`).

**Phone connects but the device list is empty**

- Open the page in a normal browser tab; private/incognito mode still works, but aggressive
  battery savers may suspend background tabs.
- Wait a second for the WebSocket handshake; the status pill should read **Connected**.
- Reload the page. If the server restarted, the client reconnects automatically.

**localhost shows a different app, or the startup banner prints a loopback warning**

- Another program on the host owns `127.0.0.1:<PORT>` (Windows allows this alongside AirShare's
  `0.0.0.0` binding). Phones still reach AirShare through the Network URL. On the host itself,
  either use the Network URL or start with another port, e.g. `PORT=8788 npm start`.

**File button does nothing / "No other devices online"**

- At least one other device must be connected and visible before sending.
- A device that joined mid-transfer cannot receive that transfer; start a new one.

**Transfer stalls or fails**

- Keep both tabs open and the host awake. Large files can take a while over Wi-Fi.
- If the receiver tab reloads, the partial file is lost — send it again (transfers are not
  resumable).
- Check free memory on the receiving device for multi-hundred-MB files.

**Download does not work on iPhone/iPad**

- Some iOS versions open the blob in a viewer instead of saving. Use the share sheet to save
  to Files, or receive on a laptop instead.

**Port already in use**

- Start with another port, e.g. `PORT=8788 npm start`, and open `http://<ip>:8788`.

## Protocol summary

Transport: HTTP for the static client, WebSocket at `ws://<host>:<port>/ws` for everything else.
Control messages are JSON text frames; file payloads are binary frames. All ids are generated by
the server unless noted.

### Handshake and presence

| Direction | Message | Notes |
| --- | --- | --- |
| client → server | `{type:"hello", name}` | Must be the first message. `name` is 1–40 chars. |
| server → client | `{type:"welcome", id, name, peers:[{id,name}], limits}` | `peers` excludes the new client. `limits` carries `maxFileBytes`. |
| server → all | `{type:"peers", peers:[{id,name}]}` | Full list, sent after joins, leaves, renames. |
| server → others | `{type:"peer-joined", peer:{id,name}}` | |
| server → others | `{type:"peer-left", id, name}` | Open transfers from that peer are cancelled. |
| client → server | `{type:"rename", name}` | Optional. |
| server → client | `{type:"renamed", name}` | Confirmation. |
| server → all | `{type:"peer-renamed", id, name}` | |

### Text

| Direction | Message |
| --- | --- |
| client → server | `{type:"text", text}` (1–4,000 chars, trimmed) |
| server → all | `{type:"text", mid, from, fromName, text, at}` |

The sender also receives its own text back from the server.

### File transfer

1. Sender sends `{type:"file-start", id, name, size, mime}`. `id` is a client-generated
   8–64 character URL-safe string (letters, digits, `_`, `-`), `size` is 0–524,288,000 bytes.
2. Server validates (name length, size, duplicate id, at most 2 outgoing transfers per client),
   allocates a 32-bit **stream id**, sends `{type:"file-accepted", id, stream, recipients}` to the
   sender, and broadcasts
   `{type:"file-start", id, stream, from, fromName, name, size, mime}` to every other peer.
3. Sender streams binary frames. Each frame is:

   ```text
   +----------------------+---------------------------+
   | stream id (4 bytes,  | file bytes (up to 64 KB   |
   | big-endian uint32)   | for the web client)       |
   +----------------------+---------------------------+
   ```

   The server looks up the stream, verifies the sender owns it, checks the total does not exceed
   the declared size, and **relays the frame unchanged** to the peers that were present at
   `file-start`. The 4-byte header is stripped by the receiver.
4. Sender sends `{type:"file-end", id}`. The server verifies the byte count equals `size` and
   broadcasts `{type:"file-end", id, stream}`. Receivers assemble the parts into a Blob.
5. Either side may stop early: sender sends `{type:"file-cancel", id}`; the server broadcasts
   `{type:"file-cancel", id, stream, reason}` to receivers. Reasons include
   `cancelled-by-sender`, `sender-disconnected`, `idle-timeout`, and `size-mismatch`.

Errors are returned as `{type:"error", code, message, id?}`. `id` is present when the error
refers to a specific transfer (for example `file-too-large`, `too-many-transfers`,
`unknown-transfer`). Binary frames for unknown streams are ignored; repeated bad frames close
the connection with code `1008`.

### Limits enforced by the server

| Limit | Value |
| --- | --- |
| File size | 500 MB |
| JSON message | 64 KB |
| WebSocket frame (raw) | 4 MB |
| Text message | 4,000 characters |
| Device name | 40 characters |
| File name | 255 characters |
| Concurrent outgoing transfers per device | 2 |
| Protocol violations before disconnect | 5 |
| Transfer idle timeout | 60 seconds |
| Heartbeat interval | 30 seconds |

## Project layout

```text
airshare/
├── package.json
├── server.js            HTTP static server + WebSocket relay (exports startServer/createServer)
├── public/
│   ├── index.html
│   ├── app.js           browser client: WebSocket, streaming, UI
│   └── styles.css
├── test/
│   └── airshare.test.js node:test suite (static serving, handshake, text, 300 KB file, limits)
└── README.md
```

The HTML page at `/airshare` on the public portfolio is separate from this app; nothing here is
uploaded or deployed by it.
