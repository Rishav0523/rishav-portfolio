import type { Metadata } from "next";
import { Download, Eye, FileText, MapPin, Mail } from "lucide-react";
import EmptyState from "@/components/site/empty-state";
import PrintResume from "@/components/site/print-resume";
import SocialLinks from "@/components/site/social-links";
import {
  achievements,
  awards,
  certifications,
  education,
  leadership,
  projects,
  resumeSummary,
  skillGroups,
  socials,
} from "@/lib/content";
import { getPublishedResume } from "@/lib/resume";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "The current resume of Rishav Prasad — education, technical skills, leadership, projects and achievements, viewable on the page and printable to PDF.",
  alternates: { canonical: "/resume/" },
  openGraph: { url: "/resume/" },
};

const pdf = getPublishedResume();
const professionalProfile = socials
  .filter((social) => social.label !== "Instagram")
  .map((social) => social.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))
  .join(" · ");

export default function ResumePage() {
  return (
    <>
      <section className="resume-hero hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70 print-hide" aria-hidden />
        <div className="container-page relative pb-12 pt-12 md:pb-14 md:pt-16">
          <p className="eyebrow animate-rise">Resume</p>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="display animate-rise animate-rise-delay-1 text-[clamp(2.2rem,5.2vw,3.6rem)]">
                Rishav Prasad
              </h1>
              <p className="animate-rise animate-rise-delay-2 mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                B.Tech Computer Science and Engineering student · Software developer · Student leader
              </p>
            </div>

            <div className="flex flex-wrap gap-3 print-hide">
              <PrintResume />
              {pdf ? (
                <>
                  <a
                    href={pdf.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                    View PDF
                  </a>
                  <a href={pdf.href} download className="btn btn-outline">
                    <Download className="h-4 w-4" aria-hidden />
                    Download PDF{pdf.sizeLabel ? ` (${pdf.sizeLabel})` : ""}
                  </a>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center gap-2 font-medium text-[var(--link)] hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {site.email}
            </a>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden />
              {site.location}
            </span>
            <SocialLinks className="print-hide" />
          </div>
          <p className="mt-2 hidden text-xs text-[var(--muted)] print:block">{professionalProfile}</p>

          {pdf ? null : (
            <div className="mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--card)_55%,transparent)] px-5 py-4 print-hide">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[var(--coral)]" aria-hidden />
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                <span className="font-semibold text-[var(--ink)]">PDF not published yet.</span> The
                older PDF is out of date, so it stays private while this page is reviewed. Use{" "}
                <span className="font-semibold text-[var(--ink)]">Print / Save as PDF</span> for a
                current copy.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section border-t border-[var(--line)] pt-12 md:pt-14">
        <div className="container-page">
          <div className="resume-body mx-auto max-w-4xl">
            <section className="resume-row grid gap-3 py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Profile
              </h2>
              <p className="text-sm leading-relaxed text-[var(--ink)]">{resumeSummary}</p>
            </section>

            <section className="resume-row grid gap-4 border-t border-[var(--line)] py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Education
              </h2>
              <ol className="space-y-5">
                {education.map((entry) => (
                  <li key={entry.degree}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{entry.degree}</h3>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {entry.period}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{entry.institution}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {entry.score} {entry.scoreLabel}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="resume-row grid gap-4 border-t border-[var(--line)] py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Technical skills
              </h2>
              <div className="space-y-3">
                {skillGroups.map((group) => (
                  <div key={group.title} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <p className="text-sm font-semibold">{group.title}</p>
                    <p className="text-sm text-[var(--muted)]">{group.items.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="resume-row grid gap-4 border-t border-[var(--line)] py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Leadership
              </h2>
              <div className="space-y-5">
                {leadership.map((role) => (
                  <div key={role.role}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{role.role}</h3>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {role.period}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{role.org}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                      {role.summary}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="resume-row grid gap-4 border-t border-[var(--line)] py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Projects
              </h2>
              <div className="space-y-5">
                {projects.map((project) => (
                  <div key={project.slug}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{project.title}</h3>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {project.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{project.summary}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Stack: {project.stack.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="resume-row grid gap-4 border-t border-[var(--line)] py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Achievements
              </h2>
              <ul className="space-y-4">
                {achievements.map((item) => (
                  <li key={item.title}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {item.period}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.role} — {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="resume-row grid gap-4 border-t border-[var(--line)] py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Awards
              </h2>
              <ul className="space-y-3">
                {awards.map((award) => (
                  <li key={award.title}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{award.title}</h3>
                      {award.period ? (
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {award.period}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {award.result}
                      {award.team ? ` — ${award.team}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="resume-row grid gap-4 border-t border-[var(--line)] py-8 md:grid-cols-[11rem_1fr] md:gap-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                Certifications
              </h2>
              {certifications.length === 0 ? (
                <EmptyState icon={FileText} title="None listed yet">
                  Verified certifications will be added here with their issuer and date.
                </EmptyState>
              ) : (
                <ul className="space-y-3">
                  {certifications.map((certification) => (
                    <li key={`${certification.title}-${certification.issuer}`}>
                      <p className="font-semibold">{certification.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {certification.issuer} · {certification.year}
                        {certification.detail ? ` · ${certification.detail}` : ""}
                      </p>
                      {certification.href ? (
                        <a
                          href={certification.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="print-hide mt-1 inline-block text-sm font-semibold text-[var(--link)] hover:underline"
                        >
                          View certificate
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
