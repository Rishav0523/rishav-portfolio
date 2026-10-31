# API Documentation

The portfolio's API is a Hono Worker mounted behind Cloudflare Static Assets. Static pages are
served without invoking the Worker; requests under `/api/*` and `/media/*` always reach it.

- **Production base URL:** `https://rishavprasad.in`
- **Local base URL:** `http://localhost:8787` (`npx wrangler dev`)
- **Content type:** `application/json` unless stated otherwise
- **Authentication:** an HttpOnly session cookie for `/api/admin/*`; everything else is public

> Values in examples are illustrative. The current content document is public at
> `GET /api/content`; read it there rather than copying an old snapshot.

## Conventions

### Errors

Errors are JSON objects with a single `error` string:

```json
{ "error": "Message must be between 10 and 4000 characters." }
```

Content validation failures add an array of field-level messages (at most 25):

```json
{
  "error": "Validation failed.",
  "details": ["projects[2].title: is required", "socials: must be an array"]
}
```

| Status | Meaning |
|---|---|
| 400 | Malformed body, failed validation, or a body larger than 1 MB. |
| 401 | Missing/expired admin session, or invalid credentials. |
| 403 | Cross-origin write rejected by the `Origin` check. |
| 404 | Unknown API path or media key. |
| 409 | AirShare room full, or a peer is no longer present. |
| 410 | AirShare session expired; join again. |
| 429 | Per-IP rate limit reached. |
| 503 | A required secret, binding or dependency is missing or unavailable. |

### Request limits and headers

- Request bodies are capped at **1,048,576 bytes** (1 MB) for non-GET requests.
- API responses carry `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.
- Writes from the admin UI are accepted only when the `Origin` header is the site origin or
  `SITE_URL`. `SameSite=Strict` on the session cookie is the second line of defence.
- `GET /api/content` is cacheable for 60 seconds; AirShare responses are `no-store`.

### The content document

`ContentDoc` is the single content model shared by the Worker and the build. Its top-level fields:

| Field | Type |
|---|---|
| `version` | number |
| `socials` | `{ label: "GitHub" \| "LinkedIn" \| "Instagram", handle, href }[]` |
| `education` | entries with `degree`, `institution`, `period`, `board?`, `score`, `scoreLabel`, `location`, `notes[]`, `current?` |
| `skillGroups` | `{ title, icon, description, items[] }[]` |
| `domains` | string[] |
| `leadership` | `{ role, org, period, icon, summary, points[] }[]` |
| `journey` | `{ year, title, detail }[]` |
| `projects` | `{ slug, title, status, summary, detail, stack[], links? }[]` |
| `achievements` | `{ title, category, role, period, detail }[]` |
| `awards` | `{ title, result, period?, team? }[]` |
| `certifications` | `{ title, issuer, year, detail?, href? }[]` |
| `resumeSummary` | string |
| `resumePdf` | `{ href, approvedForPublish }` |
| `profileFacts` | `{ label, value }[]` |

The validator enforces types, required fields, allowed enum values (`status`, `category`, icons,
social labels) and these collection maxima: 50 projects, 100 awards, 50 achievements,
100 certifications, 20 leadership roles, 10 education entries, 20 skill groups, 30 domains,
30 journey entries, 12 profile facts, 6 socials, 12 bullet points per entry. The serialized
document may not exceed **512 KB**.

---

## Public endpoints

### `GET /api/health`

Checks the Worker and its D1 binding. No authentication.

```json
{ "ok": true, "service": "portfolio-api", "database": "ok" }
```

If `SELECT 1` fails, the response is `503` with `"database": "unavailable"`.

### `GET /api/content`

Returns the published content document. If D1 is unavailable or the stored document fails
validation, the committed default content is returned instead, so public pages keep rendering.
`Cache-Control: public, max-age=60`.

```json
{
  "version": 1,
  "socials": [{ "label": "GitHub", "handle": "@Rishav0523", "href": "https://github.com/Rishav0523" }],
  "education": [{ "degree": "B.Tech, Computer Science and Engineering", "institution": "Cooch Behar Government Engineering College", "period": "2024 – 2028 (expected)", "score": "8.5 / 10", "scoreLabel": "Current CGPA", "location": "Cooch Behar, West Bengal", "notes": ["Third-year undergraduate"], "current": true }],
  "projects": [],
  "resumePdf": { "href": "/resume/rishav-prasad-resume.pdf", "approvedForPublish": true }
}
```

The example is abbreviated; the live response contains every field listed above.

### `POST /api/contact`

Stores a contact message after validating the Turnstile token.

Request:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "subject": "Optional subject",
  "message": "At least ten characters.",
  "turnstileToken": "<token from the widget>",
  "website": ""
}
```

Rules:

- `name` 2–80 characters; `email` valid and ≤ 160; `subject` ≤ 120 (optional);
  `message` 10–4000 characters; `turnstileToken` required.
- A non-empty `website` field is treated as a bot and answered with `200 {"ok":true}` without
  storing anything.
- Turnstile is verified server-side with `TURNSTILE_SECRET` and the client IP.
- Rate limit: **5 messages per 60 minutes per IP**, hashed with SHA-256 (`contact:<ip>`).
- The raw IP is never stored; only the hash is kept with the message.

Success: `201 {"ok":true}`.

Errors: `503` when the contact form is not configured, `400` for validation or verification
failure, `429` when the rate limit is reached.

---

## Admin endpoints

All routes under `/api/admin` except `POST /login` require the `admin_session` cookie.

The session cookie is HttpOnly, `SameSite=Strict`, `Secure` on HTTPS, `Path=/`, valid for
**12 hours**. It is an HMAC-signed token verified with `SESSION_SECRET`.

### `POST /api/admin/login`

```json
{ "password": "<owner password>" }
```

- `503` if `ADMIN_PASSWORD_HASH` or `SESSION_SECRET` is missing.
- `403` if the `Origin` header is neither the request origin nor `SITE_URL`.
- `401` for a wrong password; each failure is recorded.
- `429` after **8 failed attempts in 15 minutes** from the same IP.
- Success: `200 {"ok":true}` and the session cookie.

Passwords are checked with PBKDF2-HMAC-SHA256 using the salt and iteration count embedded in the
stored hash. The Worker runtime accepts at most **100,000 iterations**; a hash with a higher count
is rejected before derivation.

### `POST /api/admin/logout`

Clears the cookie. Returns `200 {"ok":true}`.

### `GET /api/admin/session`

Confirms the session is valid: `200 {"authenticated":true}`. Without a session: `401`.

### `GET /api/admin/content`

Returns the stored document in **strict** mode: unlike the public endpoint, a read or validation
failure returns `503` instead of falling back to defaults. This prevents the editor from saving
defaults over real content.

### `PUT /api/admin/content`

Writes a complete `ContentDoc`. The body is validated with the same validator the build uses.

```json
{ "ok": true, "updatedAt": "2026-10-31T00:00:00.000Z" }
```

Failure: `400` with `{ "error": "Validation failed.", "details": [...] }`. The admin UI tells the
user to publish after saving; the public site changes only when the rebuild finishes.

### `POST /api/admin/publish`

Sends a `repository_dispatch` event (`content-published`) to `GITHUB_REPO` using `GITHUB_TOKEN`.
A successful request returns `202 {"ok":true,"message":"Rebuild queued."}`. Missing configuration
returns `503`; a non-OK GitHub response returns `503` with the upstream status in the message.

### Messages

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/messages` | Newest 100 messages: `{ messages: [{ id, name, email, subject, message, created_at, is_read }] }` |
| `PATCH` | `/api/admin/messages/:id` | Marks one message read. `{ "ok": true }` |
| `DELETE` | `/api/admin/messages/:id` | Deletes one message. `{ "ok": true }` |

### Media (requires the optional `MEDIA` R2 binding)

Every route in this group returns `503` while R2 is disabled, which is the current production
state.

| Method | Path | Body | Result |
|---|---|---|---|
| `GET` | `/api/admin/media` | — | `{ media: [{ key, filename, content_type, size, created_at }] }` (newest 100) |
| `POST` | `/api/admin/media` | `multipart/form-data` with `file` | `201 { ok, key, href }` |
| `DELETE` | `/api/admin/media/:key` | — | `200 { ok: true }` |
| `POST` | `/api/admin/resume` | `multipart/form-data` with `file` | `201 { ok, href, size }` |

Image rules: JPEG, PNG, WebP or GIF; at most **5 MB**; stored as `media/<uuid>.<ext>`.
Resume rules: PDF, at most **5 MB**, stored at the fixed key `resume/rishav-prasad-resume.pdf`;
the content document's `resumePdf` is set to `/media/resume/...` with `approvedForPublish: true`.
Delete accepts only keys starting with `media/` and rejects `..`.

### `GET /media/:key`

Public object download. Uses the stored content type, `Cache-Control: public, max-age=31536000,
immutable` and `nosniff`. Returns `503` when R2 is disabled, `404` for an unknown key, `400` for a
key containing `..`.

---

## AirShare endpoints

Mounted at `/api/airshare`. D1 stores presence and WebRTC signaling only; file bytes travel
directly between browsers over a data channel. Room identifiers are `sha256("airshare:v1:" + pin)`,
so the PIN is not stored.

Limits:

| Limit | Value |
|---|---|
| PIN | 6–10 digits |
| Peers per room | 8 |
| Peer presence TTL | 90 seconds |
| Signal TTL | 10 minutes |
| Signal size | 64 KB |
| Signals per peer per minute | 120 |
| Max signals returned per poll | 50 |
| Join attempts per IP | 30 per 10 minutes |
| Name length | 1–40 characters |

### `POST /api/airshare/join`

```json
{ "pin": "12345678", "peerId": "device-abc_123", "name": "Phone A" }
```

`peerId` is 8–64 characters of `A-Z a-z 0-9 _ -`. Response:
`{ "room": "<64 hex>", "peers": [{ "id": "...", "name": "...", "lastSeen": "..." }] }`.
A full room returns `409`; excessive joins return `429`; bad input returns `400`.

### `POST /api/airshare/heartbeat`

```json
{ "room": "<64 hex>", "peerId": "device-abc_123" }
```

Refreshes presence and returns the current peer list. If the peer row is gone, returns `410` and
the client must join again.

### `POST /api/airshare/signal`

```json
{
  "room": "<64 hex>",
  "from": "device-abc_123",
  "to": "device-def_456",
  "payload": { "type": "offer", "sdp": "..." }
}
```

`payload` is an SDP offer/answer or an ICE candidate object; it is normalized and size-limited to
64 KB. Sender and recipient must both be present in the room, otherwise `409`. Success:
`201 {"ok":true}`.

### `GET /api/airshare/signals?room=…&peer=…&since=…`

Returns pending signals addressed to the peer, oldest first, plus the latest peer list:

```json
{
  "signals": [{ "id": 42, "from": "device-def_456", "payload": { "type": "answer", "sdp": "..." } }],
  "cursor": 42,
  "peers": [{ "id": "device-def_456", "name": "Phone B", "lastSeen": "..." }]
}
```

Pass the returned `cursor` as `since` on the next poll. An expired session returns `410`.

### `POST /api/airshare/leave`

```json
{ "room": "<64 hex>", "peerId": "device-abc_123" }
```

Removes the peer and its pending signals. Returns `{ "ok": true }`; safe to call twice.

AirShare writes also check the `Origin` header against the site origin. WebRTC is created with
`iceServers: []`, so no STUN or TURN relay is used and only local candidates are accepted by the
client.

---

## Caching summary

| Path | Cache behaviour |
|---|---|
| `/api/health`, `/api/contact`, `/api/admin/*` | Not cached (dynamic) |
| `/api/content` | `max-age=60` |
| `/api/airshare/*` | `no-store` |
| `/media/*` | `max-age=31536000, immutable` |
| Static pages and assets | Cloudflare Static Assets, hashed filenames for `_next/static` |
