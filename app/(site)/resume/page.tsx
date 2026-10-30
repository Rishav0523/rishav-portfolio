import type { Metadata } from "next";
import UpcomingPage from "@/components/site/upcoming-page";

export const metadata: Metadata = {
  title: "Resume",
  description: "View and download the latest resume of Rishav Prasad.",
  alternates: { canonical: "/resume/" },
};

export default function ResumePage() {
  return (
    <UpcomingPage
      eyebrow="Resume"
      title="One page, the essentials"
      description="The resume section will show the current PDF inline, with a download button and the date it was last updated."
      items={[
        "Inline PDF viewer",
        "Download link to the current resume",
        "Last updated date, generated automatically",
        "Replacement through the admin dashboard, no code changes",
      ]}
    />
  );
}
