// Captures the screenshots used by the documentation PDFs.
// Usage: node documentation/source/capture.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = process.env.CAPTURE_BASE ?? "http://127.0.0.1:8787";
const OUT = fileURLToPath(new URL("./screenshots/", import.meta.url));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, path, { width = 1280, height = 800, dark = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: dark ? "dark" : "light",
  });
  if (dark) {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    });
  }
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await context.close();
  console.log(`captured ${name}.png`);
}

await shot("home", "/");
await shot("home-dark", "/", { dark: true });
await shot("about", "/about/");
await shot("education", "/education/");
await shot("skills", "/skills/");
await shot("projects", "/projects/");
await shot("experience", "/experience/");
await shot("achievements", "/achievements/");
await shot("resume", "/resume/");
await shot("airshare-guide", "/airshare/");
await shot("airshare-app", "/airshare/app/");
await shot("contact", "/contact/");
await shot("not-found", "/this-page-does-not-exist/");
await shot("admin-login", "/admin/");
await shot("home-mobile", "/", { width: 375, height: 812 });
await shot("contact-mobile", "/contact/", { width: 375, height: 812 });
await shot("airshare-app-mobile", "/airshare/app/", { width: 375, height: 812 });

await browser.close();
