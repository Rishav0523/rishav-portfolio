# Rishav Prasad — Portfolio & AirShare

Personal portfolio for **Rishav Prasad** — B.Tech Computer Science and Engineering student at
Cooch Behar Government Engineering College, software developer and student leader.

The public site is a **static export** on Cloudflare Workers Static Assets. A Hono Worker serves a
small JSON API for content, contact messages and a private admin dashboard. **AirShare** is a
separate, LAN-only Node.js app in `airshare/` that is never bundled into the site.

**Status: Gate 6 of 6 — complete.** Live at `https://rishavprasad.in` with auto-deploy from `main`.
Three owner actions remain (they are intentionally not automated because they use your
credentials): set the production admin/contact secrets, add a GitHub token for the Publish button,
and enable R2 if you want media uploads. See [DEPLOYMENT.md](DEPLOYMENT.md) and the checklist below.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), static export (`output: "export"`) |
| UI | React 19, TypeScript, Tailwind CSS 4, lucide-react |
| Fonts | Fraunces (display) + Manrope (body), self-hosted via `next/font` |
| API | Hono on Cloudflare Workers |
| Data | Cloudflare D1 (content + messages), R2 (optional media) |
| Spam protection | Cloudflare Turnstile |
| Hosting | Cloudflare Workers + Static Assets, free plan |
| CI/CD | GitHub Actions → D1 migrations (manual) → `wrangler deploy` |
| AirShare | Standalone Node.js 24 + `ws`, LAN only |

---

## Local development

Requirements: Node.js 24+, npm 11+.

```bash
npm install
npm run dev          # public site on http://localhost:3000 (no API routes here)
npm run typecheck    # app + Worker TypeScript
npm test             # Vitest: content validation and auth/session
```

To exercise the **full stack** (static pages + `/api/*`), use Wrangler:

```bash
npx wrangler d1 migrations apply rishav-portfolio --local   # first time only
npx wrangler dev --port 8787
```

Wrangler serves the last built `out/` plus the Worker. Rebuild (`npm run build`) after changing
pages. Local secrets live in `.dev.vars` (git-ignored), including `TURNSTILE_SECRET`,
`SESSION_SECRET` and a **local-only** `ADMIN_PASSWORD_HASH`.

Browser checks:

```bash
npm run test:e2e                         # against http://127.0.0.1:8787
E2E_ADMIN_PASSWORD=<local password> npm run test:e2e
E2E_BASE=https://rishavprasad.in npm run test:e2e   # read-only production checks
```

Production build and preview of the exact static output:

```bash
npm run build        # prebuild refreshes content/published.json, then writes ./out
npm run preview      # serves ./out on http://localhost:4173 (no API)
```

`SITE_URL` defaults to `https://rishavprasad.in`. During CI it is also the content API base, so a
production build always starts from the latest published content.

---

## How content publishing works

```
/admin/  ──PUT /api/admin/content──▶  D1 site_content (one JSON document)
   │                                      │
   └──POST /api/admin/publish──▶ GitHub repository_dispatch
                                          │
                        GitHub Actions: scripts/fetch-content.mjs
                                          │
                            content/published.json (commit-free snapshot)
                                          │
                                next build ──▶ Worker assets
```

- The admin dashboard edits the whole document through validated section editors.
- `POST /api/admin/publish` asks GitHub to run the deploy workflow.
- The workflow fetches `/api/content` (strict: a broken API fails the build instead of shipping
  stale content) and overwrites the committed snapshot before `next build`.
- Saving content without publishing changes nothing public; publishing rebuilds every page.
- Locally, `npm run build` keeps the committed snapshot because neither `CI` nor
  `CONTENT_API_URL` is set. Use `CONTENT_API_URL=https://rishavprasad.in` to pull live content.

The document schema is enforced by [`worker/content-schema.ts`](worker/content-schema.ts): size
limits, icon keys, unique lowercase project slugs, relative-or-http(s) links, and per-array caps.
Invalid saves return the exact field errors.

---

## Admin dashboard

- URL: `https://rishavprasad.in/admin/` (also works locally via `wrangler dev`).
- Sign-in: password only, hashed with PBKDF2-SHA256 (210,000 iterations). Sessions are HMAC-signed,
  `HttpOnly`, `SameSite=Strict`, `Secure` in production, and last 12 hours.
- Rate limit: 8 failed attempts per IP hash per 15 minutes; content saves are capped at 1 MB.
- Tabs: Profile, Education, Skills, Experience, Projects, Achievements, Resume, Messages, Media.
- Publish is disabled while edits are unsaved; **Save changes → Publish** is the workflow.
- Messages are stored in D1 (`contact_messages`). There is no email notification.
- Media uploads require R2; until it is enabled the dashboard explains the exact setup instead of
  failing silently. The same applies to replacing the resume PDF through the dashboard.

Admin secrets are **not** in source control and are not printed by the build. See
[DEPLOYMENT.md](DEPLOYMENT.md#3-set-production-secrets).

---

## Project structure

```
app/
  (site)/             public pages sharing the site layout
    page.tsx          home
    about/ education/ skills/ experience/
    projects/ achievements/ resume/ airshare/ contact/
  admin/page.tsx      private dashboard (noindex, client-rendered against the API)
  layout.tsx          fonts, metadata, JSON-LD, theme bootstrap
  globals.css         Summer Dream tokens, component and form classes
  robots.ts sitemap.ts not-found.tsx
components/site/      nav, footer, theme toggle, contact form, resume print, …
components/admin/     dashboard shell, section editors, form primitives
components/static-link.tsx   plain <a> wrapper (explained below)
lib/content.ts        typed view of content/published.json
lib/resume.ts         build-time PDF gate (static file or R2 /media/ URL)
lib/site.ts           identity, navigation, Turnstile site key
lib/icons.tsx         icon-name → lucide component map
content/published.json  build-time snapshot of the D1 document
worker/               Hono app, auth, schema validation, env bindings
migrations/           D1 SQL migrations
scripts/              fetch-content.mjs, hash-password.mjs
tests/                Vitest unit tests + Playwright E2E runner
airshare/             standalone LAN app (own package.json)
public/               images, resume PDF, NPTEL certificate, favicon
wrangler.jsonc        Worker, assets, D1 and route configuration
```

### Navigation uses plain anchors on purpose

`components/static-link.tsx` renders a normal `<a>` instead of `next/link`. In a static export the
client router asks the host for React Server Component payloads that the build does not emit,
which produced 404s in the browser console on every prefetch. Plain anchors make each navigation a
normal, cacheable page load. Use this `Link` for internal links; keep raw `<a>` for external URLs
and `mailto:`.

---

## Design system

| Token | Hex | Use |
|---|---|---|
| `--cerulean` | `#0081A7` | primary actions, headings |
| `--teal` | `#00AFB9` | highlights, gradients |
| `--cream` | `#FDFCDC` | page background |
| `--apricot` | `#FED9B7` | cards, decorative bands |
| `--coral` | `#F07167` | accents, key CTAs |

Light and dark mode share the accents; semantic variables (`--bg`, `--ink`, `--muted`, `--card`,
`--tint`) swap per theme. Component classes live in `@layer components`, so Tailwind utilities
always override them. Motion respects `prefers-reduced-motion`.

---

## Resume PDF gate

The `/resume/` page is the source of truth. A PDF is linked only when `resumePdf.approvedForPublish`
is `true` **and** the target exists:

- a file committed under `public/` (the current two-page A4 build, generated by printing `/resume/`
  to PDF), or
- an R2 object uploaded through **Admin → Resume**, which stores an `/media/...` URL.

`lib/resume.ts` resolves both at build time; with the flag false, no link renders at all. The older
phone-bearing PDFs are deliberately not in `public/`. The published resume contains the confirmed
email, no phone number, the 2024–2028 degree period and the 8.5 CGPA.

---

## Testing

```bash
npm run typecheck   # Next app + Worker (separate tsconfigs)
npm test            # 14 Vitest tests: schema, PBKDF2, sessions, SHA-256
npm run test:e2e    # 30 Playwright checks against a running stack
cd airshare && npm test   # 8 AirShare tests
```

The E2E runner covers every public route at 320 px and 1440 px (including horizontal-overflow
checks), the 404 route, `robots.txt`, `sitemap.xml`, `/api/health`, `/api/content`, the resume PDF
content type, contact-form fields, the admin gate, and — with `E2E_ADMIN_PASSWORD` — sign-in,
editing tabs, messages and sign-out, with zero uncaught page errors.

AirShare's suite covers static serving, two-client handshakes, text broadcast, a byte-identical
300 KB transfer, cancellation, sender-disconnect cleanup, oversized requests and unknown stream
ids. A physical two-device run (phone + laptop on the same Wi-Fi) is still an owner step.

---

## Deployment and security

- [DEPLOYMENT.md](DEPLOYMENT.md) — numbered setup, secrets, migrations, R2, publishing and
  troubleshooting.
- [SECURITY.md](SECURITY.md) — threat model, admin auth, contact data, headers and AirShare limits.

---

## Known limitations

- **AirShare is HTTP/WS on your LAN.** No authentication, no encryption; trusted networks only.
  It is not deployed on this domain and must not be exposed to the internet.
- **Contact messages live in D1** and are read from the admin dashboard; no email is sent.
- **R2 media is optional.** Until the bucket is created and the binding uncommented, media and
  dashboard PDF replacement return a clear 503.
- **Published content follows a rebuild**, not an instant write. The snapshot fetch makes deploys
  consistent, but the live site changes when CI finishes.
- **Three projects are listed**: two completed builds and the Online Examination and Proctoring
  System, which stays **In development** with no feature list, screenshots or links yet.
- **Awards** come from the supplied resume; competition certificates are not on file, so entries
  have no proof link. The NPTEL certificate is hosted under `public/certifications/`.
- **Skills** are the supplied set. The older resumes list C++, NumPy, Pandas, Scikit-learn, Git and
  GitHub; those were not added without confirmation.
- **Instagram** points to the personal account supplied, not a portfolio-only account.

---

## Roadmap

1. **Gate 1 — foundation** (done): scaffold, design system, navigation, home shell, deployment.
2. **Gate 2 — identity** (done): About, Education, Skills, leadership timeline, portraits, OG image.
3. **Gate 3 — record** (done): Projects, Achievements, Resume and a generated PDF.
4. **Gate 4 — editing** (done): Hono API on Workers, D1 content and messages, admin dashboard,
   Turnstile contact form, publish/rebuild, R2 media hooks.
5. **Gate 5 — AirShare** (done): standalone LAN app, tests and an accurate explainer page.
6. **Gate 6 — hardening** (done): Vitest, Playwright E2E, security/deploy docs, production checks.

## Needed from you

- Set the three admin/contact secrets and (optionally) `GITHUB_TOKEN` — commands in
  [DEPLOYMENT.md](DEPLOYMENT.md#3-set-production-secrets).
- Enable R2 from the Cloudflare dashboard if you want uploaded media and PDF replacement.
- Run AirShare on two real devices on the same Wi-Fi and confirm the checklist in
  `airshare/README.md`.
- **Skills**: confirm which of C++, NumPy, Pandas, Scikit-learn, Git and GitHub are current.
- **New projects / certifications / award proofs**: add them in the dashboard as they arrive.
