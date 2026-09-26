import type { Metadata } from "next";
import AIBunkerExperience from "@/components/AIBunkerExperience";

export const metadata: Metadata = {
  title: "בנקר AI · בפיתוח | איינשטיין דרופ",
  description: "מנוע AI אוטומטי לניתוח משחקים ויחסים — תצוגה מוקדמת למפתחים.",
};

export default function AIBunkerPage() {
  return <AIBunkerExperience />;
}
