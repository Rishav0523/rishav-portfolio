import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · Developer Portfolio`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  keywords: [
    "Rishav Prasad",
    "Rishav Prasad portfolio",
    "CSE student developer",
    "Cooch Behar Government Engineering College",
    "CGEC",
    "software developer",
    "cybersecurity",
    "student leader",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: `${site.name} · Portfolio`,
    title: `${site.name} · Developer Portfolio`,
    description: site.description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: `${site.name} · Developer Portfolio`,
    description: site.description,
  },
  icons: {
    icon: "/favicon.svg",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFCDC" },
    { media: "(prefers-color-scheme: dark)", color: "#04202A" },
  ],
};

const themeScript = `(function(){try{var s=localStorage.getItem("theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  url: site.url,
  email: `mailto:${site.email}`,
  jobTitle: "Computer Science and Engineering Student · Software Developer",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: site.college,
  },
  knowsAbout: [
    "Software Development",
    "Web Development",
    "Cybersecurity",
    "Artificial Intelligence",
    "Entrepreneurship",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cooch Behar",
    addressRegion: "West Bengal",
    addressCountry: "IN",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${fraunces.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </head>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
