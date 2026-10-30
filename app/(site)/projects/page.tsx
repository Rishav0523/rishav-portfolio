import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import EmptyState from "@/components/site/empty-state";
import { projects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software and web projects by Rishav Prasad, each listed with its real status — including the Online Examination and Proctoring System, currently in development.",
  alternates: { canonical: "/projects/" },
  openGraph: { url: "/projects/" },
};

export default function ProjectsPage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <div className="container-page relative pb-14 pt-12 md:pb-16 md:pt-16">
          <p className="eyebrow animate-rise">Projects</p>
          <h1 className="display animate-rise animate-rise-delay-1 mt-5 text-[clamp(2.2rem,5.2vw,3.6rem)]">
            Built, or still being built
          </h1>
          <p className="lede animate-rise animate-rise-delay-2 mt-5 max-w-2xl">
            Every entry states its real status. No placeholder screenshots, no invented links, and
            nothing described as finished while it is still in development.
          </p>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              All projects
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {projects.length} {projects.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          {projects.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No projects published yet" className="mt-6">
              Projects appear here once there is real work to show. Nothing is listed while it is
              still an idea.
            </EmptyState>
          ) : (
            <div
              className={
                projects.length > 1 ? "mt-6 grid gap-5 lg:grid-cols-2" : "mt-6 max-w-3xl"
              }
            >
              {projects.map((project) => (
                <article key={project.slug} className="card flex flex-col p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className="icon-tile" aria-hidden>
                      <FolderOpen className="h-5 w-5" />
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          project.status === "In development"
                            ? "bg-[var(--coral)]"
                            : "bg-[var(--teal)]"
                        }`}
                        aria-hidden
                      />
                      {project.status}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-semibold">{project.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {project.summary}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    {project.detail}
                  </p>

                  <div className="mt-auto pt-6">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Stack
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {project.stack.map((item) => (
                        <li key={item} className="chip">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {project.links?.length ? (
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--line)] pt-5">
                      {project.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--link)] hover:underline"
                        >
                          {link.label}
                          <ArrowUpRight className="h-4 w-4" aria-hidden />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            More projects will be listed as they reach a state worth showing — each with its own
            status, stack and links.
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
                  Something you want built?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  I&apos;m open to internships and collaborations where the work is real.
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
