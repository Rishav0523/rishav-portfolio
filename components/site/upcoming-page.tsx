import Link from "@/components/static-link";
import { ArrowLeft, Clock3 } from "lucide-react";

type UpcomingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: readonly string[];
};

export default function UpcomingPage({ eyebrow, title, description, items }: UpcomingPageProps) {
  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="container-page relative max-w-3xl py-16 md:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-5 text-[clamp(2.2rem,5.2vw,3.5rem)]">{title}</h1>
        <p className="lede mt-5 max-w-2xl">{description}</p>

        <div className="card mt-10 p-6 md:p-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <Clock3 className="h-4 w-4 text-[var(--coral)]" aria-hidden />
            In progress
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            This section ships in an upcoming deployment. Here is exactly what will live here — no
            placeholders presented as finished work.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-[var(--ink)]">
            {items.map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--teal)]"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
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
