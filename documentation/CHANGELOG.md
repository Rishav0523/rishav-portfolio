# Changelog

All dates are UTC. Entries up to `8c9ea09` correspond to commits on `main`; every push to `main`
deploys through GitHub Actions. This file records what changed and why, not every intermediate edit.

## [1.0.0] — 31 October 2026 — Documentation and handover

- Added the seven-PDF documentation set, the five markdown references and this changelog under
  `documentation/`.
- Added `.env.example` with every variable name used by the build and the Worker, and no values.
- Added a sanitized D1 export at `backups/schema-and-content-2026-10-31.sql`; the full export stays
  out of the repository.
- Documented the deployment, backup, restore and rollback procedures used in this engagement.
- No application code changed in the documentation commit. Application behaviour is unchanged since `8c9ea09`; the docs commit was deployed as Worker version `a9f14486` on 31 October 2026 at 08:33 UTC.
- Recorded open owner actions: regenerate the admin hash if it still encodes 210,000 iterations,
  enable Always Use HTTPS, remove the unused Turnstile-shaped secret, and confirm a two-phone
  AirShare transfer.

## 31 October 2026

### Fixed

- `8c9ea09` — Allowed `static.cloudflareinsights.com` and `cloudflareinsights.com` in the CSP
  (`script-src`, `connect-src`). The Cloudflare Web Analytics beacon was blocked; collection is
  still unconfirmed because no beacon appeared in the served HTML.
- `01faae7` — Hardened response headers and the admin read paths found in the security audit.
  Admin `GET /api/admin/content` is now strict: a D1 or validation failure returns 503 instead of
  serving defaults that a later save would publish over real content.
- `7c37911` — Hid the resume upload control when R2 is unavailable and pointed the page at the
  repository-hosted PDF. R2 is not enabled, so uploads returned 503 and the form was a dead end.
- `605ca6c` — Documented setting `ADMIN_PASSWORD_HASH` without a pipe. Piping a script that can
  fail into `wrangler secret put` stored an empty secret that still reported as configured.
- `5f71a29` — Fixed admin sign-in by hashing at the Workers PBKDF2 ceiling (100,000 iterations).
  A 210,000-iteration hash threw at runtime and surfaced as "Something went wrong"; the verifier now
  rejects any higher count before derivation, and a regression test covers it.
- `c7e333b` — Accepted peer-reflexive ICE candidates on phone Wi-Fi.
- `572219a` — Accepted phone Wi-Fi connections that use global IPv6 addresses.

### Added

- `40f93a4` — Browser AirShare: PIN-gated rooms, D1 signaling, direct WebRTC transfer, 64 KB
  chunks, 100 MB cap, 8 peers per room, 90-second presence TTL.
- `c07770b` — Responsive test coverage for the AirShare app route.

### Changed

- `cf3f95e` — CI applies D1 migrations manually rather than on every deploy.

## 30 October 2026

- `d957bcf` — Gate 6: security hardening, 40 unit tests, Node and Playwright suites, deployment
  documentation.
- `509d8b1` — Gate 5: LAN-only AirShare explainer and the optional standalone Node.js tool.
- `478ed7d` — Gate 4: Hono Worker, D1-backed content, contact form with Turnstile, admin
  dashboard, publish via `repository_dispatch`.
- `5c917ad` — Published the confirmed contact details, awards, projects and the NPTEL certificate.
- `e491354` — Gate 3: projects, achievements and resume built only from supplied facts; resume
  approved for publication by the owner.
- `656561d` — Corrected the B.Tech start year to 2024.
- `7dda27b` — Used distinct portraits per page and updated graduation to 2028.
- `cba908a` — Gate 2: identity, education and leadership content.
- `9c95313` — CI deploys with pinned Wrangler and surfaces failures.
- `3e0c3ec` — Gate 1: design system, layout shell and home page.

## Known state at 1.0.0

Not defects introduced by this documentation pass, but unresolved at handover:

- Admin sign-in requires the stored hash to encode exactly 100,000 iterations.
- R2 is disabled; media and resume uploads intentionally return 503.
- AirShare's two-physical-phone path is unconfirmed after the IPv6 fixes.
- Web Analytics collection is unconfirmed.
- Firefox, Safari, iOS and Android were not part of the automated responsive sweep.

See `documentation/07_Project_Handover_Checklist.pdf`, section 7, for the owner actions and the
acceptance test that closes them.
