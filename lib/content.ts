import type { IconKey } from "@/lib/icons";

export const socials = [
  {
    label: "GitHub",
    handle: "@Rishav0523",
    href: "https://github.com/Rishav0523",
  },
  {
    label: "LinkedIn",
    handle: "rishav-prasad",
    href: "https://www.linkedin.com/in/rishav-prasad-/",
  },
  {
    label: "Instagram",
    handle: "@____.rishav",
    href: "https://www.instagram.com/____.rishav",
  },
] as const;

export type EducationEntry = {
  degree: string;
  institution: string;
  period: string;
  board?: string;
  score: string;
  scoreLabel: string;
  location: string;
  notes: string[];
  current?: boolean;
};

export const education: EducationEntry[] = [
  {
    degree: "B.Tech, Computer Science and Engineering",
    institution: "Cooch Behar Government Engineering College",
    period: "2023 – 2027 (expected)",
    score: "8.5 / 10",
    scoreLabel: "Current CGPA",
    location: "Cooch Behar, West Bengal",
    notes: [
      "Third-year undergraduate",
      "Areas of interest: software development, database systems, cybersecurity",
    ],
    current: true,
  },
  {
    degree: "Higher Secondary (Class XII)",
    institution: "Delhi Public School, Siliguri",
    period: "2023",
    board: "Central Board of Secondary Education (CBSE)",
    score: "92.4%",
    scoreLabel: "Aggregate",
    location: "Siliguri, West Bengal",
    notes: ["CBSE board examination"],
  },
  {
    degree: "Secondary (Class X)",
    institution: "Delhi Public School, Siliguri",
    period: "2021",
    board: "Central Board of Secondary Education (CBSE)",
    score: "69.8%",
    scoreLabel: "Aggregate",
    location: "Siliguri, West Bengal",
    notes: ["CBSE board examination"],
  },
];

export type SkillGroup = {
  title: string;
  icon: IconKey;
  description: string;
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    title: "Programming languages",
    icon: "code",
    description: "Languages I have written real coursework and practice programs in.",
    items: ["C", "Python", "Java"],
  },
  {
    title: "Web development",
    icon: "globe",
    description: "The fundamentals I build interfaces with, without a framework hiding the details.",
    items: ["HTML5", "CSS3", "JavaScript"],
  },
  {
    title: "Databases",
    icon: "database",
    description: "Where the data behind a project lives, and how I query it.",
    items: ["MySQL"],
  },
];

export const domains = [
  "Software Development",
  "Full-Stack Web Development",
  "Cybersecurity",
  "Artificial Intelligence",
  "Database Systems",
  "Computer Science and Emerging Technologies",
];

export type LeadershipRole = {
  role: string;
  org: string;
  period: string;
  icon: IconKey;
  summary: string;
  points: string[];
};

export const leadership: LeadershipRole[] = [
  {
    role: "Joint Secretary",
    org: "Entrepreneurship Cell (E-Cell), Cooch Behar Government Engineering College",
    period: "2026 – Present",
    icon: "rocket",
    summary:
      "Contributing to the institution's entrepreneurship ecosystem and coordinating initiatives that encourage innovation and entrepreneurial thinking among students.",
    points: [
      "Contributed to organising Illuminate 2026, an entrepreneurship workshop run with E-Cell IIT Bombay.",
      "Helped run entrepreneurship-focused events, workshops, competitions and student engagement initiatives.",
      "Contributed to institutional entrepreneurship initiatives and annual report documentation.",
      "Participated in National Entrepreneurship Challenge (NEC) activities organised by E-Cell IIT Bombay.",
      "Coordinated with students, mentors, faculty members and external stakeholders.",
    ],
  },
  {
    role: "In-Charge",
    org: "Tech-O-Nicks — the official technical club of CGEC",
    period: "2026 – Present",
    icon: "terminal",
    summary:
      "Working towards a collaborative technical learning environment where students explore technology through practical learning rather than slides.",
    points: [
      "Coordinating technical activities across robotics, electronics, web development, C++ and Python.",
      "Guiding and coordinating the extended core team.",
      "Contributed to the club's induction programme and technical workshops.",
      "Supporting recruitment, team development and technical learning initiatives.",
      "Encouraging collaboration, knowledge sharing and practical project development among students.",
    ],
  },
  {
    role: "Overall Coordinator, Smart India Hackathon 2026",
    org: "Cooch Behar Government Engineering College — institutional level",
    period: "2026",
    icon: "megaphone",
    summary:
      "Contributed to organising the institutional-level SIH 2026 selection and preliminary pitching round.",
    points: [
      "Coordinated the preliminary pitching round and related event operations.",
      "Managed communication and coordination with participating teams.",
      "Coordinated with faculty members and evaluators.",
      "Assisted with scheduling, event management and execution.",
      "Helped keep the institutional selection process organised and smooth.",
    ],
  },
];

export const journey = [
  {
    year: "2021",
    title: "Class X, CBSE",
    detail: "Delhi Public School, Siliguri — 69.8%",
  },
  {
    year: "2023",
    title: "Class XII, CBSE",
    detail: "Delhi Public School, Siliguri — 92.4%",
  },
  {
    year: "2023",
    title: "Started B.Tech CSE",
    detail: "Cooch Behar Government Engineering College",
  },
  {
    year: "2026",
    title: "Student leadership",
    detail: "Joint Secretary of E-Cell, In-Charge of Tech-O-Nicks, SIH 2026 coordinator",
  },
  {
    year: "2027",
    title: "Graduating (expected)",
    detail: "B.Tech Computer Science and Engineering — CGPA 8.5 / 10",
  },
] as const;

export const profileFacts = [
  { label: "Studying", value: "B.Tech CSE · 3rd year" },
  { label: "CGPA", value: "8.5 / 10" },
  { label: "Based in", value: "Cooch Behar, West Bengal" },
  { label: "Leadership", value: "E-Cell · Tech-O-Nicks · SIH 2026" },
] as const;
