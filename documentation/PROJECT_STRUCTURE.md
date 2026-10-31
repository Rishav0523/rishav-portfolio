# Project Structure

A map of the repository as handed over. It tracks 86 files before the documentation set is added;
generated directories (`out/`, `.next/`, `node_modules/`, `.wrangler/`) are not listed.

```
.
├── .github/workflows/deploy.yml     CI: typecheck, tests, build, wrangler deploy
├── .env.example                     Every environment variable, names only
├── DEPLOYMENT.md                    Root quick guide for local dev and deploys
├── README.md                        Project overview and stack
├── SECURITY.md                      Security notes and reporting
├── backups/
│   ├── rishav-portfolio-*.sql       Full export (git-ignored, private)
│   └── schema-and-content-*.sql     Sanitized export (committed)
├── content/published.json           Build-time content snapshot
├── documentation/                   This documentation set
│   ├── 01..07_*.pdf                 The PDF deliverables
│   ├── README.md                     Index and PDF rebuild instructions
│   ├── API_DOCUMENTATION.md          Endpoint reference
│   ├── ARCHITECTURE.md               System design
│   ├── CHANGELOG.md                  Dated history
│   ├── PROJECT_STRUCTURE.md          This file
│   └── source/                       HTML sources, CSS, paginator, screenshots
├── migrations/
│   ├── 0001_init.sql                site_content, contact_messages, media, login_attempts
│   └── 0002_airshare.sql            airshare_peers, airshare_signals, airshare_join_attempts
├── app/
│   ├── layout.tsx                   Root HTML, fonts, metadata, theme bootstrap
│   ├── globals.css                  Tailwind 4 and the Summer Dream design tokens
│   ├── not-found.tsx                Custom 404 exported as 404.html
│   ├── robots.ts                    robots.txt (disallows /admin and /api/)
│   ├── sitemap.ts                   Manual list of the 11 public URLs
│   ├── (site)/                      Public pages, share the site chrome
│   │   ├── layout.tsx               Header, footer, skip link
│   │   ├── page.tsx                 Home
│   │   ├── about/page.tsx
│   │   ├── education/page.tsx
│   │   ├── skills/page.tsx
│   │   ├── experience/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── achievements/page.tsx
│   │   ├── resume/page.tsx
│   │   ├── contact/page.tsx
│   │   └── airshare/
│   │       ├── page.tsx             AirShare explainer
│   │       └── app/page.tsx         AirShare browser app
│   └── admin/page.tsx               Admin entry, renders the dashboard
├── components/
│   ├── site/                        Public UI: nav, footer, contact form, theme, timeline,
│   │                                typing roles, print resume, socials, empty state
│   ├── admin/                       dashboard.tsx, content-editors.tsx, fields.tsx
│   ├── airshare/
│   │   ├── airshare-app.tsx         PIN gate, polling, WebRTC, chunked transfer
│   │   └── protocol.ts              Chunk sizes, message types, PIN rules
│   └── static-link.tsx              Plain anchor wrapper for the static export
├── lib/
│   ├── content.ts                   ContentDoc types and the committed default
│   ├── site.ts                      Name, email, nav, Turnstile site key, focus areas
│   ├── resume.ts                    Resume approval gate and size label
│   ├── icons.tsx                    Icon map shared by content and admin
│   └── cn.ts                        Class-name helper
├── worker/
│   ├── index.ts                     Hono app: public API, admin API, media route
│   ├── auth.ts                      PBKDF2, HMAC sessions, SHA-256 helpers
│   ├── content-schema.ts            Content validation (shared rules)
│   ├── airshare.ts                  Join, heartbeat, signal, poll, leave
│   ├── env.ts                       Binding and secret types
│   └── tsconfig.json                Worker TypeScript config
├── scripts/
│   ├── fetch-content.mjs            Snapshot the API into content/published.json
│   └── hash-password.mjs            Produce an ADMIN_PASSWORD_HASH at 100,000 iterations
├── tests/
│   ├── auth.test.ts                 Password, session and hash-boundary tests
│   ├── content-schema.test.ts       Validator tests
│   ├── airshare-protocol.test.ts    Chunking, PIN and message tests
│   ├── e2e.mjs                      Production read-only + admin checks
│   ├── e2e-responsive.mjs           Seven-width Chromium sweep
│   └── e2e-airshare.mjs             Two-context WebRTC transfer
├── public/
│   ├── _headers                     CSP and security headers
│   ├── favicon.svg
│   ├── images/                      Portrait, about portrait, Open Graph image
│   ├── resume/rishav-prasad-resume.pdf
│   └── certifications/nptel-pdsa-python-2026.pdf
├── airshare/                        Optional standalone Node.js LAN tool (not deployed)
├── next.config.ts                   output: "export", trailingSlash, image policy
├── wrangler.jsonc                   Worker, assets, D1, optional R2, routes, vars
├── package.json                     Scripts and dependencies
├── vitest.config.ts                 Unit test configuration
└── tsconfig.json                    App TypeScript configuration
```

## Routes

| URL | File | Notes |
|---|---|---|
| `/` | `app/(site)/page.tsx` | Static |
| `/about/` | `app/(site)/about/page.tsx` | Static |
| `/education/` | `app/(site)/education/page.tsx` | Static |
| `/skills/` | `app/(site)/skills/page.tsx` | Static |
| `/experience/` | `app/(site)/experience/page.tsx` | Static |
| `/projects/` | `app/(site)/projects/page.tsx` | Static |
| `/achievements/` | `app/(site)/achievements/page.tsx` | Static |
| `/resume/` | `app/(site)/resume/page.tsx` | Static, approval-gated PDF |
| `/contact/` | `app/(site)/contact/page.tsx` | Static form → `/api/contact` |
| `/airshare/` | `app/(site)/airshare/page.tsx` | Static explainer |
| `/airshare/app/` | `app/(site)/airshare/app/page.tsx` | Client app, signaling API |
| `/admin/` | `app/admin/page.tsx` | Client dashboard |
| `/api/*` | `worker/index.ts` | Worker |
| `/media/*` | `worker/index.ts` | Worker (503 while R2 is off) |

## Where to change what

| Task | Edit |
|---|---|
| Page text, projects, awards, resume summary | Admin dashboard, then Publish — not the JSON file |
| Brand, nav items, email, site metadata | `lib/site.ts`, `app/layout.tsx` |
| A new public page | `app/(site)/<name>/page.tsx`, plus `lib/site.ts` and `app/sitemap.ts` |
| Colours, spacing, typography | `app/globals.css` tokens |
| API behaviour or a new endpoint | `worker/index.ts` (or `worker/airshare.ts`) |
| Content fields and validation | `lib/content.ts`, `worker/content-schema.ts`, admin editors |
| Database schema | New numbered file in `migrations/`; never edit an applied migration |
| Headers, CSP | `public/_headers` |
| Deployment, bindings, vars | `wrangler.jsonc` |
| CI pipeline | `.github/workflows/deploy.yml` |
| Tests | `tests/` |
| Documentation | `documentation/source/`, then rebuild the PDF |

## Generated and ignored

| Path | Why |
|---|---|
| `out/` | Static export; rebuilt each deploy |
| `.next/` | Next.js build cache |
| `node_modules/` | Dependencies |
| `.wrangler/` | Local D1 and Worker state |
| `.dev.vars` | Local-only secrets |
| `backups/rishav-portfolio-*.sql` | Full export with personal data |

`content/published.json` is committed on purpose: it is the fallback snapshot used when D1 is
unreachable during a build.
