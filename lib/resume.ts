import fs from "node:fs";
import path from "node:path";
import { resumePdf } from "@/lib/content";

export function getPublishedResume() {
  if (!resumePdf.approvedForPublish) return null;

  // Uploaded through the admin dashboard: served by the Worker from R2, so the
  // file is not part of the static export and its size is unknown at build time.
  if (resumePdf.href.startsWith("/media/")) {
    return { href: resumePdf.href, sizeLabel: null };
  }

  const filePath = path.join(process.cwd(), "public", resumePdf.href.replace(/^\/+/, ""));
  if (!fs.existsSync(filePath)) return null;

  const { size } = fs.statSync(filePath);
  return { href: resumePdf.href, sizeLabel: `${Math.max(1, Math.round(size / 1024))} KB` };
}
