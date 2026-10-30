import { socials } from "@/lib/content";
import { cn } from "@/lib/cn";
import SocialIcon from "./social-icon";

export default function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {socials.map((social) => {
        return (
          <li key={social.href}>
            <a
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${social.label} — ${social.handle}`}
              title={`${social.label} · ${social.handle}`}
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:bg-[rgba(0,129,167,0.07)] hover:text-[var(--ink)]"
            >
              <SocialIcon name={social.label} className="h-4 w-4" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
