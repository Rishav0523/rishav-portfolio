"use client";

import Link from "@/components/static-link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { site } from "@/lib/site";
import { cn } from "@/lib/cn";
import ThemeToggle from "./theme-toggle";

function normalize(path: string) {
  return path !== "/" ? path.replace(/\/+$/, "") : "/";
}

export default function Nav() {
  const pathname = normalize(usePathname() ?? "/");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300 print-hide",
        scrolled || open
          ? "border-[var(--line)] bg-[var(--nav)] backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-3 md:h-[4.5rem]">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="display grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--cerulean)] to-[var(--teal)] text-[0.82rem] font-semibold tracking-wide text-white shadow-[0_8px_18px_-10px_rgba(0,129,167,0.9)]">
            RP
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[0.95rem] font-semibold tracking-tight">{site.name}</span>
            <span className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              Developer · CSE
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 xl:flex">
          {site.nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-3 py-2 text-[0.84rem] font-medium transition-colors",
                  active
                    ? "text-[var(--link)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-[var(--teal)] transition-transform duration-200",
                    active ? "scale-x-100" : "scale-x-0",
                  )}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/contact" className="btn btn-primary hidden sm:inline-flex">
            Let&apos;s talk
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] transition hover:border-[var(--line-strong)] xl:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
      </header>

      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-[var(--line)] bg-[var(--bg)] md:top-[4.5rem] xl:hidden"
        >
          <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-5">
            {site.nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-3 py-3 text-base font-medium transition-colors",
                    active
                      ? "bg-[rgba(0,175,185,0.1)] text-[var(--link)]"
                      : "text-[var(--ink)] hover:bg-[rgba(0,129,167,0.06)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link href="/contact" className="btn btn-coral mt-3">
              Let&apos;s talk
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
