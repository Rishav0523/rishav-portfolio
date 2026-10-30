import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowLeft, Mail, MapPin, MessageSquare } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Rishav Prasad by email.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="container-page relative py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">Contact</p>
          <h1 className="display mt-5 text-[clamp(2.2rem,5.2vw,3.5rem)]">
            Let&apos;s talk about something worth building
          </h1>
          <p className="lede mt-5">
            Internships, collaborations, technical communities, or just a question — email reaches
            me directly and is answered.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="card p-6 md:p-8">
            <span className="icon-tile">
              <Mail className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Email</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              The most reliable way to reach me. Include what you have in mind and a little context.
            </p>
            <a href={`mailto:${site.email}`} className="btn btn-primary mt-6">
              {site.email}
            </a>

            <div className="mt-8 border-t border-[var(--line)] pt-6">
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-[var(--teal)]" aria-hidden />
                Contact form
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                A validated contact form with spam protection ships with the backend in an upcoming
                deployment. Until then, email works and is not a placeholder.
              </p>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <span className="icon-tile icon-tile-coral">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Based in</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{site.location}</p>
            <dl className="mt-6 space-y-4 border-t border-[var(--line)] pt-6 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">College</dt>
                <dd className="mt-1 font-medium">{site.college}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Open to</dt>
                <dd className="mt-1 font-medium">Internships · Collaborations · Tech communities</dd>
              </div>
            </dl>
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--link)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>
      </div>
    </section>
  );
}
