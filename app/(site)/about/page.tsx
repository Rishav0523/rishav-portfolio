import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/static-link";
import { ArrowRight, ArrowUpRight, GraduationCap, Terminal, Users } from "lucide-react";
import SocialLinks from "@/components/site/social-links";
import { Timeline, TimelineItem } from "@/components/site/timeline";
import { education, journey, leadership, profileFacts } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Rishav Prasad is a third-year Computer Science and Engineering student at Cooch Behar Government Engineering College, a software developer and a student leader at E-Cell CGEC and Tech-O-Nicks.",
  alternates: { canonical: "/about/" },
  openGraph: { url: "/about/" },
};

const principles = [
  {
    title: "Build to learn",
    body: "A concept I can't implement is a concept I haven't really understood. Most of what sticks comes from something breaking and having to work out why.",
  },
  {
    title: "Break to understand",
    body: "Cybersecurity interests me because it forces you to read a system the way an attacker would. That habit makes the things I build a little sturdier.",
  },
  {
    title: "Communities compound",
    body: "A club is infrastructure. The inductions, workshops and hackathon rounds I help run exist so that someone else can ship their first real project.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <div className="container-page relative pb-14 pt-12 md:pb-16 md:pt-16">
          <p className="eyebrow animate-rise">About</p>
          <h1 className="display animate-rise animate-rise-delay-1 mt-5 text-[clamp(2.2rem,5.2vw,3.6rem)]">
            The person behind the work
          </h1>
          <p className="lede animate-rise animate-rise-delay-2 mt-5 max-w-2xl">
            Third-year Computer Science and Engineering student at Cooch Behar Government Engineering
            College — building software, studying how systems break, and helping run the technical
            communities around me.
          </p>
          <div className="animate-rise animate-rise-delay-3 mt-7 flex flex-wrap items-center gap-4">
            <Link href="/contact" className="btn btn-primary">
              Get in touch
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <SocialLinks />
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--line)] pt-16 md:pt-20">
        <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <div className="relative max-w-sm">
              <div
                className="absolute inset-x-4 -bottom-4 top-4 rotate-2 rounded-[2rem] bg-[var(--apricot)]/70"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--line)] shadow-[0_24px_50px_-28px_rgba(6,60,74,0.55)]">
                <Image
                  src="/images/about-portrait.jpg"
                  alt="Rishav Prasad seated in a tan jacket and glasses, looking towards the camera"
                  width={1200}
                  height={1500}
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 384px, 100vw"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <dl className="mt-10 grid gap-x-6 gap-y-5 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
              {profileFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {fact.label}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold leading-snug">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className="display text-[clamp(1.75rem,3.2vw,2.4rem)]">How I got here</h2>
            <div className="mt-6 space-y-5 text-[0.98rem] leading-relaxed text-[var(--muted)]">
              <p>
                I&apos;m Rishav Prasad. I study Computer Science and Engineering at Cooch Behar
                Government Engineering College, where I&apos;m currently in my third year with a CGPA
                of 8.5 out of 10. Most of what I do sits between two habits: building things, and
                taking them apart to see how they work.
              </p>
              <p>
                My coursework started with C, then Python and Java. On the web I work with HTML,
                CSS and JavaScript, and there&apos;s usually a MySQL database behind whatever I&apos;m
                noodling on. I&apos;m deliberate about not overstating this: everything on the{" "}
                <Link href="/skills" className="font-semibold text-[var(--link)] hover:underline">
                  skills page
                </Link>{" "}
                is something I have actually used, not something I&apos;ve watched a tutorial about.
              </p>
              <p>
                The other half of my time is student leadership. As Joint Secretary of E-Cell CGEC I
                help run entrepreneurship initiatives, including Illuminate 2026 with E-Cell IIT
                Bombay. As an In-Charge of Tech-O-Nicks I coordinate the club&apos;s technical tracks
                and its extended core team. For Smart India Hackathon 2026 I coordinated the
                institutional pitching round. Organising taught me what coursework doesn&apos;t: how to
                keep a team moving, how to talk to faculty and external stakeholders, and how to plan
                backwards from a date.
              </p>
              <p>
                Where I&apos;m heading: I want to build software people actually use, starting with
                full-stack work, with cybersecurity and applied AI as directions I&apos;m exploring
                seriously. I&apos;m looking for internships and collaborations where I can be useful
                early and learn faster than I would on my own.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {["Software development", "Cybersecurity", "Student leadership", "Entrepreneurship"].map(
                (tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--line)] bg-[var(--tint)]">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">How I work</p>
            <h2 className="display mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)]">
              Three things I keep coming back to
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {principles.map((principle, index) => (
              <article key={principle.title} className="card p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--link)]">
                  0{index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{principle.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="eyebrow">Timeline</p>
            <h2 className="display mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)]">The short version</h2>
            <p className="lede mt-4">
              School, college and the roles that came along the way. The detail lives on the education
              and experience pages.
            </p>
          </div>
          <Timeline className="lg:pt-2">
            {journey.map((node) => (
              <TimelineItem key={`${node.year}-${node.title}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--link)]">
                  {node.year}
                </p>
                <h3 className="mt-1 text-base font-semibold">{node.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{node.detail}</p>
              </TimelineItem>
            ))}
          </Timeline>
        </div>
      </section>

      <section className="section border-t border-[var(--line)] bg-[var(--tint-soft)]">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Go deeper</p>
            <h2 className="display mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)]">
              The parts worth their own page
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Link href="/education" className="card group flex flex-col p-6">
              <span className="icon-tile">
                <GraduationCap className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold">Education</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                B.Tech at CGEC, plus both board results from Delhi Public School, Siliguri.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--link)]">
                View education
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>

            <Link href="/skills" className="card group flex flex-col p-6">
              <span className="icon-tile">
                <Terminal className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold">Skills</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Languages, web fundamentals and databases I actually work with — no percentages.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--link)]">
                View skills
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>

            <Link href="/experience" className="card group flex flex-col p-6">
              <span className="icon-tile">
                <Users className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold">Leadership</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {leadership.length} current roles across E-Cell CGEC, Tech-O-Nicks and SIH 2026.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--link)]">
                View experience
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </div>

          <p className="mt-8 text-sm text-[var(--muted)]">
            Latest education entry: {education[0].degree} · {education[0].score}.
          </p>
        </div>
      </section>
    </>
  );
}
