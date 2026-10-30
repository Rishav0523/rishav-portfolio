import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export default function EmptyState({ icon: Icon, title, children, className }: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--card)_55%,transparent)] px-6 py-10 text-center ${className ?? ""}`}
    >
      <span className="icon-tile mx-auto" aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-semibold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">{children}</p>
    </div>
  );
}
