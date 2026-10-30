import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowUpRight } from "lucide-react";
import { Timeline, TimelineItem } from "@/components/site/timeline";
import { education } from "@/lib/content";

export const metadata: Metadata = {
  title: "Education",
  description:
    "Education of Rishav Prasad — B.Tech in Computer Science and Engineering at Cooch Behar Government Engineering College, and CBSE board results from Delhi Public School, Siliguri.",
  alternates: { canonical: "/education/" },
  openGraph: { url: "/education/" },
};

export default function EducationPage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <div className="container-page relative pb-14 pt-12 md:pb-16 md:pt-16">
          <p className="eyebrow animate-rise">Education</p>
          <h1 className="display animate-rise animate-rise-delay-1 mt-5 text-[clamp(2.2rem,5.2vw,3.6rem)]">
            Where I&apos;ve studied
          </h1>
          <p className="lede animate-rise animate-rise-delay-2 mt-5 max-w-2xl">
            A B.Tech in Computer Science and Engineering, and two CBSE board examinations before it.
            Results are listed as published, without rounding up.
          </p>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <Timeline className="max-w-3xl">
            {education.map((entry) => (
              <TimelineItem key={entry.degree}>
                <article className="card p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold md:text-xl">{entry.degree}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">{entry.institution}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="display text-2xl font-semibold">{entry.score}</p>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        {entry.scoreLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="chip">{entry.period}</span>
                    {entry.board ? <span className="chip">{entry.board}</span> : null}
                    <span className="chip">{entry.location}</span>
                    {entry.current ? <span className="chip capitalize">In progress</span> : null}
                  </div>

                  <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-[var(--muted)]">
                    {entry.notes.map((note) => (
                      <li key={note} className="flex gap-2">
                        <span
                          className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--teal)]"
                          aria-hidden
                        />
                        {note}
                      </li>
                    ))}
                  </ul>
                </article>
              </TimelineItem>
            ))}
          </Timeline>

          <p className="mt-10 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
            The CGPA above reflects the third year of the B.Tech programme; the two percentages are
            final CBSE board results. Coursework, projects and leadership work are documented on the{" "}
            <Link href="/skills" className="font-semibold text-[var(--link)] hover:underline">
              skills
            </Link>{" "}
            and{" "}
            <Link href="/experience" className="font-semibold text-[var(--link)] hover:underline">
              experience
            </Link>{" "}
            pages.
          </p>
        </div>
      </section>

      <section className="section border-t border-[var(--line)] bg-[var(--tint)]">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--cerulean)] to-[#006b80] px-6 py-12 text-white md:px-12 md:py-14">
            <div className="bg-grid absolute inset-0 opacity-20" aria-hidden />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="display text-[clamp(1.7rem,3.2vw,2.4rem)]">
                  Curious what I do outside the syllabus?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  The roles, workshops and hackathon work are on the experience page.
                </p>
              </div>
              <Link href="/experience" className="btn btn-coral">
                View experience
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
