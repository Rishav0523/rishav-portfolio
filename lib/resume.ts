import fs from "node:fs";
import path from "node:path";
import { resumePdf } from "@/lib/content";

export function getPublishedResume() {
  if (!resumePdf.approvedForPublish) return null;

  const filePath = path.join(process.cwd(), "public", resumePdf.href.replace(/^\/+/, ""));
  if (!fs.existsSync(filePath)) return null;

  const { size } = fs.statSync(filePath);
  return { href: resumePdf.href, sizeLabel: `${Math.max(1, Math.round(size / 1024))} KB` };
}
