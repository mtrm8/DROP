import type { Metadata } from "next";
import BunkerExperience from "@/components/BunkerExperience";

export const metadata: Metadata = {
  applicationName: "איינשטיין דרופ",
  title: "הבנקר · דוח אנליסט בעברית | איינשטיין דרופ",
  description: "דוח קדם-משחק לאוסטריה–ישראל והולנד–גרמניה: מעל 2.5 שערים, ניתוח יחסים, גרפים ותרחישי סיכון–תשואה.",
  openGraph: {
    title: "הבנקר · דוח אנליסט | איינשטיין דרופ",
    description: "ניתוח בחירות מעל 2.5 שערים, ספי איזון והחזר אפשרי בטופס משולב.",
    locale: "he_IL",
  },
  twitter: {
    card: "summary",
    title: "הבנקר · דוח אנליסט | איינשטיין דרופ",
    description: "סקירת קדם-משחק מלאה בעברית עם גרפים וניתוח סיכון–תשואה.",
  },
};

export default function BunkerPage() {
  return <BunkerExperience />;
}
