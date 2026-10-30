import type { Metadata } from "next";
import Link from "@/components/static-link";
import { ArrowLeft, Laptop, ShieldCheck, Wifi } from "lucide-react";

export const metadata: Metadata = {
  title: "AirShare",
  description:
    "AirShare is a local-network file transfer tool that moves files between devices on the same Wi-Fi without uploading them anywhere.",
  alternates: { canonical: "/airshare/" },
};

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
          AirShare is a small tool that runs on your own computer. Devices on the same Wi-Fi connect
          to it, pair with a short code or QR, and files travel directly between them — never through
          this website.
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
            <h2 className="mt-4 text-base font-semibold">Peer to peer</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Files move over a direct WebRTC connection when the browser allows it, with a
              same-network relay as a fallback.
            </p>
          </article>
          <article className="card p-6">
            <span className="icon-tile">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">Nothing stored</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Transferred files are never written to a server or to this portfolio. Close the tab and
              nothing remains.
            </p>
          </article>
        </div>

        <div className="card mt-6 p-6 md:p-8">
          <p className="text-sm font-semibold">Status</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            The AirShare app is being built as a standalone local server that ships in an upcoming
            deployment. This page will then include the setup instructions, a QR generator for your
            local address, and the pairing walkthrough.
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
