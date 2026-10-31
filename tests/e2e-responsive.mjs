// Responsive sweep: loads every public route at seven viewport widths and
// fails on horizontal overflow, undersized tap targets, missing images or
// uncaught page errors.
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:8787";
const WIDTHS = [320, 375, 425, 768, 1024, 1440, 1920];
const ROUTES = [
  "/",
  "/about/",
  "/education/",
  "/skills/",
  "/projects/",
  "/experience/",
  "/achievements/",
  "/resume/",
  "/contact/",
  "/airshare/",
  "/airshare/app/",
];

const failures = [];
const checks = [];

function ok(name) {
  checks.push({ name, ok: true });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  failures.push(`${name}: ${detail}`);
}

const browser = await chromium.launch();

for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const route of ROUTES) {
    const label = `${route} at ${width}px`;
    try {
      const response = await page.goto(`${BASE}${route}`, {
        // Turnstile keeps long-lived connections open on /contact/, so network
        // idle never settles there.
        waitUntil: "load",
        timeout: 30_000,
      });
      await page.waitForTimeout(400);
      if (!response || response.status() !== 200) {
        fail(label, `status ${response?.status() ?? "none"}`);
        continue;
      }

      // Next.js lazy-loads below-the-fold images, so walk the page first and
      // then wait for every image to settle before measuring.
      await page.evaluate(async () => {
        const height = document.body.scrollHeight;
        for (let y = 0; y < height; y += window.innerHeight * 0.8) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        window.scrollTo(0, 0);
        await new Promise((resolve) => setTimeout(resolve, 200));
      });
      await page
        .waitForFunction(() => [...document.images].every((image) => image.complete), null, {
          timeout: 5000,
        })
        .catch(() => undefined);

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const brokenImages = [...document.images]
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.getAttribute("src") ?? "(no src)");
        // Inline links inside running text are exempt from WCAG 2.2 target
        // size, so only controls that stand alone are measured.
        const controls = document.querySelectorAll(
          "button, select, textarea, summary, input:not([type=hidden]), a[role=button], a.btn",
        );
        const smallTargets = [...controls]
          .filter((element) => {
            const style = window.getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return rect.height < 24 || rect.width < 24;
          })
          .map((element) => {
            const text = (element.getAttribute("aria-label") ?? element.textContent ?? "")
              .trim()
              .replace(/\s+/g, " ")
              .slice(0, 40);
            return `${element.tagName.toLowerCase()}"${text}" h=${Math.round(
              element.getBoundingClientRect().height,
            )}`;
          });
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          brokenImages,
          smallTargets,
          title: document.title,
        };
      });

      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        fail(label, `horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
        continue;
      }
      if (metrics.brokenImages.length > 0) {
        fail(label, `broken images: ${metrics.brokenImages.join(", ")}`);
        continue;
      }
      if (!metrics.title) {
        fail(label, "empty document title");
        continue;
      }
      if (metrics.smallTargets.length > 0) {
        fail(label, `short tap targets: ${metrics.smallTargets.join(" | ")}`);
        continue;
      }
      ok(label);
    } catch (error) {
      fail(label, error.message.split("\n")[0]);
    }
  }

  if (errors.length > 0) {
    fail(`page errors at ${width}px`, errors.join(" | "));
  } else {
    ok(`no page errors at ${width}px`);
  }
  await context.close();
}

await browser.close();

for (const check of checks) {
  if (check.ok) console.log(`ok   ${check.name}`);
}
for (const message of failures) console.log(`FAIL ${message}`);

console.log(
  `\n${checks.filter((check) => check.ok).length} checks passed, ${failures.length} failed (${BASE})`,
);
process.exit(failures.length === 0 ? 0 : 1);
