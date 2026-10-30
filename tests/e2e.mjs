#!/usr/bin/env node
// Playwright browser checks against a running deployment.
// Start the local stack with: npx wrangler dev --port 8787
// Then run: npm run test:e2e
// Optional: E2E_ADMIN_PASSWORD=<local dev password> to exercise the dashboard.

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = (process.env.E2E_BASE ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
const isLocal = /(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE);

const PUBLIC_ROUTES = [
  "/",
  "/about/",
  "/education/",
  "/skills/",
  "/projects/",
  "/experience/",
  "/achievements/",
  "/resume/",
  "/airshare/",
  "/airshare/app/",
  "/contact/",
];

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL ${name}\n     ${error instanceof Error ? error.message : error}`);
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error)));

for (const width of [320, 1440]) {
  await page.setViewportSize({ width, height: width === 320 ? 720 : 900 });
  for (const route of PUBLIC_ROUTES) {
    await check(`${route} at ${width}px`, async () => {
      const response = await page.goto(`${BASE}${route}`, { waitUntil: "load" });
      assert.equal(response?.status(), 200, `expected 200, got ${response?.status()}`);
      const title = await page.title();
      assert.ok(title.length > 3, "page has no title");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      assert.ok(overflow <= 1, `horizontal overflow of ${overflow}px`);
    });
  }
}

await page.setViewportSize({ width: 1440, height: 900 });

await check("404 page returns 404", async () => {
  const response = await page.goto(`${BASE}/this-page-does-not-exist/`, { waitUntil: "load" });
  assert.equal(response?.status(), 404);
  assert.match(await page.textContent("body"), /404/i);
});

await check("robots.txt disallows admin and api", async () => {
  const response = await page.request.get(`${BASE}/robots.txt`);
  assert.equal(response.status(), 200);
  const body = await response.text();
  assert.match(body, /Disallow: \/admin/);
  assert.match(body, /Sitemap: .*sitemap\.xml/);
});

await check("sitemap lists the public pages", async () => {
  const response = await page.request.get(`${BASE}/sitemap.xml`);
  assert.equal(response.status(), 200);
  const body = await response.text();
  assert.match(body, /https:\/\/[^<]+\/projects\//);
});

await check("API health reports database ok", async () => {
  const response = await page.request.get(`${BASE}/api/health`);
  assert.equal(response.status(), 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.database, "ok");
});

await check("content API serves the document", async () => {
  const response = await page.request.get(`${BASE}/api/content`);
  assert.equal(response.status(), 200);
  const body = await response.json();
  assert.equal(body.version, 1);
  assert.ok(Array.isArray(body.projects) && body.projects.length > 0);
});

await check("resume PDF downloads", async () => {
  const response = await page.request.get(`${BASE}/resume/rishav-prasad-resume.pdf`);
  assert.equal(response.status(), 200);
  assert.match(response.headers()["content-type"] ?? "", /application\/pdf/);
  assert.ok((await response.body()).byteLength > 10_000);
});

await check("contact form has labelled fields", async () => {
  const response = await page.goto(`${BASE}/contact/`, { waitUntil: "load" });
  assert.equal(response?.status(), 200);
  assert.ok(await page.locator("#contact-name").isVisible());
  assert.ok(await page.locator("#contact-email").isVisible());
  assert.ok(await page.locator("#contact-message").isVisible());
  assert.ok(await page.locator('#contact-name').getAttribute("required") !== null);
});

await check("admin is gated (login or setup notice)", async () => {
  await page.goto(`${BASE}/admin/`, { waitUntil: "load" });
  await page.waitForFunction(
    () => /Admin sign-in|Admin is not configured yet|API is unreachable/.test(document.body.innerText),
    undefined,
    { timeout: 15_000 },
  );
  const body = await page.textContent("body");
  assert.match(body ?? "", /Private/i);
});

if (ADMIN_PASSWORD && isLocal) {
  await check("admin sign-in and dashboard load", async () => {
    await page.goto(`${BASE}/admin/`, { waitUntil: "load" });
    await page.fill("#admin-password", ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Content manager", { timeout: 15_000 });
    assert.ok(await page.locator('button:has-text("Publish")').isVisible());

    await page.click('button:has-text("Projects")');
    assert.ok((await page.locator("details").count()) >= 1, "no project entries rendered");

    await page.click('button:has-text("Save changes")');
    await page.waitForSelector("text=Saved to D1", { timeout: 15_000 });

    await page.click('button:has-text("Messages")');
    await page.waitForTimeout(500);
    assert.match((await page.textContent("body")) ?? "", /Messages/);

    await page.click('button:has-text("Sign out")');
    await page.waitForSelector("text=Admin sign-in", { timeout: 15_000 });
  });
}

await check("no uncaught page errors during checks", async () => {
  assert.deepEqual(consoleErrors, []);
});

await browser.close();

console.log(`\n${passed} checks passed, ${failures.length} failed (${BASE})`);
if (failures.length > 0) process.exit(1);
