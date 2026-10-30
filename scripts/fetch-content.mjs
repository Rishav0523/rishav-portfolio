#!/usr/bin/env node
// Refreshes content/published.json from the live content API before a build.
// The committed snapshot stays in git; this file is the only thing that changes.
// Skips locally unless CONTENT_API_URL or CI is set. Set CONTENT_FETCH_STRICT=1
// in CI so a broken API fails the build instead of deploying stale content.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "content", "published.json");
const strict = process.env.CONTENT_FETCH_STRICT === "1";
const baseUrl = (process.env.CONTENT_API_URL ?? process.env.SITE_URL ?? "").replace(/\/+$/, "");

const ARRAYS = [
  "socials",
  "education",
  "skillGroups",
  "domains",
  "leadership",
  "journey",
  "projects",
  "achievements",
  "awards",
  "certifications",
  "profileFacts",
];

function fail(message) {
  if (strict) {
    console.error(`content-fetch: ${message}`);
    process.exit(1);
  }
  console.warn(`content-fetch: ${message} — keeping the committed snapshot.`);
  process.exit(0);
}

if (!baseUrl) {
  console.log("content-fetch: no CONTENT_API_URL/SITE_URL set — keeping the committed snapshot.");
  process.exit(0);
}

const url = `${baseUrl}/api/content`;
let document;
try {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "rishav-portfolio-build" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) fail(`${url} returned HTTP ${response.status}.`);
  document = await response.json();
} catch (error) {
  fail(`${url} could not be fetched (${error instanceof Error ? error.message : "unknown error"}).`);
}

if (!document || typeof document !== "object" || document.version !== 1) {
  fail("response is not a version 1 content document.");
}
for (const key of ARRAYS) {
  if (!Array.isArray(document[key])) fail(`response.${key} is not an array.`);
}
if (!document.resumePdf || typeof document.resumePdf.href !== "string") {
  fail("response.resumePdf is missing.");
}

const serialized = `${JSON.stringify(document, null, 2)}\n`;

let current = "";
try {
  current = await readFile(target, "utf8");
} catch {
  // A missing snapshot is fine; it will be written below.
}

if (current === serialized) {
  console.log("content-fetch: snapshot is already up to date.");
  process.exit(0);
}

await writeFile(target, serialized, "utf8");
console.log(`content-fetch: updated content/published.json from ${url}.`);
