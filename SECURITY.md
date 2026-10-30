# Security

## Scope

This covers two separate systems in this repository:

1. The public site and its API at `https://rishavprasad.in` (Cloudflare Workers + D1), including the
   browser AirShare app at `/airshare/app/`.
2. The optional **AirShare** LAN app in `airshare/` (Node.js + WebSocket), which is never deployed
   on the public domain.

Only the owner administers either system. There is no user account system on the public site.

## Reporting

Found a problem? Email **prasadrishav959@gmail.com** with the path, what you observed, and how to
reproduce it. Please do not test against the contact form with automated floods or attempt to
access the admin area without permission.

---

## Public site

### Transport and headers

- HTTPS only; Cloudflare terminates TLS and issues the certificate for the custom domain.
- API responses send `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.
- Cookies are `HttpOnly`, `SameSite=Strict`, `Secure` on HTTPS, scoped to `/`.
- Static pages are generated HTML; there is no server-side rendering of user input and no inline
  script injection point. Content is rendered with React escaping.

### Content API

- `GET /api/content` is public by design (it is the site's own content) and cached for 60 seconds.
- `PUT /api/admin/content` requires a session and validates the whole document with
  `worker/content-schema.ts`:
  - fixed shape and known keys, 512 KB document cap;
  - per-array and per-string limits;
  - icon labels, project statuses, achievement categories and social labels are allow-lists;
  - project slugs are lowercase, unique, and `[a-z0-9-]` only;
  - links must be relative (`/...`) or `http(s)://`; `javascript:`, `data:` and similar are
    rejected.
- Unknown `/api/*` paths return JSON 404 instead of falling through to the static 404 page.

### Admin authentication

- Single owner password, never stored in plaintext or in source control. The Worker stores only a
  PBKDF2-SHA256 hash (`format: pbkdf2_sha256$<iterations>$<salt>$<hash>`, 100k–1M iterations,
  generated at 210k).
- Sessions are HMAC-SHA256 signed tokens in an `HttpOnly` cookie, 12-hour lifetime, verified with a
  constant-time comparison. Rotating `SESSION_SECRET` invalidates every session.
- Sign-in is limited to 8 failures per hashed IP per 15 minutes; password comparison is constant
  time with respect to hash contents.
- State-changing admin requests with an `Origin` header must come from the site origin or the
  request origin; combined with `SameSite=Strict`, cross-site form posts cannot mutate content.
- Admin pages are `noindex` and disallowed in `robots.txt`. This is obscurity, not access control:
  the API is the real gate.

**Residual risk:** there is no second factor and no Cloudflare Access in front of `/admin/`. The
password and rate limit are the entire gate. Use a long unique password, keep the hash secret, and
rotate it if a device is lost.

### Contact form

- Cloudflare Turnstile is verified server-side before anything is stored.
- Honeypot field (`website`) silently accepts and discards bot submissions.
- Server-side validation: name 2–80, email format and ≤160, optional subject ≤120, message
  10–4000 characters; body size cap 1 MB.
- Rate limit: 5 accepted messages per hashed IP per hour, enforced in D1.
- IP addresses are not stored; only `sha256("contact:" + IP)`, used for rate limiting.
- Messages are stored in D1 (`contact_messages`) and deleted manually from the dashboard. Treat
  them as personal data: keep only what you need and delete junk promptly.

### Secrets

Stored as Worker secrets (`wrangler secret put`), never in the repo, never in the static bundle,
never logged:

| Name | Purpose |
|---|---|
| `ADMIN_PASSWORD_HASH` | PBKDF2 hash of the admin password |
| `SESSION_SECRET` | HMAC key for admin session cookies |
| `TURNSTILE_SECRET` | Turnstile server-side verification |
| `GITHUB_TOKEN` | Repository dispatch for rebuilds (fine-grained, Contents write) |

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is public by design. CI credentials (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`) are GitHub repository secrets, not environment files.

### Media (R2)

- Uploads require a session, enforce MIME allow-lists (JPEG/PNG/WebP/GIF, 5 MB; PDF resume, 5 MB),
  generate UUID keys, and reject `..` traversal in keys.
- Objects are served by the Worker with `Cache-Control: immutable` and `nosniff`; the bucket does
  not need public access.
- Until R2 is enabled, every media route returns 503 rather than leaking an unhandled error.

### Publishing

- Publishing dispatches `content-published` to the site repository. The token is fine-grained to
  that repo with Contents write and can only trigger the workflow, not read private data.
- CI never deploys unvalidated content: the build fetches the API, checks the document shape, and
  fails closed.

---

## AirShare (browser app)

`/airshare/app/` pairs two browsers with a shared PIN. The Worker only stores presence and
signaling; file contents never pass through it.

- **Room ids are derived, not listed.** The id is `sha256("airshare:v1:" + PIN)`. The PIN itself is
  never stored or returned, and there is no endpoint that lists rooms or members.
- **The PIN is the only gate.** It is 6–10 digits (8 generated). Anyone on the network who has it can
  join, and device names are self-declared. Share PINs in person and leave the room afterwards.
- **Peers are ephemeral.** Rows expire after 90 seconds without a heartbeat; signals expire after
  10 minutes; leaving deletes both. Nothing is persisted beyond that.
- **Rate limits:** 30 joins per 10 minutes per IP hash, 120 signals per minute per peer, 8 peers per
  room, 64 KB signal payload cap. Signaling is validated to SDP and ICE shapes only.
- **Direct, encrypted transport.** Data channels use DTLS, and no STUN or TURN server is configured,
  so media cannot be relayed. The app checks the selected host candidate pair and closes the
  connection unless one end is a private, loopback, link-local or `.local` address, or both ends
  share a subnet (the same IPv6 /64, or the same IPv4 /24). Without a relay, a private endpoint is
  unreachable from another network, so that check is meaningful rather than cosmetic.
- **Passwords and secrets:** AirShare uses no account and no cookies; the admin session cookie is
  not involved.
- **Limits:** 100 MB per file, 8 devices per room, memory-only transfers, no resume after a drop.

Residual risks: a PIN can be guessed if it is short and the attacker is on the same network (the
join limit slows but does not stop this); a compromised browser on either end can read what it
receives; and browser support for WebRTC data channels is required on both devices.

---

## AirShare (optional Node app)

AirShare is deliberately simple and deliberately unsafe on untrusted networks. Read its
[README](airshare/README.md) before using it.

- **No authentication and no encryption.** HTTP and WebSocket are plaintext; anyone who can reach
  the port can join, see device names, read broadcast text, receive files, and send files.
- **LAN only.** The server binds `0.0.0.0` so other devices on the same network can connect. Do
  not port-forward it, put it behind a public reverse proxy, or run it on public/guest Wi-Fi.
- **No persistence.** The server never writes received files to disk; receivers hold data in the
  browser tab. Transfer metadata is kept in memory only while a transfer is active.
- **Resource guards:** 64 KB JSON messages, 500 MB per file, 4 MB WebSocket frames, two outgoing
  transfers per client, heartbeat and idle-transfer cleanup, malformed-frame tolerance.
- **Device names are self-declared.** A malicious LAN client can impersonate another name; there is
  no approval prompt.

---

## Operational hygiene

- Keep dependencies current (`npm audit`, `npm outdated`); the site uses a small dependency set.
- Rotate the admin password and `GITHUB_TOKEN` at least every 90 days, and immediately if a device
  with access is lost.
- Delete old contact messages from the dashboard.
- Review Cloudflare D1/R2 access and account members periodically; the account has full control.
- Do not commit `.dev.vars`, `.env*`, `.wrangler/`, or `out/`.
