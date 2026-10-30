import type { Metadata } from "next";
import Link from "@/components/static-link";
import {
  ArrowLeft,
  ArrowRight,
  FileUp,
  Laptop,
  Lock,
  MessageSquare,
  ShieldCheck,
  Wifi,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AirShare",
  description:
    "AirShare moves files and messages between two browsers on the same Wi-Fi. Open it on both devices, join with a PIN, and the data travels directly between them.",
  alternates: { canonical: "/airshare/" },
};

const steps = [
  {
    title: "Open it on both devices",
    body: "Visit rishavprasad.in/airshare/app/ on your computer and on the other device. Both must be on the same Wi-Fi.",
  },
  {
    title: "Create or join with a PIN",
    body: "Create a room on one device. AirShare shows an 8-digit PIN; type it on the other device. Only people you give the PIN to can join.",
  },
  {
    title: "Wait for the direct connection",
    body: "The two browsers negotiate a direct WebRTC connection through the site, then verify that both ends use local network addresses.",
  },
  {
    title: "Send files, then save them",
    body: "Accept an incoming file on the receiving device and save it. Messages travel in the same connection. Leave the room when you are done.",
  },
];

export default function AirSharePage() {
  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="container-page relative max-w-4xl py-16 md:py-24">
        <p className="eyebrow">AirShare</p>
        <h1 className="display mt-5 text-[clamp(2.2rem,5.2vw,3.5rem)]">
          Send files across your own Wi-Fi
        </h1>
        <p className="lede mt-5 max-w-2xl">
          AirShare is a page on this site. Open it on two devices that share a Wi-Fi network, join the
          same PIN-gated room, and files travel directly between the two browsers — no app to install,
          no account, and no copy stored on a server.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/airshare/app/" className="btn btn-primary">
            Open AirShare
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <span className="chip">
            <Wifi className="h-3.5 w-3.5" aria-hidden />
            Same Wi-Fi required
          </span>
          <span className="chip">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            PIN-gated room
          </span>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <article className="card p-6">
            <span className="icon-tile">
              <Wifi className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Same network only</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              No STUN or relay server is configured, and the connection is checked after it is made.
              If the two ends do not appear to share a local network, AirShare stops it.
            </p>
          </article>
          <article className="card p-6">
            <span className="icon-tile">
              <Laptop className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Browser to browser</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              File chunks move over a direct WebRTC data channel, encrypted in transit by the browser.
              The site only helps the two browsers find each other.
            </p>
          </article>
          <article className="card p-6">
            <span className="icon-tile">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">PIN-gated</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Rooms are derived from the PIN, so nothing is listed publicly. Join attempts are rate
              limited per connection.
            </p>
          </article>
        </div>

        <div className="card mt-6 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="icon-tile">
              <ArrowRight className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold">How a transfer works</h2>
              <p className="text-sm text-[var(--muted)]">Four steps, on two devices.</p>
            </div>
          </div>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-[var(--line)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--link)]">
                  Step {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{step.body}</p>
              </li>
            ))}
          </ol>

          <Link
            href="/airshare/app/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--link)] hover:underline"
          >
            Open the transfer room
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="card p-6 md:p-8">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <FileUp className="h-4 w-4 text-[var(--cerulean)]" aria-hidden />
              What it handles
            </h2>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-[var(--muted)]">
              <li>Files up to 100 MB, streamed in 64 KB chunks with backpressure</li>
              <li>Several devices in one room, with a direct connection per pair</li>
              <li>Short messages that stay in the two browser tabs</li>
              <li>Accept, decline and cancel before or during a transfer</li>
            </ul>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="h-4 w-4 text-[var(--cerulean)]" aria-hidden />
              Deliberate limits
            </h2>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-[var(--muted)]">
              <li>
                <span className="font-medium text-[var(--ink)]">Same Wi-Fi required.</span> Guest
                networks that isolate clients block the connection entirely.
              </li>
              <li>
                <span className="font-medium text-[var(--ink)]">PIN, not an account.</span> Anyone who
                has the PIN and is on the network can join, so share it in person.
              </li>
              <li>
                <span className="font-medium text-[var(--ink)]">Memory only.</span> A received file
                lives in the tab until you save it. Reloading the page starts over.
              </li>
              <li>
                <span className="font-medium text-[var(--ink)]">No resume.</span> A dropped connection
                cancels an unfinished transfer.
              </li>
            </ul>
          </div>
        </div>

        <div className="card mt-6 p-6 md:p-8">
          <h2 className="text-base font-semibold">Status</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            The web app is built and covered by automated tests that join two isolated browser
            contexts with one PIN, check the direct connection and move a file byte-for-byte. A
            physical two-device run on a real Wi-Fi network still needs a phone and a laptop; until
            that is done, treat cross-device behaviour as unverified.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            The earlier standalone Node.js version remains in the{" "}
            <a
              href="https://github.com/Rishav0523/rishav-portfolio/tree/main/airshare"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--link)] hover:underline"
            >
              airshare/
            </a>{" "}
            folder for a self-hosted setup with larger transfers. It is a separate project and is not
            part of the deployed site.
          </p>
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
