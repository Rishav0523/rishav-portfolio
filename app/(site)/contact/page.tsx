import type { Metadata } from "next";
import Link from "@/components/static-link";
import ContactForm from "@/components/site/contact-form";
import { ArrowLeft, Mail, MapPin, MessageSquare } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Rishav Prasad — send a message through the contact form or email directly.",
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
            Internships, collaborations, technical communities, or just a question — send a message
            below or email me directly.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="card p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="icon-tile icon-tile-coral">
                <MessageSquare className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Send a message</h2>
                <p className="text-sm text-[var(--muted)]">Delivered to my inbox and answered.</p>
              </div>
            </div>
            <div className="mt-6">
              <ContactForm siteKey={site.turnstileSiteKey} />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card p-6 md:p-8">
              <span className="icon-tile">
                <Mail className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Email</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                The most direct way to reach me. Include what you have in mind and a little context.
              </p>
              <a href={`mailto:${site.email}`} className="btn btn-outline mt-5">
                {site.email}
              </a>
            </div>

            <div className="card p-6 md:p-8">
              <span className="icon-tile icon-tile-coral">
                <MapPin className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Based in</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{site.location}</p>
              <dl className="mt-5 space-y-4 border-t border-[var(--line)] pt-5 text-sm">
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
