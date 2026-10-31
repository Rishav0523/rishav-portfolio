import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

const routes = [
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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "monthly" : "yearly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
