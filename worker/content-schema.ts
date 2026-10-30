import type {
  Achievement,
  Award,
  Certification,
  ContentDoc,
  EducationEntry,
  IconKey,
  JourneyEntry,
  LeadershipRole,
  ProfileFact,
  Project,
  SkillGroup,
  SocialLink,
} from "../lib/content";

const ICONS: IconKey[] = [
  "code",
  "globe",
  "database",
  "shield",
  "brain",
  "rocket",
  "terminal",
  "megaphone",
  "lightbulb",
  "newspaper",
];

const SOCIAL_LABELS = ["GitHub", "LinkedIn", "Instagram"];
const PROJECT_STATUS = ["In development", "Completed", "Shipped"];
const ACHIEVEMENT_CATEGORIES = ["Leadership", "Event organising"];

export const LIMITS = {
  projects: 50,
  awards: 100,
  achievements: 50,
  certifications: 100,
  leadership: 20,
  education: 10,
  skillGroups: 20,
  domains: 30,
  journey: 30,
  profileFacts: 12,
  socials: 6,
  points: 12,
  documentBytes: 512 * 1024,
};

class Checker {
  errors: string[] = [];

  fail(path: string, message: string) {
    if (this.errors.length < 25) this.errors.push(`${path}: ${message}`);
    return "";
  }

  str(value: unknown, path: string, max: number, required = true): string {
    if (value === undefined && !required) return "";
    if (typeof value !== "string") return this.fail(path, "must be a string");
    const trimmed = value.trim();
    if (required && trimmed.length === 0) return this.fail(path, "is required");
    if (trimmed.length > max) return this.fail(path, `must be ${max} characters or fewer`);
    return trimmed;
  }

  optionalStr(value: unknown, path: string, max: number): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    return this.str(value, path, max, false);
  }

  list<T>(
    value: unknown,
    path: string,
    max: number,
    build: (item: unknown, itemPath: string) => T,
  ): T[] {
    if (!Array.isArray(value)) {
      this.fail(path, "must be an array");
      return [];
    }
    if (value.length > max) {
      this.fail(path, `must contain at most ${max} entries`);
      return [];
    }
    return value.map((item, index) => build(item, `${path}[${index}]`));
  }

  strings(value: unknown, path: string, max: number, maxItems: number): string[] {
    if (!Array.isArray(value)) {
      this.fail(path, "must be an array of strings");
      return [];
    }
    if (value.length > maxItems) {
      this.fail(path, `must contain at most ${maxItems} entries`);
    }
    return value.slice(0, maxItems).map((item, index) => this.str(item, `${path}[${index}]`, max));
  }

  href(value: unknown, path: string): string {
    const href = this.str(value, path, 500);
    if (!href) return "";
    if (!href.startsWith("/") && !/^https?:\/\//i.test(href)) {
      return this.fail(path, "must be a relative path or an http(s) URL");
    }
    return href;
  }

  icon(value: unknown, path: string): IconKey {
    const icon = this.str(value, path, 30) as IconKey;
    if (!ICONS.includes(icon)) this.fail(path, "is not a known icon");
    return icon;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateContent(input: unknown): { ok: true; doc: ContentDoc } | { ok: false; errors: string[] } {
  if (!isRecord(input)) return { ok: false, errors: ["document: must be an object"] };
  const c = new Checker();

  const socials = c.list<SocialLink>(input.socials, "socials", LIMITS.socials, (item, path) => {
    const s = isRecord(item) ? item : {};
    const label = c.str(s.label, `${path}.label`, 20);
    if (!SOCIAL_LABELS.includes(label)) c.fail(`${path}.label`, "must be GitHub, LinkedIn or Instagram");
    return {
      label: label as SocialLink["label"],
      handle: c.str(s.handle, `${path}.handle`, 80),
      href: c.href(s.href, `${path}.href`),
    };
  });

  const education = c.list<EducationEntry>(input.education, "education", LIMITS.education, (item, path) => {
    const e = isRecord(item) ? item : {};
    return {
      degree: c.str(e.degree, `${path}.degree`, 160),
      institution: c.str(e.institution, `${path}.institution`, 160),
      period: c.str(e.period, `${path}.period`, 60),
      board: c.optionalStr(e.board, `${path}.board`, 160),
      score: c.str(e.score, `${path}.score`, 40),
      scoreLabel: c.str(e.scoreLabel, `${path}.scoreLabel`, 60),
      location: c.str(e.location, `${path}.location`, 100),
      notes: c.strings(e.notes, `${path}.notes`, 240, 6),
      current: e.current === true ? true : undefined,
    };
  });

  const skillGroups = c.list<SkillGroup>(input.skillGroups, "skillGroups", LIMITS.skillGroups, (item, path) => {
    const s = isRecord(item) ? item : {};
    return {
      title: c.str(s.title, `${path}.title`, 80),
      icon: c.icon(s.icon, `${path}.icon`),
      description: c.str(s.description, `${path}.description`, 300),
      items: c.strings(s.items, `${path}.items`, 60, 20),
    };
  });

  const domains = c.strings(input.domains, "domains", 80, LIMITS.domains);

  const leadership = c.list<LeadershipRole>(input.leadership, "leadership", LIMITS.leadership, (item, path) => {
    const l = isRecord(item) ? item : {};
    return {
      role: c.str(l.role, `${path}.role`, 120),
      org: c.str(l.org, `${path}.org`, 200),
      period: c.str(l.period, `${path}.period`, 60),
      icon: c.icon(l.icon, `${path}.icon`),
      summary: c.str(l.summary, `${path}.summary`, 600),
      points: c.strings(l.points, `${path}.points`, 300, LIMITS.points),
    };
  });

  const journey = c.list<JourneyEntry>(input.journey, "journey", LIMITS.journey, (item, path) => {
    const j = isRecord(item) ? item : {};
    return {
      year: c.str(j.year, `${path}.year`, 10),
      title: c.str(j.title, `${path}.title`, 120),
      detail: c.str(j.detail, `${path}.detail`, 300),
    };
  });

  const seenSlugs = new Set<string>();
  const projects = c.list<Project>(input.projects, "projects", LIMITS.projects, (item, path) => {
    const p = isRecord(item) ? item : {};
    const slug = c.str(p.slug, `${path}.slug`, 80);
    if (!/^[a-z0-9-]+$/.test(slug)) c.fail(`${path}.slug`, "must use lowercase letters, numbers and hyphens");
    if (seenSlugs.has(slug)) c.fail(`${path}.slug`, "must be unique");
    seenSlugs.add(slug);
    const status = c.str(p.status, `${path}.status`, 30);
    if (!PROJECT_STATUS.includes(status)) c.fail(`${path}.status`, "is not a valid status");
    const links = Array.isArray(p.links)
      ? c.list(p.links, `${path}.links`, 6, (link, linkPath) => {
          const l = isRecord(link) ? link : {};
          return {
            label: c.str(l.label, `${linkPath}.label`, 40),
            href: c.href(l.href, `${linkPath}.href`),
          };
        })
      : undefined;
    return {
      slug,
      title: c.str(p.title, `${path}.title`, 160),
      status: status as Project["status"],
      summary: c.str(p.summary, `${path}.summary`, 400),
      detail: c.str(p.detail, `${path}.detail`, 1200),
      stack: c.strings(p.stack, `${path}.stack`, 40, 15),
      links: links && links.length > 0 ? links : undefined,
    };
  });

  const achievements = c.list<Achievement>(
    input.achievements,
    "achievements",
    LIMITS.achievements,
    (item, path) => {
      const a = isRecord(item) ? item : {};
      const category = c.str(a.category, `${path}.category`, 40);
      if (!ACHIEVEMENT_CATEGORIES.includes(category)) {
        c.fail(`${path}.category`, "must be Leadership or Event organising");
      }
      return {
        title: c.str(a.title, `${path}.title`, 160),
        category: category as Achievement["category"],
        role: c.str(a.role, `${path}.role`, 120),
        period: c.str(a.period, `${path}.period`, 60),
        detail: c.str(a.detail, `${path}.detail`, 600),
      };
    },
  );

  const awards = c.list<Award>(input.awards, "awards", LIMITS.awards, (item, path) => {
    const a = isRecord(item) ? item : {};
    return {
      title: c.str(a.title, `${path}.title`, 160),
      result: c.str(a.result, `${path}.result`, 40),
      period: c.optionalStr(a.period, `${path}.period`, 40),
      team: c.optionalStr(a.team, `${path}.team`, 80),
    };
  });

  const certifications = c.list<Certification>(
    input.certifications,
    "certifications",
    LIMITS.certifications,
    (item, path) => {
      const cert = isRecord(item) ? item : {};
      return {
        title: c.str(cert.title, `${path}.title`, 200),
        issuer: c.str(cert.issuer, `${path}.issuer`, 120),
        year: c.str(cert.year, `${path}.year`, 20),
        detail: c.optionalStr(cert.detail, `${path}.detail`, 200),
        href:
          cert.href === undefined || cert.href === ""
            ? undefined
            : c.href(cert.href, `${path}.href`),
      };
    },
  );

  const resumeSummary = c.str(input.resumeSummary, "resumeSummary", 2000);
  const resumeInput = isRecord(input.resumePdf) ? input.resumePdf : {};
  const resumePdf = {
    href: c.href(resumeInput.href, "resumePdf.href"),
    approvedForPublish: resumeInput.approvedForPublish === true,
  };

  const profileFacts = c.list<ProfileFact>(
    input.profileFacts,
    "profileFacts",
    LIMITS.profileFacts,
    (item, path) => {
      const f = isRecord(item) ? item : {};
      return {
        label: c.str(f.label, `${path}.label`, 40),
        value: c.str(f.value, `${path}.value`, 120),
      };
    },
  );

  if (c.errors.length > 0) return { ok: false, errors: c.errors };

  const doc: ContentDoc = {
    version: 1,
    socials,
    education,
    skillGroups,
    domains,
    leadership,
    journey,
    projects,
    achievements,
    awards,
    certifications,
    resumeSummary,
    resumePdf,
    profileFacts,
  };

  const size = new TextEncoder().encode(JSON.stringify(doc)).byteLength;
  if (size > LIMITS.documentBytes) {
    return { ok: false, errors: ["document: exceeds the 512 KB limit"] };
  }
  return { ok: true, doc };
}
