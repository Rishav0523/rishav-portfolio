import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowUpRight, Compass } from "lucide-react";
import { domains, skillGroups } from "@/lib/content";
import { icons } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Skills",
  description:
    "Technical skills of Rishav Prasad — C, Python and Java, web fundamentals in HTML, CSS and JavaScript, and MySQL, with the domains he is exploring.",
  alternates: { canonical: "/skills/" },
  openGraph: { url: "/skills/" },
};

export default function SkillsPage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <div className="container-page relative pb-14 pt-12 md:pb-16 md:pt-16">
          <p className="eyebrow animate-rise">Skills</p>
          <h1 className="display animate-rise animate-rise-delay-1 mt-5 text-[clamp(2.2rem,5.2vw,3.6rem)]">
            What I actually work with
          </h1>
          <p className="lede animate-rise animate-rise-delay-2 mt-5 max-w-2xl">
            Grouped by where each technology fits, not by how impressive it looks in a grid of bars.
            If something isn&apos;t listed here, I haven&apos;t used it enough to claim it.
          </p>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <div className="grid gap-4 md:grid-cols-3">
            {skillGroups.map((group) => {
              const Icon = icons[group.icon];
              return (
                <article key={group.title} className="card flex flex-col p-6">
                  <span className="icon-tile">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-base font-semibold">{group.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {group.description}
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <li key={item} className="chip">
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="mt-8 border-l-2 border-[var(--coral)] pl-5">
            <p className="text-sm font-semibold">No percentages, on purpose</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              A score next to a language measures confidence more than capability, and it invites
              arguments nobody wins. Everything above is something I&apos;ve used in coursework,
              practice or a project. The honest measure is what I help build and organise — documented
              on the{" "}
              <Link href="/experience" className="font-semibold text-[var(--link)] hover:underline">
                experience page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--line)] bg-[var(--tint)]">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Directions</p>
            <h2 className="display mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)]">What I&apos;m exploring</h2>
            <p className="lede mt-4">
              These are the areas I keep reading about and poking at. They&apos;re interests, not
              finished expertise.
            </p>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2">
            {domains.map((domain) => (
              <li key={domain} className="chip">
                {domain}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--card)] px-6 py-10 md:px-12 md:py-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <span className="icon-tile icon-tile-coral">
                  <Compass className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="display mt-5 text-[clamp(1.7rem,3.2vw,2.3rem)]">
                  Looking for someone who learns fast?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  I&apos;m open to internships and collaborations where the work is real. Tell me
                  what you&apos;re building.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Link href="/contact" className="btn btn-primary">
                  Get in touch
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/education" className="btn btn-outline">
                  See education
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
