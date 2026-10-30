import type { Metadata } from "next";
import UpcomingPage from "@/components/site/upcoming-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story behind Rishav Prasad — academic background, technical interests, leadership journey and goals.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <UpcomingPage
      eyebrow="About"
      title="The person behind the work"
      description="A third-year Computer Science and Engineering student at Cooch Behar Government Engineering College, building software while leading the technical communities around him."
      items={[
        "A full introduction, written in first person",
        "Academic background and a visual education timeline",
        "Technical interests and how they connect",
        "The leadership journey — E-Cell, Tech-O-Nicks and SIH 2026",
        "Personal philosophy and future aspirations",
      ]}
    />
  );
}
