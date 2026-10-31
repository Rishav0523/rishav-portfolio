# Architecture

The portfolio is a statically exported Next.js site attached to a Cloudflare Worker. The Worker
serves a small API, the admin dashboard and AirShare signaling, and Cloudflare serves the exported
pages directly from the asset store. There is no Node.js server in production and no paid service
in the runtime path.

## Topology

```
                        ┌─────────────────────────────────────────────┐
                        │                Cloudflare                   │
  browser ──HTTPS──▶    │  ┌───────────────┐    ┌──────────────────┐  │
                        │  │ Static Assets │    │ Worker (Hono)    │  │
                        │  │  ./out/**     │    │  /api/* /media/* │  │
                        │  └───────────────┘    └────────┬─────────┘  │
                        │                               │            │
                        │                     ┌─────────▼─────────┐  │
                        │                     │ D1 (SQLite)       │  │
                        │                     │ content, messages │  │
                        │                     │ admin, AirShare   │  │
                        │                     └───────────────────┘  │
                        └─────────────────────────────────────────────┘
  GitHub (main) ──Actions──▶ npm ci → typecheck → tests → build → wrangler deploy
  Admin "Publish" ──repository_dispatch──▶ same workflow
```

`wrangler.jsonc` sets `assets.directory` to `./out`, `run_worker_first` for `/api/*` and `/media/*`,
`html_handling: "auto-trailing-slash"` and `not_found_handling: "404-page"`. Public pages therefore
never depend on the Worker; only API and media requests do. A Worker exception degrades the API,
not the site.

## Request lifecycle

1. **Static page.** Cloudflare matches the path in the asset store (`/about/` →
   `about/index.html`). No Worker code runs. Response headers come from `public/_headers`.
2. **API request.** `/api/*` is routed to the Worker first. Hono runs the body-size guard, then the
   route handler, then adds security headers. Responses are JSON.
3. **Unknown path.** Static Assets returns the exported custom 404 page. API paths that do not
   match return `{"error":"Not found."}` with status 404.
4. **Media.** `/media/*` always reaches the Worker, which returns 503 while the optional R2 binding
   is absent, otherwise streams the object with a long immutable cache.

## Build pipeline

`npm run build` runs the content fetch first, then `next build` with `output: "export"`:

1. `scripts/fetch-content.mjs` requests `${SITE_URL}/api/content` and writes
   `content/published.json`. In CI the fetch is strict: a failed fetch fails the build instead of
   publishing stale content. Locally, a failed fetch keeps the committed snapshot.
2. `next build` renders every route from `content/published.json` at build time. There are no
   server components that read D1 at runtime.
3. The static result lands in `out/`. GitHub Actions uploads it with the Worker using
   `wrangler deploy`.

This is why publishing is a two-step operation: **Save** writes D1, **Publish** asks GitHub to rebuild.
A page cannot read live D1 because it is a static file.

## Content model

One `ContentDoc` type in `lib/content.ts` describes the whole site. The same object exists twice:

- **D1** is the editable source of truth (`site_content.document`, a JSON string, validated on
  read and write).
- **`content/published.json`** is the committed build snapshot, refreshed by the fetch step.

The Worker validates with `worker/content-schema.ts`; the build consumes the validated snapshot.
If D1 is unreadable, the public API falls back to the committed snapshot, while the admin read path
is strict and refuses to serve defaults so a save cannot silently overwrite real content.

The admin dashboard (`components/admin/dashboard.tsx`) edits the document through the API and never
touches D1 directly. The resume has an additional approval gate: the page shows the PDF only when
`resumePdf.approvedForPublish` is true (`lib/resume.ts`).

## Security model

| Surface | Control |
|---|---|
| Admin sign-in | PBKDF2-HMAC-SHA256, per-hash salt, constant-time compare, 100,000 iterations (Workers ceiling). |
| Admin session | HMAC-signed HttpOnly cookie, `SameSite=Strict`, `Secure`, 12-hour TTL. |
| Login abuse | 8 failures per 15 minutes per hashed IP; attempts older than 24 hours pruned on success. |
| Cross-site writes | `Origin` check on login and every admin write; `SameSite=Strict` cookie. AirShare writes check origin too. |
| Contact spam | Turnstile verification plus 5 messages per hour per hashed IP. |
| Injection | Every D1 query is parameterized with `.bind()`; no string-built SQL. |
| Uploads | R2 disabled; when enabled, MIME allow-list, 5 MB limit, generated keys, `..` rejected. |
| Response headers | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame restrictions in `public/_headers`; API adds `nosniff` and `no-referrer`. |
| Secrets | Only in Cloudflare Worker settings, GitHub Actions secrets and the git-ignored `.dev.vars`. Never in the repository or the export. |
| Personal data | Contact messages are admin-only; IP addresses are stored only as SHA-256 hashes. |

The site holds no authentication cookies for visitors, no third-party scripts except the optional
Cloudflare Web Analytics beacon, and no analytics identifiers in the static HTML.

## AirShare

AirShare moves files browser-to-browser over a WebRTC data channel. The Worker and D1 are used only
for discovery:

```
Phone A ─┐                        ┌─ D1: peers + signals (≤64 KB each, TTL 10 min)
         ├─ join(PIN) → room hash ─┤
Phone B ─┘                        └─ poll signals every 2 s while connecting
         │
         └──── WebRTC offer/answer/ICE ────▶ direct data channel (64 KB chunks, ≤100 MB)
```

- The PIN never reaches D1; the room id is `sha256("airshare:v1:" + pin)`.
- `iceServers: []`, so only host and peer-reflexive candidates are used and files never traverse a
  relay. This is why guest or client-isolated Wi-Fi networks cannot be supported.
- Presence expires after 90 seconds without a heartbeat; rooms are capped at 8 peers.
- The D1 tables (`airshare_peers`, `airshare_signals`, `airshare_join_attempts`) hold no file bytes.

A separate Node.js + `ws` implementation in `airshare/` is kept as an optional self-hosted LAN tool.
It is not part of the deployed site or the build.

## Invariants

These are enforced by the code and must survive future edits:

- The static export has no server actions, route handlers or runtime image optimization. Navigation
  uses plain anchors (`components/static-link.tsx`), not `next/link`.
- Content used by pages comes from `content/published.json`, never from a runtime D1 call.
- The admin hash must encode exactly 100,000 PBKDF2 iterations; higher counts throw in Workers.
- No secret, token or private export may be committed. `backups/*` is ignored except the sanitized
  export.
- No localhost URL or preview-domain URL may appear in published content.
- AirShare must not depend on a STUN/TURN server; LAN-only is a design constraint, not a fallback.

## Known limitations

- Admin sign-in depends on the owner's stored hash; if it still encodes 210,000 iterations, sign-in
  fails even though the code and tests are correct.
- R2 is disabled, so media and resume uploads return 503 and the UI hides those controls.
- Web Analytics collection is unconfirmed; the CSP allows the beacon but none was observed in
  production HTML.
- AirShare's cross-device path is verified with two browser contexts, not yet with two physical
  phones on the same Wi-Fi after the IPv6 fixes.
- Firefox, Safari, iOS and Android were not part of the automated responsive sweep.
- The free tier caps D1 size and Worker request volume; the site is well below those limits at handover,
  but there is no load or abuse testing.

Operational detail lives in `documentation/05_Deployment_and_Recovery_Guide.pdf`; file-level
guidance lives in `documentation/06_File_Reference_and_Code_Modification_Guide.pdf`.
