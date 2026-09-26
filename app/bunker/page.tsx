import type { Metadata } from "next";
import BunkerExperience from "@/components/BunkerExperience";

export const metadata: Metadata = {
  title: "הבנקר · דוח אנליסט | איינשטיין דרופ",
  description: "דוח קדם־משחק מבוסס נתונים: קו מעל 2.5 שערים, מודל פואסון, ספי איזון, סיכון ותשואה ומעבדת שערים אינטראקטיבית.",
};

export default function BunkerPage() {
  return <BunkerExperience />;
}
