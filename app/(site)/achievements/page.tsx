import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowUpRight, Award, BadgeCheck, CalendarDays, Trophy } from "lucide-react";
import EmptyState from "@/components/site/empty-state";
import { achievements, awards, certifications } from "@/lib/content";

export const metadata: Metadata = {
  title: "Achievements & certifications",
  description:
    "Awards, leadership, event-organising achievements and verified certifications of Rishav Prasad. Only entries with real, checkable results are listed.",
  alternates: { canonical: "/achievements/" },
  openGraph: { url: "/achievements/" },
};

export default function AchievementsPage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <div className="container-page relative pb-14 pt-12 md:pb-16 md:pt-16">
          <p className="eyebrow animate-rise">Achievements</p>
          <h1 className="display animate-rise animate-rise-delay-1 mt-5 text-[clamp(2.2rem,5.2vw,3.6rem)]">
            What the work produced
          </h1>
          <p className="lede animate-rise animate-rise-delay-2 mt-5 max-w-2xl">
            Roles that turned into events, workshops and organised rounds — plus competition results
            and certifications backed by the certificate itself.
          </p>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <h2 className="display text-[clamp(1.7rem,3.2vw,2.4rem)]">Leadership &amp; event organising</h2>
          <p className="lede mt-3 max-w-2xl">
            Student leadership is where the results are easiest to point at: a workshop delivered, a
            pitching round run, a club programme kept moving.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {achievements.map((item) => (
              <article key={item.title} className="card flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="icon-tile icon-tile-coral" aria-hidden>
                    <Award className="h-5 w-5" />
                  </span>
                  <span className="chip">{item.category}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.role}</p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{item.detail}</p>
                <p className="mt-auto flex items-center gap-2 pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {item.period}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-8 max-w-2xl border-l-2 border-[var(--line-strong)] pl-5 text-sm leading-relaxed text-[var(--muted)]">
            The roles behind these entries are documented in full on the{" "}
            <Link href="/experience" className="font-semibold text-[var(--link)] hover:underline">
              experience page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="section border-t border-[var(--line)] bg-[var(--tint)]">
        <div className="container-page">
          <h2 className="display text-[clamp(1.5rem,2.8vw,2rem)]">Awards &amp; recognition</h2>
          <p className="lede mt-3 max-w-2xl">
            Competition results, with the event and team recorded as they were reported.
          </p>

          {awards.length === 0 ? (
            <EmptyState icon={Award} title="No verified awards listed yet" className="mt-5">
              Competition results and recognitions will appear here only when the certificate or
              official result can be referenced.
            </EmptyState>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {awards.map((award) => (
                <article key={award.title} className="card flex flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="icon-tile icon-tile-coral" aria-hidden>
                      <Trophy className="h-5 w-5" />
                    </span>
                    <span className="chip">{award.result}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold leading-snug">{award.title}</h3>
                  {award.team ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">{award.team}</p>
                  ) : null}
                  {award.period ? (
                    <p className="mt-auto flex items-center gap-2 pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {award.period}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="certifications" className="section border-t border-[var(--line)]">
        <div className="container-page">
          <h2 className="display text-[clamp(1.5rem,2.8vw,2rem)]">Certifications</h2>
          <p className="lede mt-3 max-w-2xl">
            Each entry links to the certificate itself. Nothing is listed without the file.
          </p>

          {certifications.length === 0 ? (
            <EmptyState icon={BadgeCheck} title="No certifications published yet" className="mt-5">
              Each certification will be listed with its issuer, date and a verifiable link or
              file. Nothing is listed until the certificate is on hand.
            </EmptyState>
          ) : (
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {certifications.map((certification) => (
                <li
                  key={`${certification.title}-${certification.issuer}`}
                  className="card flex flex-col p-6"
                >
                  <span className="icon-tile icon-tile-coral w-fit" aria-hidden>
                    <BadgeCheck className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-lg font-semibold leading-snug">{certification.title}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {certification.issuer} · {certification.year}
                  </p>
                  {certification.detail ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">{certification.detail}</p>
                  ) : null}
                  {certification.href ? (
                    <a
                      href={certification.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-[var(--link)] hover:underline"
                    >
                      View certificate
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--cerulean)] to-[#006b80] px-6 py-12 text-white md:px-12 md:py-14">
            <div className="bg-grid absolute inset-0 opacity-20" aria-hidden />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="display text-[clamp(1.7rem,3.2vw,2.4rem)]">
                  Want the one-page version?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  The resume page collects education, skills, roles and projects in one place.
                </p>
              </div>
              <Link href="/resume" className="btn btn-coral">
                View resume
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
