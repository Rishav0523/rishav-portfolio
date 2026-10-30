import type { Metadata } from "next";
import UpcomingPage from "@/components/site/upcoming-page";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "A growing showcase of software, web, security and academic projects by Rishav Prasad.",
  alternates: { canonical: "/projects/" },
};

export default function ProjectsPage() {
  return (
    <UpcomingPage
      eyebrow="Projects"
      title="Things I have built"
      description="The project showcase is being assembled with real work only — every entry will carry its own description, stack, links and status."
      items={[
        "Searchable, filterable project grid",
        "Individual project pages with screenshots and key features",
        "Live demo and GitHub links for each entry",
        "Clearly labelled placeholders where work is still in progress",
      ]}
    />
  );
}
