# Rishav Prasad — Portfolio & AirShare

Personal portfolio for **Rishav Prasad** — B.Tech Computer Science and Engineering student at
Cooch Behar Government Engineering College, software developer and student leader.

The site is a **fully static export** hosted on Cloudflare's free plan. A separate, optional
local-network file transfer app (**AirShare**) will live in `airshare/` and never affects the
public site.

**Status: Gate 1 of 6** — design system, navigation, home page and a production build. Remaining
gates add full content sections, the admin dashboard, and AirShare.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), static export (`output: "export"`) |
| UI | React 19, TypeScript, Tailwind CSS 4, lucide-react |
| Fonts | Fraunces (display) + Manrope (body), self-hosted via `next/font` |
| Hosting | Cloudflare Workers + Static Assets, free plan |
| CI/CD | GitHub Actions → `wrangler deploy` |
| Backend (Gate 4) | Hono on Workers + Cloudflare D1 + R2 |
| AirShare (Gate 5) | Standalone Node.js + WebSocket app on your LAN |

---

## Local development

Requirements: Node.js 24+, npm 11+.

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # TypeScript, no emit
```

Production build and local preview of the exact deployable output:

```bash
npm run build        # writes ./out
npm run preview      # serves ./out on http://localhost:4173
```

There is no `.env` needed for the static site. `SITE_URL` defaults to `https://rishavprasad.in`
and can be overridden for previews.

---

## Deployment (Cloudflare, free plan)

One-time setup:

```bash
# 1. Authenticate Wrangler with your Cloudflare account
npx wrangler login

# 2. Build and deploy (first deploy creates the Worker)
npm run build
npx wrangler deploy
```

`wrangler.jsonc` already contains:

- project name `rishav-portfolio`
- static assets directory `./out` (asset requests are free and unlimited)
- `404-page` handling (uses `out/404.html`)
- a custom-domain route for `rishavprasad.in`

The domain must be an active zone in the same Cloudflare account. Because the zone is already on
Cloudflare DNS, the custom domain and its certificate are attached automatically — no A record and
no manual SSL setup.

`www` is **not** redirected by the static asset config: Workers static assets only accept relative
rules in `_redirects`, and a cross-host rule fails with `Only relative URLs are allowed (100324)`.
Add the redirect in the dashboard instead (free plan):

1. Rules → Redirect Rules → Create rule
2. Request URL: `https://www.rishavprasad.in/*`
3. Target: `https://rishavprasad.in/${1}` (dynamic expression `concat("/", http.request.uri.path)`)
4. Status: `301`

If the `www` hostname is never used, skip this — nothing breaks.

### Automatic deploys from GitHub

```bash
git init
git add .
git commit -m "chore: gate 1 — design system and home shell"
git branch -M main
git remote add origin https://github.com/<your-username>/rishav-portfolio.git
git push -u origin main
```

Then add two repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token with **Workers Scripts: Edit** and **Account Settings: Read** |
| `CLOUDFLARE_ACCOUNT_ID` | Found in the Cloudflare dashboard sidebar |

`.github/workflows/deploy.yml` runs typecheck → build → deploy on every push to `main`, and can
also be triggered manually or by a `content-published` repository dispatch (used by the admin
dashboard in Gate 4).

---

## Project structure

```
app/
  (site)/            public pages sharing the site layout
    page.tsx         home
    about/ projects/ experience/ achievements/ resume/ airshare/ contact/
  layout.tsx         fonts, metadata, JSON-LD, theme bootstrap
  globals.css        Summer Dream tokens + component classes
  not-found.tsx      404 page
  sitemap.ts robots.ts
components/site/     nav, footer, theme toggle, typing roles, upcoming page
components/static-link.tsx  plain <a> wrapper (see note below)
lib/site.ts          site identity, navigation, focus areas
public/              favicon, _headers
wrangler.jsonc       Cloudflare configuration
```

## Design system

Exact palette, defined once in `app/globals.css`:

| Token | Hex | Use |
|---|---|---|
| `--cerulean` | `#0081A7` | primary actions, headings |
| `--teal` | `#00AFB9` | highlights, gradients |
| `--cream` | `#FDFCDC` | page background |
| `--apricot` | `#FED9B7` | cards, decorative bands |
| `--coral` | `#F07167` | accents, key CTAs |

Light and dark mode share the same accents; semantic variables (`--bg`, `--ink`, `--muted`,
`--card`, `--tint`) swap per theme. Component classes live in `@layer components`, so Tailwind
utilities always override them.

---

## Editing content (temporary)

Until the admin dashboard ships in Gate 4, site identity and navigation live in `lib/site.ts`.
Page copy lives in the corresponding `app/(site)/**/page.tsx`.

### Navigation uses plain anchors on purpose

`components/static-link.tsx` renders a normal `<a>` instead of `next/link`. In a static export the
client router asks the host for React Server Component payloads (for example
`/about/__next.*.__PAGE__.txt?_rsc=…`) that the build does not emit, which produced 404s in the
browser console on every prefetch. Plain anchors make each navigation a normal, cacheable page
load, which is what a mostly-static site wants. Use this `Link` for internal links; keep raw
`<a>` for external URLs and `mailto:`.

---

## Testing

- `npm run typecheck` — TypeScript
- `npm run build` — production static build
- Responsive checks were run in Chromium at 320, 375, 768 and 1440 px, plus dark mode, the mobile
  menu (open, link visibility, Escape to close) and the 404 route.
- Production was checked against the live domain at the edge (Chromium pinned to the Cloudflare
  address): `/`, every nav route, `/sitemap.xml`, `/robots.txt`, `/favicon.svg` all return 200, an
  unknown path returns 404 with the custom page, and the console and network panel are clean.

---

## Known limitations at this gate

- About, Projects, Experience, Achievements, Resume and AirShare are **explicitly labelled as in
  progress** — no fake content is presented as finished.
- `/education` and `/skills` are not routed yet; they arrive in Gate 2 along with the content.
- The portrait is a designed placeholder; no photograph has been supplied yet.
- No social links yet: handles were not provided, and inventing them would be wrong.
- No Open Graph image, admin dashboard, contact form backend or AirShare app yet (Gates 4–6).
- Content is edited in source until Gate 4.
- `www.rishavprasad.in` still points at an older deployment until the Redirect Rule above is added.

---

## Roadmap

1. **Gate 1 — foundation** (done): scaffold, design system, nav, home shell, deploy-ready build.
2. **Gate 2**: About with education timeline, `/education`, `/skills`, leadership experience.
3. **Gate 3**: Projects (search/filter/detail), achievements, resume.
4. **Gate 4**: Hono API on Workers, D1, admin dashboard, media uploads, contact form.
5. **Gate 5**: AirShare LAN app + public explainer page.
6. **Gate 6**: hardening, tests, full deployment documentation, production checklist.

## Needed from you

- Portrait photograph (square or portrait, ≥ 1200 px wide)
- Resume PDF
- GitHub, LinkedIn and Instagram profile URLs
- Project entries: name, description, stack, links, screenshots
- Any certifications/achievements with dates and files
