#!/usr/bin/env node
// Two-browser AirShare check. Start the local stack first:
//   npx wrangler dev --port 8787
// Then run:
//   npm run test:e2e:airshare

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = (process.env.E2E_BASE ?? "http://127.0.0.1:8787").replace(/\/+$/, "");

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
const alphaContext = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1280, height: 1000 },
});
const bravoContext = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1280, height: 1000 },
});
const alpha = await alphaContext.newPage();
const bravo = await bravoContext.newPage();
alpha.setDefaultTimeout(30_000);
bravo.setDefaultTimeout(30_000);

const pageErrors = [];
for (const [label, page] of [
  ["alpha", alpha],
  ["bravo", bravo],
]) {
  page.on("pageerror", (error) => pageErrors.push(`${label}: ${String(error)}`));
}

const PIN_SELECTOR = '[data-testid="airshare-room-pin"]';
const STATUS_SELECTOR = '[data-testid="airshare-status"]';
let pin = "";

async function waitForConnected(page) {
  await page.waitForFunction(
    (selector) => {
      const element = document.querySelector(selector);
      return element?.textContent?.includes("Connected on this Wi-Fi") ?? false;
    },
    STATUS_SELECTOR,
    { timeout: 45_000 },
  );
}

await check("a room is created with a generated 8-digit PIN", async () => {
  const response = await alpha.goto(`${BASE}/airshare/app/`, { waitUntil: "load" });
  assert.equal(response?.status(), 200, `expected 200, got ${response?.status()}`);
  await alpha.fill('[data-testid="airshare-name"]', "Alpha laptop");
  await alpha.click('[data-testid="airshare-create"]');
  await alpha.waitForSelector(PIN_SELECTOR, { timeout: 15_000 });
  pin = ((await alpha.textContent(PIN_SELECTOR)) ?? "").trim();
  assert.match(pin, /^\d{8}$/);
});

await check("a malformed PIN is rejected by the API", async () => {
  const response = await alpha.request.post(`${BASE}/api/airshare/join`, {
    data: { pin: "12345", peerId: "peerInvalid0001", name: "Bad PIN" },
  });
  assert.equal(response.status(), 400);
});

await check("the second device joins the same room with the PIN", async () => {
  const response = await bravo.goto(`${BASE}/airshare/app/`, { waitUntil: "load" });
  assert.equal(response?.status(), 200);
  await bravo.fill('[data-testid="airshare-name"]', "Bravo phone");
  await bravo.getByRole("tab", { name: "Join with a PIN" }).click();
  await bravo.fill('[data-testid="airshare-pin-input"]', pin);
  await bravo.click('[data-testid="airshare-join"]');
  await bravo.waitForSelector(PIN_SELECTOR);
  assert.equal(((await bravo.textContent(PIN_SELECTOR)) ?? "").trim(), pin);
});

await check("both devices see each other", async () => {
  await alpha.waitForSelector('[data-testid="airshare-peer"]:has-text("Bravo phone")');
  await bravo.waitForSelector('[data-testid="airshare-peer"]:has-text("Alpha laptop")');
});

await check("both browsers report a direct local connection", async () => {
  await waitForConnected(alpha);
  await waitForConnected(bravo);
});

await check("a message crosses the connection", async () => {
  await alpha.fill('input[aria-label="Message"]', "hello over the lan");
  await alpha.click('button[aria-label="Send message"]');
  await bravo.waitForSelector("text=hello over the lan", { timeout: 15_000 });
});

const fileName = "airshare-e2e.txt";
const fileBuffer = Buffer.from("AirShare end-to-end test\n".repeat(5_000), "utf8");

await check("a file arrives byte-for-byte", async () => {
  await alpha.setInputFiles('[data-testid="airshare-file"]', {
    name: fileName,
    mimeType: "text/plain",
    buffer: fileBuffer,
  });
  await bravo.waitForSelector('[data-testid="airshare-accept"]', { timeout: 20_000 });
  await bravo.click('[data-testid="airshare-accept"]');
  await bravo.waitForSelector('[data-testid="airshare-save"]', { timeout: 30_000 });

  const downloadName = await bravo.getAttribute('[data-testid="airshare-save"]', "download");
  assert.equal(downloadName, fileName);

  const received = await bravo.evaluate(async () => {
    const link = document.querySelector('[data-testid="airshare-save"]');
    if (!(link instanceof HTMLAnchorElement)) throw new Error("save link missing");
    const response = await fetch(link.href);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  assert.equal(received.length, fileBuffer.length);
  assert.equal(Buffer.from(received).toString("utf8"), fileBuffer.toString("utf8"));
});

await check("leaving removes the device from the room", async () => {
  await alpha.click('button:has-text("Leave room")');
  await alpha.waitForSelector('[data-testid="airshare-create"]');
  await bravo.waitForFunction(
    () => document.querySelector('[data-testid="airshare-peer"]') === null,
    undefined,
    { timeout: 20_000 },
  );
});

await check("no uncaught page errors", async () => {
  assert.deepEqual(pageErrors, []);
});

await browser.close();

console.log(`\n${passed} checks passed, ${failures.length} failed (${BASE})`);
if (failures.length > 0) process.exit(1);
