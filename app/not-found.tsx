import Link from "@/components/static-link";
import { ArrowLeft, Compass } from "lucide-react";
import Nav from "@/components/site/nav";
import Footer from "@/components/site/footer";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main id="main">
        <section className="hero-glow relative overflow-hidden">
          <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
          <div className="container-page relative flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
            <span className="icon-tile icon-tile-coral h-14 w-14">
              <Compass className="h-6 w-6" aria-hidden />
            </span>
            <p className="eyebrow mt-6">Error 404</p>
            <h1 className="display mt-4 text-[clamp(2.2rem,6vw,3.8rem)]">
              This page took a different route
            </h1>
            <p className="lede mt-5 max-w-md">
              The link may be outdated, or the page has not been built yet. Everything that exists
              right now starts from the home page.
            </p>
            <Link href="/" className="btn btn-primary mt-8">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
