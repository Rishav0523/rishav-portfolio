"use client";

import type { ContentDoc } from "@/lib/content";
import { EntryList, LinesInput, TextArea } from "./fields";

export type Patch = <K extends keyof ContentDoc>(key: K, value: ContentDoc[K]) => void;

type EditorProps = { doc: ContentDoc; patch: Patch };

const ICONS = [
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
] as const;
const SOCIAL_LABELS = ["GitHub", "LinkedIn", "Instagram"] as const;
const PROJECT_STATUS = ["In development", "Completed", "Shipped"] as const;
const ACHIEVEMENT_CATEGORIES = ["Leadership", "Event organising"] as const;

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="display text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

export function ProfileEditor({ doc, patch }: EditorProps) {
  return (
    <div>
      <SectionIntro
        title="Profile"
        description="Resume summary, focus domains, social profiles and factual details."
      />
      <div className="grid gap-5">
        <TextArea
          label="Resume summary"
          value={doc.resumeSummary}
          onChange={(value) => patch("resumeSummary", value)}
          rows={5}
        />
        <LinesInput
          label="Focus domains"
          hint="One domain per line. Shown on the skills page and home page."
          value={doc.domains}
          onChange={(value) => patch("domains", value)}
        />

        <div>
          <h3 className="mb-2 text-sm font-semibold">Social profiles</h3>
          <EntryList
            entries={doc.socials}
            itemTitle={(entry) => entry.label}
            addLabel="Add social profile"
            emptyText="No social profiles yet."
            createEntry={() => ({ label: "GitHub" as const, handle: "", href: "https://" })}
            onChange={(value) => patch("socials", value)}
            fields={[
              { key: "label", label: "Platform", kind: "select", options: SOCIAL_LABELS },
              { key: "handle", label: "Handle", kind: "text" },
              { key: "href", label: "URL", kind: "text", full: true },
            ]}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Profile facts</h3>
          <EntryList
            entries={doc.profileFacts}
            itemTitle={(entry) => `${entry.label}: ${entry.value}`}
            addLabel="Add fact"
            emptyText="No profile facts yet."
            createEntry={() => ({ label: "", value: "" })}
            onChange={(value) => patch("profileFacts", value)}
            fields={[
              { key: "label", label: "Label", kind: "text" },
              { key: "value", label: "Value", kind: "text" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export function EducationEditor({ doc, patch }: EditorProps) {
  return (
    <div>
      <SectionIntro title="Education" description="Degrees, institutions, scores and notes." />
      <EntryList
        entries={doc.education}
        itemTitle={(entry) => entry.degree}
        addLabel="Add education entry"
        emptyText="No education entries yet."
        createEntry={() => ({
          degree: "",
          institution: "",
          period: "",
          score: "",
          scoreLabel: "",
          location: "",
          notes: [],
          current: false,
        })}
        onChange={(value) => patch("education", value)}
        fields={[
          { key: "degree", label: "Degree", kind: "text" },
          { key: "institution", label: "Institution", kind: "text" },
          { key: "period", label: "Period", kind: "text", placeholder: "2024 – 2028" },
          { key: "board", label: "Board / affiliation", kind: "text", optional: true },
          { key: "score", label: "Score", kind: "text", placeholder: "8.5" },
          { key: "scoreLabel", label: "Score label", kind: "text", placeholder: "CGPA" },
          { key: "location", label: "Location", kind: "text" },
          { key: "current", label: "Currently studying here", kind: "checkbox" },
          { key: "notes", label: "Notes", kind: "lines" },
        ]}
      />
    </div>
  );
}

export function SkillsEditor({ doc, patch }: EditorProps) {
  return (
    <div>
      <SectionIntro title="Skills" description="Grouped technical skills with their icons." />
      <EntryList
        entries={doc.skillGroups}
        itemTitle={(entry) => entry.title}
        addLabel="Add skill group"
        emptyText="No skill groups yet."
        createEntry={() => ({ title: "", icon: "code" as const, description: "", items: [] })}
        onChange={(value) => patch("skillGroups", value)}
        fields={[
          { key: "title", label: "Title", kind: "text" },
          { key: "icon", label: "Icon", kind: "select", options: ICONS },
          { key: "description", label: "Description", kind: "area" },
          { key: "items", label: "Skills", kind: "lines" },
        ]}
      />
    </div>
  );
}

export function ExperienceEditor({ doc, patch }: EditorProps) {
  return (
    <div className="grid gap-8">
      <div>
        <SectionIntro
          title="Leadership & roles"
          description="Positions of responsibility shown on the experience page."
        />
        <EntryList
          entries={doc.leadership}
          itemTitle={(entry) => `${entry.role} · ${entry.org}`}
          addLabel="Add role"
          emptyText="No roles yet."
          createEntry={() => ({
            role: "",
            org: "",
            period: "",
            icon: "megaphone" as const,
            summary: "",
            points: [],
          })}
          onChange={(value) => patch("leadership", value)}
          fields={[
            { key: "role", label: "Role", kind: "text" },
            { key: "org", label: "Organisation", kind: "text" },
            { key: "period", label: "Period", kind: "text" },
            { key: "icon", label: "Icon", kind: "select", options: ICONS },
            { key: "summary", label: "Summary", kind: "area" },
            { key: "points", label: "Responsibilities", kind: "lines" },
          ]}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Journey timeline</h3>
        <EntryList
          entries={doc.journey}
          itemTitle={(entry) => `${entry.year} · ${entry.title}`}
          addLabel="Add journey entry"
          emptyText="No journey entries yet."
          createEntry={() => ({ year: "", title: "", detail: "" })}
          onChange={(value) => patch("journey", value)}
          fields={[
            { key: "year", label: "Year", kind: "text" },
            { key: "title", label: "Title", kind: "text" },
            { key: "detail", label: "Detail", kind: "area" },
          ]}
        />
      </div>
    </div>
  );
}

export function ProjectsEditor({ doc, patch }: EditorProps) {
  return (
    <div>
      <SectionIntro title="Projects" description="Project cards, details, stacks and links." />
      <EntryList
        entries={doc.projects}
        itemTitle={(entry) => entry.title}
        addLabel="Add project"
        emptyText="No projects yet."
        createEntry={() => ({
          slug: "",
          title: "",
          status: "In development" as const,
          summary: "",
          detail: "",
          stack: [],
          links: [],
        })}
        onChange={(value) => patch("projects", value)}
        fields={[
          { key: "title", label: "Title", kind: "text" },
          { key: "slug", label: "Slug", kind: "text", placeholder: "lowercase-with-hyphens" },
          { key: "status", label: "Status", kind: "select", options: PROJECT_STATUS },
          { key: "summary", label: "Summary", kind: "area" },
          { key: "detail", label: "Detail", kind: "area" },
          { key: "stack", label: "Stack", kind: "lines" },
          { key: "links", label: "Links", kind: "links", optional: true },
        ]}
      />
    </div>
  );
}

export function AchievementsEditor({ doc, patch }: EditorProps) {
  return (
    <div className="grid gap-8">
      <div>
        <SectionIntro title="Achievements" description="Leadership and event-organising records." />
        <EntryList
          entries={doc.achievements}
          itemTitle={(entry) => entry.title}
          addLabel="Add achievement"
          emptyText="No achievements yet."
          createEntry={() => ({
            title: "",
            category: "Leadership" as const,
            role: "",
            period: "",
            detail: "",
          })}
          onChange={(value) => patch("achievements", value)}
          fields={[
            { key: "title", label: "Title", kind: "text" },
            { key: "category", label: "Category", kind: "select", options: ACHIEVEMENT_CATEGORIES },
            { key: "role", label: "Role", kind: "text" },
            { key: "period", label: "Period", kind: "text" },
            { key: "detail", label: "Detail", kind: "area" },
          ]}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Awards</h3>
        <EntryList
          entries={doc.awards}
          itemTitle={(entry) => `${entry.title} · ${entry.result}`}
          addLabel="Add award"
          emptyText="No awards yet."
          createEntry={() => ({ title: "", result: "", period: "", team: "" })}
          onChange={(value) => patch("awards", value)}
          fields={[
            { key: "title", label: "Award / event", kind: "text" },
            { key: "result", label: "Result", kind: "text", placeholder: "Winner" },
            { key: "period", label: "Period", kind: "text", optional: true },
            { key: "team", label: "Team / context", kind: "text", optional: true },
          ]}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Certifications</h3>
        <EntryList
          entries={doc.certifications}
          itemTitle={(entry) => entry.title}
          addLabel="Add certification"
          emptyText="No certifications yet."
          createEntry={() => ({ title: "", issuer: "", year: "" })}
          onChange={(value) => patch("certifications", value)}
          fields={[
            { key: "title", label: "Title", kind: "text" },
            { key: "issuer", label: "Issuer", kind: "text" },
            { key: "year", label: "Year", kind: "text" },
            { key: "detail", label: "Detail", kind: "text", optional: true },
            { key: "href", label: "Certificate URL or path", kind: "text", optional: true },
          ]}
        />
      </div>
    </div>
  );
}
