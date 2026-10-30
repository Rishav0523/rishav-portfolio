import {
  BrainCircuit,
  Code2,
  Database,
  Globe2,
  Lightbulb,
  Megaphone,
  Newspaper,
  Rocket,
  ShieldCheck,
  Terminal,
} from "lucide-react";

export const icons = {
  code: Code2,
  globe: Globe2,
  database: Database,
  shield: ShieldCheck,
  brain: BrainCircuit,
  rocket: Rocket,
  terminal: Terminal,
  megaphone: Megaphone,
  lightbulb: Lightbulb,
  newspaper: Newspaper,
} as const;

export type IconKey = keyof typeof icons;
