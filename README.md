# Rishav Prasad — Portfolio & AirShare

Personal portfolio for **Rishav Prasad** — B.Tech Computer Science and Engineering student at
Cooch Behar Government Engineering College, software developer and student leader.

The site is a **fully static export** hosted on Cloudflare's free plan. A separate, optional
local-network file transfer app (**AirShare**) will live in `airshare/` and never affects the
public site.

**Status: Gate 3 of 6** — design system, navigation, home page, live deployment to
`https://rishavprasad.in` with auto-deploy from `main`, the identity layer (About, Education, Skills,
Experience), and the working record: Projects, Achievements & Certifications, and a printable
Resume. Remaining gates add the admin dashboard and AirShare.

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

`www` **is** redirected, via a dashboard rule rather than `_redirects`: Workers static assets only
accept relative destinations there, and a cross-host rule fails with `Only relative URLs are
allowed (100324)`. The live configuration is:

1. Rules → Redirect Rules → `www` to apex
2. Request URL: `https://www.rishavprasad.in/*`
3. Target: `https://rishavprasad.in/${1}` (dynamic expression `concat("/", http.request.uri.path)`)
4. Status: `301`, preserve query string

Verified: `/about/` → `https://rishavprasad.in/about/`, and `?q=test` survives the hop.

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
| `CLOUDFLARE_API_TOKEN` | From the **Edit Cloudflare Workers** template, with Zone Resources scoped to `rishavprasad.in` |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID shown by `npx wrangler whoami` |

The workflow runs the Wrangler pinned in `package-lock.json` (not a version bundled by an action),
so CI uses the exact binary that works locally. If a step fails, Wrangler's output is written to the
run summary.

`.github/workflows/deploy.yml` runs typecheck → build → deploy on every push to `main`, and can
also be triggered manually or by a `content-published` repository dispatch (used by the admin
dashboard in Gate 4).

---

## Project structure

```
app/
  (site)/            public pages sharing the site layout
    page.tsx         home
    about/           portrait, bio, principles, journey timeline
    education/       B.Tech + two CBSE board results
    skills/          skill groups and areas of interest
    experience/      leadership timeline
    projects/        real projects with their status (one in development)
    achievements/    leadership/event achievements; awards and certifications
    resume/          on-page resume, print/save as PDF, gated PDF download
    airshare/ contact/
  layout.tsx         fonts, metadata, JSON-LD, theme bootstrap
  globals.css        Summer Dream tokens + component classes
  not-found.tsx      404 page
  sitemap.ts robots.ts
components/site/     nav, footer, theme toggle, typing roles, timeline,
                     social links/icons, empty state, print button, upcoming page
components/static-link.tsx  plain <a> wrapper (see note below)
lib/site.ts          site identity, navigation, focus areas
lib/content.ts       education, skills, leadership, journey, socials, projects,
                     achievements, certifications, resume copy and PDF gate
lib/resume.ts        build-time check for an approved PDF
lib/icons.tsx        icon-name → lucide component map
public/images/       portrait.jpg + about-portrait.jpg (1200×1500), og.jpg (1200×630)
public/resume/       approved PDF goes here (intentionally empty)
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

Until the admin dashboard ships in Gate 4, content is edited in source:

- **`lib/content.ts`** — the single factual source for education entries, skill groups, areas of
  interest, leadership roles, the journey timeline, profile facts, social URLs, projects,
  achievements, certifications and the resume summary. Every page reads from it, so one edit updates
  all of them together.
- **`lib/site.ts`** — identity, navigation and focus areas.
- **`app/(site)/**/page.tsx`** — page-specific headings and prose.

Education results, CGPA and leadership contributions are stored exactly as supplied; proficiency
percentages are deliberately not modelled, and the Skills page says so.

Two photographs are used, deliberately different per page: `portrait.jpg` (hilltop, cropped tighter
so the figure fills the hero) on the home page, and `about-portrait.jpg` (indoor portrait) on
`/about/`. Both are 4:5 crops re-encoded at 1200×1500 from the 3000×4000 originals.
`og.jpg` is a 1200×630 share card from the hilltop shoot. Replace all three if the photos change.

### Resume PDF publication gate

The /resume/ page always renders the current resume from `lib/content.ts` and can be printed to PDF.
A downloadable PDF is published only when **both** conditions hold:

1. `public/resume/rishav-prasad-resume.pdf` exists;
2. `resumePdf.approvedForPublish` is `true` in `lib/content.ts`.

`lib/resume.ts` checks both at build time, so an unapproved file cannot leak: with the flag false no
link is rendered at all. The earlier PDFs are reference documents and are deliberately **not** in
`public/`. To publish a new export: replace the file, flip the flag, commit, and the deploy adds
View/Download buttons with the file size.

### Resume data review (Gate 3 input)

Two older PDFs were supplied as reference only. Nothing from them was published. Where they agree
with the site they add nothing; where they disagree, the site keeps the information you supplied
later. Items still waiting on your decision:

| Field | Old PDF | Site now | Status |
|---|---|---|---|
| Email | `prasadrishav959@gmail.com` | `rishav81cse@gmail.com` | **Needs confirmation** |
| Phone | `+91 747 905 9885` | not published | Needs permission |
| Degree period | 2023 – 2027 | 2024 – 2028 (expected) | Site value is the correction |
| CGPA | 8.49 | 8.5 | Confirm rounding |
| E-Cell / Tech-O-Nicks dates | 2025 | 2026 | Site value is the correction |
| IIC, CGEC Times roles | listed | not published | Supply details if current |
| Projects (old set) | several completed builds | only the in-development proctoring system | Not published without your go-ahead |
| Awards | medals and rankings | none | Not published: no verified source supplied |
| Skills | wider list | supplied set only | Add any missing skills you want shown |

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
- `npm run build` — production static build (14 routes at this gate)
- Responsive checks were run in Chromium at 320, 375, 425, 768, 1024, 1280, 1440 and 1920 px across
  `/`, `/about/`, `/education/`, `/skills/`, `/experience/`, `/projects/`, `/achievements/` and
  `/resume/`: horizontal overflow is zero at every width, and the desktop nav only appears at
  ≥1280 px.
- Gate 3 checks: with the PDF gate closed there are **no** `.pdf` links in the DOM on `/resume/`; the
  page prints to a 2-page A4 document with the nav, footer, actions and notice removed; the
  projects/achievements pages render their empty states when their arrays are empty.
- Dark mode, the mobile menu (open, link visibility, Escape to close), the 404 route, and the
  portrait asset (`naturalWidth 1200`) were checked in the same pass. Screenshots are taken with
  `animations: "disabled"`, because the entrance animations use `fill: both` and otherwise capture
  mid-fade even when computed styles report full opacity.
- Production was checked against the live domain at the edge (Chromium pinned to the Cloudflare
  address): `/`, every nav route, `/sitemap.xml`, `/robots.txt`, `/favicon.svg` all return 200, an
  unknown path returns 404 with the custom page, and the console and network panel are clean.
- CI was verified end to end: pushing to `main` ran typecheck, build and `wrangler deploy`, and the
  resulting Worker version replaced the previous one on the custom domain.

---

## Known limitations at this gate

- AirShare and Contact are **explicitly labelled as in progress** — no fake content is presented as
  finished.
- The admin dashboard, contact form backend and AirShare app arrive in Gates 4–6; content is edited
  in source until then.
- One project is listed, marked **In development**; its backend and final details are not settled,
  so it has no feature list, screenshots or links yet.
- No awards or certifications are published: the supplied older resumes mention competition results
  and courses, but none are listed until their certificates or official results are confirmed.
- No resume PDF is downloadable yet; the outdated PDFs stay out of `public/` until a current export
  is approved.
- The resume page's contact block uses the site email and location, not the phone number or the
  second email address found in the older PDFs; those remain unpublished.
- Social links point to public profiles; the Instagram handle is the personal account supplied, not
  a portfolio-only account.
- Motion is global: `prefers-reduced-motion` collapses every animation and transition to ~0 ms and
  stops the typing loop on "Software Developer", so the page renders fully static for those users.
- D1, R2 and Cloudflare Access are not provisioned; nothing in the static site depends on them.

---

## Roadmap

1. **Gate 1 — foundation** (done): scaffold, design system, nav, home shell, deploy-ready build.
2. **Gate 2 — identity** (done): About, `/education`, `/skills`, leadership timeline, portrait, OG
   image and social profiles.
3. **Gate 3 — record** (done): `/projects`, `/achievements`, `/resume` built from supplied facts,
   empty states for missing records, on-page resume with Print / Save as PDF, PDF publication gate.
4. **Gate 4**: Hono API on Workers, D1, admin dashboard (CRUD for projects, achievements,
   certifications, resume), media uploads (R2), contact form.
5. **Gate 5**: AirShare LAN app + public explainer page.
6. **Gate 6**: hardening, tests, full deployment documentation, production checklist.

## Needed from you

- **Resume PDF**: replace the outdated file, then set `approvedForPublish: true` in `lib/content.ts`.
  Until then `/resume/` offers Print / Save as PDF only.
- **Projects**: name, one-line summary, description, stack, links and screenshots for each new
  project — add them to the `projects` array.
- **Certifications**: title, issuer, year and, if you want it linked, the public certificate URL.
- **Awards**: only verified ones, with the issuing body and date.
- Confirmation of the two contradictory contact details found in the old PDFs (see "Resume data
  review" above).
