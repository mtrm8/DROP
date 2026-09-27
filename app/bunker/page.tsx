import type { Metadata } from "next";
import AnalystBunker from "@/components/AnalystBunker";

export const metadata: Metadata = {
  title: "בונקר האנליסט · בחירות ידניות | איינשטיין דרופ",
  description: "בחירות האנליסט האנושי: נתוני כושר, נימוקים, סיכונים וגרפים על בסיס דוח שהוזן ידנית.",
};

export default function BunkerPage() {
  return <AnalystBunker />;
}
