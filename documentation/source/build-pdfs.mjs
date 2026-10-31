import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..");
const previewDir = path.join(here, "preview");

const DOCS = [
  ["01-user-manual.html", "01_User_Manual.pdf"],
  ["02-technical-specification.html", "02_Technical_Specification.pdf"],
  ["03-cloudflare-configuration.html", "03_Cloudflare_Configuration_and_Change_Report.pdf"],
  ["04-testing-and-audit.html", "04_Testing_and_Audit_Report.pdf"],
  ["05-deployment-and-recovery.html", "05_Deployment_and_Recovery_Guide.pdf"],
  ["06-file-reference.html", "06_File_Reference_and_Code_Modification_Guide.pdf"],
  ["07-handover-checklist.html", "07_Project_Handover_Checklist.pdf"],
];

const only = process.argv.find((arg) => arg.startsWith("--only="))?.split("=")[1];
const preview = process.argv.includes("--preview");
const previewAll = process.argv.includes("--preview-all");

const css = fs
  .readFileSync(path.join(here, "docs.css"), "utf8")
  .replace(/url\("fonts\/([^"]+)"\)/g, (_, file) => {
    const bytes = fs.readFileSync(path.join(here, "fonts", file));
    return `url("data:font/woff2;base64,${bytes.toString("base64")}")`;
  });

const script = fs.readFileSync(path.join(here, "paginate.js"), "utf8");

function embedImages(html) {
  return html.replace(/src="(screenshots\/[^"]+)"/g, (_, relative) => {
    const file = path.join(here, relative);
    if (!fs.existsSync(file)) throw new Error(`Missing screenshot: ${relative}`);
    return `src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}"`;
  });
}

function countPdfPages(buffer) {
  const text = buffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page(?![s])/g);
  return matches ? matches.length : 0;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
const results = [];

for (const [source, pdfName] of DOCS) {
  if (only && !source.startsWith(only)) continue;
  const htmlPath = path.join(here, source);
  if (!fs.existsSync(htmlPath)) {
    console.log(`skip  ${source} (not written yet)`);
    continue;
  }

  let html = fs.readFileSync(htmlPath, "utf8");
  html = embedImages(html);
  html = html.replace("</head>", `<style>${css}</style></head>`);
  html = html.replace("</body>", `<script>${script}</script></body>`);

  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
      ),
    );
  });

  const layout = await page.evaluate(() => window.__paginate());
  await page.waitForTimeout(120);

  const pdf = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    displayHeaderFooter: false,
  });

  const pdfPath = path.join(outDir, pdfName);
  fs.writeFileSync(pdfPath, pdf);
  const counted = countPdfPages(pdf);
  const status = counted === layout.pages ? "ok" : "MISMATCH";

  if (preview || previewAll) {
    fs.mkdirSync(previewDir, { recursive: true });
    const stem = path.basename(pdfName, ".pdf");
    const pagesToShoot = previewAll
      ? Array.from({ length: layout.pages }, (_, index) => index + 1)
      : [1, 2, 3, 4];
    for (const n of pagesToShoot) {
      const handle = await page.$(`.page[data-page="${n}"]`);
      if (!handle) continue;
      await handle.screenshot({ path: path.join(previewDir, `${stem}-p${n}.png`) });
    }
  }

  results.push({
    doc: pdfName,
    pages: layout.pages,
    counted,
    sections: layout.sections,
    kib: Math.round(pdf.length / 1024),
    status,
  });
  console.log(
    `${status.padEnd(8)} ${pdfName.padEnd(52)} ${String(layout.pages).padStart(3)} pages  ${Math.round(
      pdf.length / 1024,
    )} KiB`,
  );
}

await browser.close();

if (results.some((result) => result.status !== "ok" || result.pages < 5)) {
  console.error("One or more documents failed verification.");
  process.exitCode = 1;
}
