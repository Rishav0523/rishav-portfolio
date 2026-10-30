import { describe, expect, it } from "vitest";
import snapshot from "../content/published.json";
import { validateContent } from "../worker/content-schema";

function clone() {
  return structuredClone(snapshot) as Record<string, unknown>;
}

describe("validateContent", () => {
  it("accepts the committed content snapshot", () => {
    const result = validateContent(clone());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.version).toBe(1);
    expect(result.doc.projects.length).toBe(3);
    expect(result.doc.leadership.length).toBe(5);
    expect(result.doc.awards.length).toBeGreaterThan(0);
    expect(result.doc.resumePdf.approvedForPublish).toBe(true);
  });

  it("trims strings and drops empty optional fields", () => {
    const doc = clone();
    const awards = doc.awards as Record<string, unknown>[];
    awards[0].title = "  Winner  ";
    awards[0].period = "";
    const result = validateContent(doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.awards[0].title).toBe("Winner");
    expect(result.doc.awards[0].period).toBeUndefined();
  });

  it("rejects duplicate project slugs", () => {
    const doc = clone();
    const projects = doc.projects as Record<string, unknown>[];
    projects[1].slug = projects[0].slug;
    const result = validateContent(doc);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain("must be unique");
  });

  it("rejects unknown icons and unsafe hrefs", () => {
    const doc = clone();
    const skills = doc.skillGroups as Record<string, unknown>[];
    skills[0].icon = "skull";
    const socials = doc.socials as Record<string, unknown>[];
    socials[0].href = "javascript:alert(1)";
    const result = validateContent(doc);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const joined = result.errors.join(" ");
    expect(joined).toContain("known icon");
    expect(joined).toContain("relative path");
  });

  it("rejects over-long entries and missing required fields", () => {
    const doc = clone();
    const projects = doc.projects as Record<string, unknown>[];
    projects[0].title = "x".repeat(200);
    const awards = doc.awards as Record<string, unknown>[];
    awards[0].result = "";
    const result = validateContent(doc);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain("characters or fewer");
    expect(result.errors.join(" ")).toContain("is required");
  });

  it("rejects non-object input", () => {
    expect(validateContent(null).ok).toBe(false);
    expect(validateContent([]).ok).toBe(false);
    expect(validateContent("content").ok).toBe(false);
  });
});
