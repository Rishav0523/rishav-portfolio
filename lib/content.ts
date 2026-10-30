import data from "../content/published.json";

// Icon names are stored as data so the admin API can validate them without
// importing the React icon map.
export type IconKey =
  | "code"
  | "globe"
  | "database"
  | "shield"
  | "brain"
  | "rocket"
  | "terminal"
  | "megaphone"
  | "lightbulb"
  | "newspaper";

export type SocialLabel = "GitHub" | "LinkedIn" | "Instagram";

export type SocialLink = {
  label: SocialLabel;
  handle: string;
  href: string;
};

export type EducationEntry = {
  degree: string;
  institution: string;
  period: string;
  board?: string;
  score: string;
  scoreLabel: string;
  location: string;
  notes: string[];
  current?: boolean;
};

export type SkillGroup = {
  title: string;
  icon: IconKey;
  description: string;
  items: string[];
};

export type LeadershipRole = {
  role: string;
  org: string;
  period: string;
  icon: IconKey;
  summary: string;
  points: string[];
};

export type JourneyEntry = {
  year: string;
  title: string;
  detail: string;
};

export type ProjectStatus = "In development" | "Completed" | "Shipped";

export type Project = {
  slug: string;
  title: string;
  status: ProjectStatus;
  summary: string;
  detail: string;
  stack: string[];
  links?: { label: string; href: string }[];
};

export type Achievement = {
  title: string;
  category: "Leadership" | "Event organising";
  role: string;
  period: string;
  detail: string;
};

export type Award = {
  title: string;
  result: string;
  period?: string;
  team?: string;
};

export type Certification = {
  title: string;
  issuer: string;
  year: string;
  detail?: string;
  href?: string;
};

export type ProfileFact = {
  label: string;
  value: string;
};

export type ContentDoc = {
  version: number;
  socials: SocialLink[];
  education: EducationEntry[];
  skillGroups: SkillGroup[];
  domains: string[];
  leadership: LeadershipRole[];
  journey: JourneyEntry[];
  projects: Project[];
  achievements: Achievement[];
  awards: Award[];
  certifications: Certification[];
  resumeSummary: string;
  resumePdf: { href: string; approvedForPublish: boolean };
  profileFacts: ProfileFact[];
};

// The committed snapshot in content/published.json is the build-time copy.
// scripts/fetch-content.mjs refreshes it from the live API before CI builds.
export const defaultContent = data as ContentDoc;

export const socials = defaultContent.socials;
export const education = defaultContent.education;
export const skillGroups = defaultContent.skillGroups;
export const domains = defaultContent.domains;
export const leadership = defaultContent.leadership;
export const journey = defaultContent.journey;
export const projects = defaultContent.projects;
export const achievements = defaultContent.achievements;
export const awards = defaultContent.awards;
export const certifications = defaultContent.certifications;
export const resumeSummary = defaultContent.resumeSummary;
export const resumePdf = defaultContent.resumePdf;
export const profileFacts = defaultContent.profileFacts;
