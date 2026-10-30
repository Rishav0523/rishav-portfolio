export type NavItem = { href: string; label: string };

export const site = {
  name: "Rishav Prasad",
  url: (process.env.SITE_URL ?? "https://rishavprasad.in").replace(/\/+$/, ""),
  email: "prasadrishav959@gmail.com",
  // Public by design (rendered in the page). Override per environment if needed.
  turnstileSiteKey:
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAFtJIYxwdn-xwScV",
  location: "Cooch Behar, West Bengal, India",
  college: "Cooch Behar Government Engineering College",
  headline: "Building Technology. Exploring Possibilities. Creating Impact.",
  description:
    "Portfolio of Rishav Prasad — B.Tech Computer Science and Engineering student at Cooch Behar Government Engineering College, software developer, cybersecurity enthusiast and student leader.",
  roles: [
    "Software Developer",
    "CSE Student",
    "Technology Enthusiast",
    "Cybersecurity Explorer",
    "Aspiring Entrepreneur",
  ],
  nav: [
    { href: "/about", label: "About" },
    { href: "/education", label: "Education" },
    { href: "/projects", label: "Projects" },
    { href: "/skills", label: "Skills" },
    { href: "/experience", label: "Experience" },
    { href: "/achievements", label: "Achievements" },
    { href: "/resume", label: "Resume" },
    { href: "/airshare", label: "AirShare" },
  ] satisfies NavItem[],
};

export const focusAreas = [
  {
    title: "Software Development",
    description: "Turning ideas into working products, one clean module at a time.",
    icon: "code",
  },
  {
    title: "Web Development",
    description: "Building fast, accessible interfaces with a strong foundation in the web platform.",
    icon: "globe",
  },
  {
    title: "Cybersecurity",
    description: "Studying how systems break, so the things I build hold up.",
    icon: "shield",
  },
  {
    title: "Artificial Intelligence",
    description: "Exploring practical ways machine intelligence can solve real problems.",
    icon: "brain",
  },
] as const;
