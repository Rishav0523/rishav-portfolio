import type { Metadata } from "next";
import UpcomingPage from "@/components/site/upcoming-page";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Leadership roles of Rishav Prasad at E-Cell CGEC, Tech-O-Nicks and the Smart India Hackathon organizing team.",
  alternates: { canonical: "/experience/" },
};

export default function ExperiencePage() {
  return (
    <UpcomingPage
      eyebrow="Experience & leadership"
      title="Where I show up and lead"
      description="Joint Secretary of E-Cell CGEC, In-Charge of Tech-O-Nicks and part of the SIH 2026 organizing team."
      items={[
        "A vertical timeline of every role",
        "Responsibilities and outcomes for each position",
        "Organisation details and time period",
        "Links between community work and technical work",
      ]}
    />
  );
}
