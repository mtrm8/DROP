import type { Metadata } from "next";
import BunkerExperience from "@/components/BunkerExperience";

export const metadata: Metadata = {
  title: "The Bunker · Analyst Deep-Dive | Einstein Drop",
  description: "סקירת עומק קדם-משחק של טופס משולב, שווקי Over 2.5, יחסים וחישובי הסתברות.",
};

export default function BunkerPage() {
  return <BunkerExperience />;
}
