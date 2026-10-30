# Deployment

Everything below is for the Cloudflare account that serves `rishavprasad.in`. Commands run from the
repository root in Git Bash (PowerShell works too unless noted).

## What is already provisioned

| Item | Value / state |
|---|---|
| Worker | `rishav-portfolio`, custom domain `rishavprasad.in` |
| Static assets | `./out`, `run_worker_first` for `/api/*` and `/media/*` |
| D1 database | `rishav-portfolio`, id `e3c63392-6892-402f-8bdd-70b379fbc664`, migrations `0001_init.sql` and `0002_airshare.sql` applied |
| Turnstile widget | `rishav-portfolio contact`, sitekey `0x4AAAAAAFtJIYt…` (full key in `lib/site.ts`), domains `rishavprasad.in`, `www.rishavprasad.in`, `localhost` |
| CI | `.github/workflows/deploy.yml` deploys on push, manual run, and `content-published` dispatch |
| GitHub secrets | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| R2 | **not enabled** — media endpoints return 503 until step 5 |

The Worker is deployed and `/api/health` reports `{"ok":true,"database":"ok"}`. Admin and contact
return 503 with a clear message until the secrets in step 3 are set.

---

## 1. Prerequisites

```bash
node --version   # 24+
npm install
npx wrangler login
npx wrangler whoami   # confirm the right account
```

## 2. Apply database migrations

```bash
npx wrangler d1 migrations apply rishav-portfolio --remote
```

Run this **manually after any new file is added to `migrations/`**, before deploying code that uses
the new schema. The command is idempotent; already-applied migrations are skipped. CI does not run
it because the deploy token is scoped to Workers and static assets.

## 3. Set production secrets

Run these once. Values are stored by Cloudflare and never committed; `.dev.vars` is local-only.

### 3.1 Session signing key

```bash
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" \
  | npx wrangler secret put SESSION_SECRET
```

Rotating this value signs every admin session out immediately.

### 3.2 Turnstile secret

1. Cloudflare dashboard → **Turnstile** → widget `rishav-portfolio contact`.
2. Copy the **secret key**.
3. Store it:

```bash
npx wrangler secret put TURNSTILE_SECRET
# paste the secret when prompted
```

Do not reuse the sitekey as the secret. The sitekey is public and lives in `lib/site.ts`.

### 3.3 Admin password hash

Pick a long, unique password (16+ characters; do not reuse any other password):

```bash
node scripts/hash-password.mjs "<your password>" | npx wrangler secret put ADMIN_PASSWORD_HASH
```

The script prints only `pbkdf2_sha256$210000$<salt>$<hash>`; the plaintext never touches disk. If
the shell records the command in history, clear that entry afterwards (`history -d <n>` in Bash).
To change the password later, repeat this command with a new password. To force every session out,
rotate `SESSION_SECRET` as well.

### 3.4 Publish token (optional, needed for the Publish button)

Create a **fine-grained personal access token**: GitHub → Settings → Developer settings → Personal
access tokens → Fine-grained tokens.

- Repository access: only `Rishav0523/rishav-portfolio`.
- Permissions: **Contents → Read and write** (repository dispatch), plus metadata read.
- Expiration: 90 days or shorter; set a reminder to rotate.

```bash
npx wrangler secret put GITHUB_TOKEN
```

`GITHUB_REPO=Rishav0523/rishav-portfolio` is already a plain variable in `wrangler.jsonc`. Until the
token exists, **Publish** returns a 503 naming the missing secret.

### 3.5 Verify

```bash
curl -s https://rishavprasad.in/api/admin/session       # {"error":"Not signed in."} with 401
curl -s -X POST https://rishavprasad.in/api/contact \
  -H 'Content-Type: application/json' -d '{}'           # validation error, not 503
```

Open `https://rishavprasad.in/admin/`, sign in, make a harmless edit, **Save changes**, then
**Publish**. A new `deploy` run appears in GitHub Actions and the site updates when it finishes.

## 4. Enable R2 media (optional)

R2 has a free tier but must be enabled on the account:

1. Dashboard → **R2** → enable R2 (payment method on file; free allowances still apply).
2. Create the bucket:

```bash
npx wrangler r2 bucket create rishav-portfolio-media
```

3. In `wrangler.jsonc`, uncomment:

```jsonc
"r2_buckets": [{ "binding": "MEDIA", "bucket_name": "rishav-portfolio-media" }]
```

4. Commit, push (or `npx wrangler deploy`). Verify:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://rishavprasad.in/media/missing    # 404, not 503
```

Media is served through the Worker with immutable caching; the bucket never needs to be public.
Uploads are limited to JPEG/PNG/WebP/GIF at 5 MB and PDF resumes at 5 MB.

## 5. Static site and Worker deploys

```bash
npm run typecheck
npm run build
npx wrangler deploy
```

`npm run build` runs `scripts/fetch-content.mjs` first. Locally it keeps the committed snapshot;
in CI (`CI=true` or `CONTENT_API_URL` set) it fetches `/api/content` and **fails the build** if the
API is unreachable, so a broken API cannot silently ship stale content.

### CI

`.github/workflows/deploy.yml`:

1. `npm ci`
2. `npm run typecheck` (app + Worker)
3. `npm run build` with `SITE_URL` and `CONTENT_FETCH_STRICT=1`
4. `npx wrangler whoami`
5. `npx wrangler deploy`
6. On failure, Wrangler output is written to the run summary

The `CLOUDFLARE_API_TOKEN` needs **Workers Scripts: Edit** (and route access to the zone). D1
migrations are manual by design (step 2). Trigger a deploy by pushing to `main`, running the
workflow manually, or using **Publish** in the admin dashboard.

### Domain

`wrangler.jsonc` attaches `rishavprasad.in` as a custom domain; the zone must be active in the same
account. `www` redirects to the apex through a dashboard **Redirect Rule** (`301`, preserve query),
not `_redirects`, because Workers static assets only accept relative destinations there.

### AirShare after a deploy

`/airshare/app/` uses `/api/airshare/*` and the D1 tables from `0002_airshare.sql`; it needs no
secret or extra binding. After deploying:

1. Open `https://rishavprasad.in/airshare/app/` and create a room. A PIN should appear.
2. Run the automated check against production (read-only apart from its own room):

   ```bash
   E2E_BASE=https://rishavprasad.in npm run test:e2e:airshare
   ```

3. On two real devices on the same Wi-Fi, join with the same PIN and confirm "Connected on this
   Wi-Fi" on both, then send a file in each direction.

## 6. Local full-stack development

```bash
npx wrangler d1 migrations apply rishav-portfolio --local   # once
npx wrangler dev --port 8787
```

`.dev.vars` (git-ignored) must contain:

```
TURNSTILE_SECRET=...
SESSION_SECRET=...
ADMIN_PASSWORD_HASH=pbkdf2_sha256$210000$...
```

The local admin password is separate from production. Generate a hash with the same script and keep
the password out of git. `GITHUB_TOKEN` is optional locally; without it Publish returns 503.

Turnstile widgets are bound to specific hostnames. `localhost` is allowed; `127.0.0.1` is not, so
use `http://localhost:8787` when testing the widget locally.

## 7. Rollback

```bash
npx wrangler deployments list
npx wrangler rollback <version-id>
```

Rolling back reverts both the Worker and the static assets attached to that version. Content in D1
is **not** versioned; if a content change caused a problem, edit it in the dashboard, save, and
publish again.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Admin page says "Admin is not configured yet" | `ADMIN_PASSWORD_HASH` or `SESSION_SECRET` missing; run step 3 |
| Contact returns 503 "not configured" | `TURNSTILE_SECRET` missing |
| Contact returns "Verification failed" | Secret does not match the widget sitekey, or the hostname is not in the widget's domain list |
| Login returns 429 | 8 failed attempts per IP hash in 15 minutes; wait or rotate the password |
| Publish returns 503 | `GITHUB_TOKEN` missing, expired, or missing Contents write on the repo |
| Publish returns 202 but nothing deploys | Check the Actions tab; the `content-published` run may have failed at build (API unreachable) or deploy |
| Media/uploads return 503 | R2 not enabled or `MEDIA` binding commented out; see step 4 |
| `wrangler d1 migrations apply` fails in CI | Expected: migrations are manual. Run them locally with `--remote` |
| Site shows old content after Publish | The build fetches `/api/content`; confirm the save succeeded and the workflow finished |
| 404 on `/api/...` | API paths must not have a trailing slash (the router is strict) |

## Checks before calling a deploy done

- [ ] `npm run typecheck` and `npm test` pass
- [ ] `npm run build` succeeds and `out/404.html` exists
- [ ] `curl -s https://rishavprasad.in/api/health` → `database: "ok"`
- [ ] Every public route returns 200; an unknown path returns 404
- [ ] Admin sign-in works and **Save → Publish** produces a green workflow
- [ ] Contact form accepts one real message and it appears under Admin → Messages
- [ ] The resume link opens the current PDF (no phone number, 8.5 CGPA)
- [ ] `robots.txt` disallows `/admin` and `/api/`
