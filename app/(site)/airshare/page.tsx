import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowLeft, FileUp, Laptop, ShieldCheck, Terminal, Wifi } from "lucide-react";

export const metadata: Metadata = {
  title: "AirShare",
  description:
    "AirShare is a local-network file transfer tool that runs on your own computer and moves files between devices on the same Wi-Fi without uploading them anywhere.",
  alternates: { canonical: "/airshare/" },
};

const steps = [
  {
    title: "Install once",
    body: "Open a terminal in the airshare folder and run npm install. Node.js 24 or newer is required.",
  },
  {
    title: "Start the host",
    body: "Run npm start. The server prints a Local URL and a Network URL such as http://192.168.1.42:8787.",
  },
  {
    title: "Open the Network URL",
    body: "Join the same Wi-Fi on a phone or laptop and open that Network URL. Both devices appear under Devices online.",
  },
  {
    title: "Send files or text",
    body: "Pick a file on one device, download it on the other, and close the tab when finished. Nothing is left behind.",
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
          AirShare is a small Node.js app that runs on your computer. Devices on the same Wi-Fi open
          it in a browser and send files or text through your machine — never through this website,
          never through a cloud account.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <article className="card p-6">
            <span className="icon-tile">
              <Wifi className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Same network</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Both devices join the local server over Wi-Fi. No account, no cloud, no internet
              dependency.
            </p>
          </article>
          <article className="card p-6">
            <span className="icon-tile">
              <Laptop className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Your machine relays</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              The host streams file chunks over a WebSocket to every connected device. Received
              files are assembled in the browser tab.
            </p>
          </article>
          <article className="card p-6">
            <span className="icon-tile">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Nothing stored</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              The server never writes files to disk. Close the receiving tab and the data is gone.
            </p>
          </article>
        </div>

        <div className="card mt-6 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="icon-tile">
              <Terminal className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Run it on your computer</h2>
              <p className="text-sm text-[var(--muted)]">
                One process, one port, no build step in the browser.
              </p>
            </div>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-4 text-xs leading-relaxed">
            <code>{`cd airshare
npm install
npm start                 # default port 8787
PORT=8788 npm start       # or choose another port`}</code>
          </pre>

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

          <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
            On Windows, allow Node.js on <span className="font-medium text-[var(--ink)]">Private</span>{" "}
            networks when the firewall prompt appears, otherwise phones cannot connect. Guest Wi-Fi
            with client isolation blocks transfers entirely.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="card p-6 md:p-8">
            <h2 className="text-base font-semibold">What it handles</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-[var(--muted)]">
              <li>Text messages and file transfers between every connected device</li>
              <li>Files up to 500 MB, streamed in 64 KB chunks</li>
              <li>Device names, presence updates and cancel/disconnect cleanup</li>
              <li>Backpressure for slow receivers, idle-transfer cancelling, heartbeat</li>
            </ul>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="text-base font-semibold">Deliberate limits</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-[var(--muted)]">
              <li>
                <span className="font-medium text-[var(--ink)]">LAN only.</span> It is not deployed
                on this site and has no public URL.
              </li>
              <li>
                <span className="font-medium text-[var(--ink)]">Plaintext, no accounts.</span> Use it
                only on a network you trust.
              </li>
              <li>
                <span className="font-medium text-[var(--ink)]">No resume.</span> If the receiver
                reloads, the transfer starts again.
              </li>
            </ul>
          </div>
        </div>

        <div className="card mt-6 p-6 md:p-8">
          <div className="flex items-start gap-3">
            <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cerulean)]" aria-hidden />
            <div>
              <h2 className="text-base font-semibold">Status</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                The app and its automated tests are complete: the suite covers two-client handshakes,
                text broadcast, a byte-identical file transfer, cancellation, disconnects and
                malformed frames. A physical two-device run still needs two real devices on the same
                Wi-Fi — connect a phone and a laptop and follow the steps above.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                Source lives in the portfolio repository under{" "}
                <a
                  href="https://github.com/Rishav0523/rishav-portfolio/tree/main/airshare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--link)] hover:underline"
                >
                  airshare/
                </a>
                . It is a separate Node.js project and is never bundled into this static site.
              </p>
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
