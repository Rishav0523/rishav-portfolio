import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ol className={cn("relative pl-8 sm:pl-10", className)}>
      <span
        aria-hidden
        className="absolute bottom-3 left-2 top-3 w-px bg-[var(--line)]"
      />
      {children}
    </ol>
  );
}

export function TimelineItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("relative pb-10 last:pb-0", className)}>
      <span
        aria-hidden
        className="absolute -left-6 top-1.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-[var(--bg)] bg-[var(--teal)] sm:-left-8"
      />
      {children}
    </li>
  );
}
