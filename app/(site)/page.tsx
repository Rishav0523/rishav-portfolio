import Link from "@/components/static-link";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Code2,
  Globe2,
  Mail,
  Megaphone,
  Rocket,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { focusAreas, site } from "@/lib/site";
import TypingRoles from "@/components/site/typing-roles";

const focusIcons = {
  code: Code2,
  globe: Globe2,
  shield: ShieldCheck,
  brain: BrainCircuit,
} as const;

const leadership = [
  {
    org: "E-Cell CGEC",
    role: "Joint Secretary",
    note: "Entrepreneurship Cell · Cooch Behar Government Engineering College",
    icon: Rocket,
  },
  {
    org: "Tech-O-Nicks",
    role: "In-Charge",
    note: "Official technical club of CGEC",
    icon: Terminal,
  },
  {
    org: "SIH 2026",
    role: "Organizing Team · Overall Coordinator",
    note: "Smart India Hackathon · CGEC chapter",
    icon: Megaphone,
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-80" aria-hidden />
        <div className="container-page relative grid gap-14 pb-20 pt-12 md:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-12 lg:pb-28">
          <div>
            <p className="eyebrow animate-rise">B.Tech CSE · CGEC · 3rd year</p>

            <h1 className="display animate-rise animate-rise-delay-1 mt-6 text-[clamp(2.35rem,6vw,4.4rem)]">
              <span className="block">Building technology.</span>
              <span className="block">
                Exploring <span className="text-gradient">possibilities</span>.
              </span>
              <span className="block">Creating impact.</span>
            </h1>

            <p className="animate-rise animate-rise-delay-2 mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg">
              <span className="text-[var(--muted)]">I&apos;m a</span>
              <TypingRoles roles={site.roles} />
            </p>

            <p className="lede animate-rise animate-rise-delay-2 mt-5 max-w-xl">
              Third-year Computer Science and Engineering student, software developer and student
              leader. I build things for the web, dig into how systems can be broken, and help run
              the technical communities around me.
            </p>

            <div className="animate-rise animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link href="/projects" className="btn btn-primary">
                Explore my work
                <ArrowRight className="btn-icon h-4 w-4" aria-hidden />
              </Link>
              <Link href="/contact" className="btn btn-outline">
                <Mail className="h-4 w-4" aria-hidden />
                Get in touch
              </Link>
            </div>

            <dl className="animate-rise animate-rise-delay-3 mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--line)] pt-6 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Studying</dt>
                <dd className="mt-1.5 font-semibold leading-snug">B.Tech CSE · 3rd year</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Leading</dt>
                <dd className="mt-1.5 font-semibold leading-snug">E-Cell · Tech-O-Nicks</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Based in</dt>
                <dd className="mt-1.5 font-semibold leading-snug">Cooch Behar, WB</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[21.5rem] px-3 lg:max-w-[24rem] lg:px-2">
            <div
              className="absolute inset-x-6 inset-y-0 rotate-2 rounded-[2.2rem] bg-[var(--apricot)]/80"
              aria-hidden
            />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-gradient-to-br from-[var(--cerulean)] via-[#0093b4] to-[var(--teal)] shadow-[0_30px_60px_-30px_rgba(0,129,167,0.6)]">
              <div className="bg-grid absolute inset-0 opacity-25 mix-blend-overlay" aria-hidden />
              <div
                className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-white/20"
                aria-hidden
              />
              <div
                className="absolute -left-10 bottom-28 h-28 w-28 rounded-full bg-[var(--coral)]/25 blur-2xl"
                aria-hidden
              />
              <div className="absolute inset-0 grid place-items-center">
                <span className="display text-[6rem] font-semibold text-white/90">RP</span>
              </div>
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-sm font-semibold text-white">{site.name}</p>
                <p className="text-xs text-white/80">Portrait photograph coming soon</p>
              </div>
            </div>

            <div className="absolute -left-2 top-8 hidden -rotate-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-xs shadow-[0_14px_30px_-18px_rgba(6,60,74,0.5)] sm:block">
              <span className="font-semibold text-[var(--ink)]">Joint Secretary</span>
              <span className="block text-[var(--muted)]">E-Cell CGEC</span>
            </div>
            <div className="absolute -right-1 bottom-24 hidden rotate-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-xs shadow-[0_14px_30px_-18px_rgba(6,60,74,0.5)] sm:block">
              <span className="font-semibold text-[var(--ink)]">In-Charge</span>
              <span className="block text-[var(--muted)]">Tech-O-Nicks</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--line)]">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Focus areas</p>
            <h2 className="display mt-4 text-[clamp(1.9rem,3.6vw,2.75rem)]">What I work on</h2>
            <p className="lede mt-4">
              Four directions that shape what I study, build and explore — from shipping software to
              understanding how it can be attacked.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {focusAreas.map((area) => {
              const Icon = focusIcons[area.icon];
              return (
                <article key={area.title} className="card p-6">
                  <span className="icon-tile">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">{area.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {area.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {["Programming", "Entrepreneurship", "Technology & Innovation", "Student communities"].map(
              (tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--line)] bg-[var(--tint)]">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="eyebrow">Leadership</p>
              <h2 className="display mt-4 text-[clamp(1.9rem,3.6vw,2.75rem)]">
                Leading alongside building
              </h2>
              <p className="lede mt-4">
                Student leadership is where ideas meet coordination — organising, communicating and
                keeping technical communities moving.
              </p>
            </div>
            <Link
              href="/experience"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--link)] hover:underline"
            >
              View experience
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {leadership.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.org} className="card flex flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="icon-tile icon-tile-coral">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="chip capitalize">{item.role}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{item.org}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{item.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--cerulean)] to-[#006b80] px-6 py-12 text-white md:px-12 md:py-16">
            <div className="bg-grid absolute inset-0 opacity-20" aria-hidden />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Open to opportunities
                </p>
                <h2 className="display mt-4 text-[clamp(1.8rem,3.4vw,2.6rem)]">
                  Have an idea, a role, or a problem worth solving?
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/80">
                  I&apos;m looking for internships, collaborations and technical communities to
                  learn from. The fastest way to reach me is email.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Link href="/contact" className="btn btn-coral">
                  Start a conversation
                  <ArrowRight className="btn-icon h-4 w-4" aria-hidden />
                </Link>
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  {site.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
