# Documentation

The complete documentation set for **rishavprasad.in**, the personal portfolio of Rishav Prasad.
It describes what the site does, how it is built and deployed, how it was tested, and what the
owner still needs to do.

Everything here was written against the implementation on **31 October 2026**. Where a feature
could not be verified, the documents say so rather than assuming it works.

## Documents

| File | Read it when you want to… |
|---|---|
| `01_User_Manual.pdf` | Use the public site, the contact form, the admin dashboard or AirShare. |
| `02_Technical_Specification.pdf` | Understand the architecture, data model, API, security model and design system. |
| `03_Cloudflare_Configuration_and_Change_Report.pdf` | See the account, zone, Worker, D1, secrets and DNS, and what changed in this engagement. |
| `04_Testing_and_Audit_Report.pdf` | See the 174 automated checks, the functional status matrix and the audit findings. |
| `05_Deployment_and_Recovery_Guide.pdf` | Deploy, back up, restore, roll back or diagnose a failure. |
| `06_File_Reference_and_Code_Modification_Guide.pdf` | Find a file and make a safe change to it. |
| `07_Project_Handover_Checklist.pdf` | Accept the handover: accounts, credentials, acceptance test, open items, sign-off. |

Supporting references in this folder:

| File | Purpose |
|---|---|
| `README.md` | This index and the rebuild instructions. |
| `API_DOCUMENTATION.md` | Every endpoint, its payloads, limits and error responses. |
| `ARCHITECTURE.md` | How the pieces fit together and why. |
| `PROJECT_STRUCTURE.md` | Directory and route map of the repository. |
| `CHANGELOG.md` | Dated history of the work in this engagement. |

Repository-level files remain the quick reference for day-to-day work: `README.md`,
`DEPLOYMENT.md` and `SECURITY.md` at the root.

## Rebuilding the PDFs

The PDFs are generated from hand-written HTML in `source/`, paginated by a small Playwright script
and printed by Chromium. Page numbers, the table of contents and running headers are computed at
build time, so always rebuild after editing a source file.

Requirements: Node.js 24 and the repository's installed dependencies (Playwright ships Chromium).

```bash
cd documentation/source
node build-pdfs.mjs                     # all seven documents
node build-pdfs.mjs --only=05           # one document
node build-pdfs.mjs --only=05 --preview # first four pages as PNGs in preview/
node build-pdfs.mjs --only=05 --preview-all
```

The build fails if a document's printed page count does not match the paginator's count, or if a
document is shorter than five pages.

### Source layout

- `source/0N-*.html` — one file per document: metadata block, sections, tables and SVG figures.
- `source/docs.css` — print styles, palette and typography. Fonts are embedded at build time.
- `source/paginate.js` — deterministic A4 paginator. A `<div class="pb">` forces a page break;
  tables continue across pages with a repeated header.
- `source/build-pdfs.mjs` — embeds fonts and screenshots, prints and verifies each PDF.
- `source/screenshots/` — production captures used inside the documents.

## State at handover

- Public site, API, contact form and deployment pipeline verified against production.
- 174 automated checks executed, none failed; both TypeScript configurations pass.
- Admin sign-in still depends on the owner's stored hash encoding exactly 100,000 iterations.
- A physical two-phone AirShare transfer after the IPv6 fixes has not been confirmed.
- The full database export is private; a sanitized export is committed under `backups/`.

Open items and their owners are listed in document 07, section 7.

## Credentials

No secret, token or password appears anywhere in this folder, its sources or its PDFs. Secret names
are documented; secret values live only in Cloudflare Worker settings, GitHub Actions secrets and
the git-ignored `.dev.vars` file.
