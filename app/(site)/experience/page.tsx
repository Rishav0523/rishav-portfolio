import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowUpRight } from "lucide-react";
import { Timeline, TimelineItem } from "@/components/site/timeline";
import { leadership } from "@/lib/content";
import { icons } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Leadership roles of Rishav Prasad — Joint Secretary of E-Cell CGEC, In-Charge of Tech-O-Nicks, and Overall Coordinator for the Smart India Hackathon 2026 institutional round.",
  alternates: { canonical: "/experience/" },
  openGraph: { url: "/experience/" },
};

export default function ExperiencePage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <div className="container-page relative pb-14 pt-12 md:pb-16 md:pt-16">
          <p className="eyebrow animate-rise">Experience &amp; leadership</p>
          <h1 className="display animate-rise animate-rise-delay-1 mt-5 text-[clamp(2.2rem,5.2vw,3.6rem)]">
            Where I show up and lead
          </h1>
          <p className="lede animate-rise animate-rise-delay-2 mt-5 max-w-2xl">
            Three roles, all running at once through 2026: an entrepreneurship cell, a technical club,
            and the institutional round of a national hackathon.
          </p>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <Timeline className="max-w-3xl">
            {leadership.map((role) => {
              const Icon = icons[role.icon];
              return (
                <TimelineItem key={role.role}>
                  <article className="card p-6 md:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <span className="icon-tile icon-tile-coral shrink-0">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <h2 className="text-lg font-semibold md:text-xl">{role.role}</h2>
                          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                            {role.org}
                          </p>
                        </div>
                      </div>
                      <span className="chip">{role.period}</span>
                    </div>

                    <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">{role.summary}</p>

                    <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                      What the work involves
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                      {role.points.map((point) => (
                        <li key={point} className="flex gap-2.5">
                          <span
                            className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--teal)]"
                            aria-hidden
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </article>
                </TimelineItem>
              );
            })}
          </Timeline>

          <p className="mt-10 max-w-3xl border-l-2 border-[var(--line-strong)] pl-5 text-sm leading-relaxed text-[var(--muted)]">
            These are student leadership positions, not employment. They&apos;re listed because
            coordinating people, schedules and stakeholders is where most of my practical learning
            happens — not to pad a résumé.
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
                  Working on something that needs hands?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  I&apos;m open to internships and collaborations, and I answer email.
                </p>
              </div>
              <Link href="/contact" className="btn btn-coral">
                Start a conversation
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
