import Link from "@/components/static-link";
import { Mail } from "lucide-react";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--tint-soft)]">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5">
            <span className="display grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--cerulean)] to-[var(--teal)] text-[0.82rem] font-semibold text-white">
              RP
            </span>
            <span className="text-base font-semibold">{site.name}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
            B.Tech Computer Science and Engineering student, developer and student leader based in
            Cooch Behar, West Bengal.
          </p>
          <a
            href={`mailto:${site.email}`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--link)] hover:underline"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {site.email}
          </a>
        </div>

        <nav aria-label="Footer" className="space-y-3">
          <p className="eyebrow">Explore</p>
          <ul className="space-y-2 text-sm">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <p className="eyebrow">Details</p>
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            <li>{site.location}</li>
            <li>{site.college}</li>
            <li>Open to internships and collaboration</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Built with Next.js · Hosted on Cloudflare</p>
        </div>
      </div>
    </footer>
  );
}
