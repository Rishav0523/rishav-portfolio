"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

type Turnstile = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile unavailable"));
    };
    const onError = () => reject(new Error("Turnstile failed to load"));

    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });
}

type Status = { kind: "error" | "success" | "info"; message: string } | null;

export default function ContactForm({ siteKey }: { siteKey?: string }) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [widgetError, setWidgetError] = useState(false);

  useEffect(() => {
    if (!siteKey || !widgetRef.current) return;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !widgetRef.current) return;
        widgetIdRef.current = turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          callback: (token) => {
            tokenRef.current = token;
          },
          "expired-callback": () => {
            tokenRef.current = "";
          },
          "error-callback": () => {
            tokenRef.current = "";
            setWidgetError(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setWidgetError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      subject: String(data.get("subject") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      website: String(data.get("website") ?? ""),
      turnstileToken: tokenRef.current,
    };

    setStatus(null);
    setSending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: result.error ?? "The message could not be sent. Please try again.",
        });
        tokenRef.current = "";
        if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
        return;
      }

      form.reset();
      setStatus({
        kind: "success",
        message: "Message sent. Thank you — I will reply to your email address.",
      });
      tokenRef.current = "";
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Check your connection, or email me directly.",
      });
    } finally {
      setSending(false);
    }
  }

  if (!siteKey) {
    return (
      <p className="form-status">
        The online form is not configured in this build. Email works and reaches me directly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="form-field">
          <label className="form-label" htmlFor="contact-name">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className="form-input"
            placeholder="Your name"
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            className="form-input"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="contact-subject">
          Subject <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          maxLength={120}
          className="form-input"
          placeholder="Internship, collaboration, question…"
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="contact-message">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          className="form-input"
          placeholder="What you have in mind, and a little context."
        />
        <span className="form-hint">Between 10 and 4,000 characters.</span>
      </div>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div ref={widgetRef} aria-label="Spam verification" />

      {widgetError ? (
        <p className="form-status inline-flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--coral)]" aria-hidden />
          Verification could not load. Refresh the page, or email me directly.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {sending ? "Sending…" : "Send message"}
        </button>
        <p className="form-hint">Protected by Cloudflare Turnstile. No account required.</p>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {status ? (
          <p
            className={
              status.kind === "success"
                ? "form-status inline-flex w-full items-start gap-2 border-[color-mix(in_srgb,var(--teal)_45%,var(--line))] text-[var(--ink)]"
                : "form-status inline-flex w-full items-start gap-2"
            }
          >
            {status.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--teal)]" aria-hidden />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--coral)]" aria-hidden />
            )}
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
