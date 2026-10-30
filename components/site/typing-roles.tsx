"use client";

import { useEffect, useState } from "react";

export default function TypingRoles({ roles }: { roles: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(roles[0] ?? "");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const current = roles[index] ?? "";
    const complete = !deleting && text === current;
    const empty = deleting && text === "";

    const delay = complete ? 1600 : empty ? 380 : deleting ? 32 : 64;

    const timer = window.setTimeout(() => {
      if (empty) {
        setDeleting(false);
        setIndex((value) => (value + 1) % roles.length);
        return;
      }
      if (complete) {
        setDeleting(true);
        return;
      }
      setText(current.slice(0, text.length + (deleting ? -1 : 1)));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [text, deleting, index, roles]);

  return (
    <span className="inline-flex min-h-[1.6em] items-center font-semibold text-[var(--link)]">
      <span aria-hidden="true">
        {text}
        <span className="caret" />
      </span>
      <span className="sr-only">{roles.join(", ")}</span>
    </span>
  );
}
