import type { Metadata } from "next";
import UpcomingPage from "@/components/site/upcoming-page";

export const metadata: Metadata = {
  title: "Achievements",
  description:
    "Achievements, certifications, workshops, hackathons and events by Rishav Prasad.",
  alternates: { canonical: "/achievements/" },
};

export default function AchievementsPage() {
  return (
    <UpcomingPage
      eyebrow="Achievements"
      title="Proof of the work"
      description="Certifications, workshops, hackathons and organised events will be collected here — only real, verifiable entries."
      items={[
        "Achievements and competition results",
        "Certifications with certificate images or PDFs",
        "Workshops and hackathon participation",
        "Events organised through E-Cell and Tech-O-Nicks",
      ]}
    />
  );
}
