import type { Metadata } from "next";
import BunkerExperience from "@/components/BunkerExperience";

export const metadata: Metadata = {
  title: "The Bunker | Einstein Drop",
  description: "מעבדת ההסתברויות של Einstein Drop — חישוב הדגמה אינטראקטיבי לאחר השלמת דרופ.",
};

export default function BunkerPage() {
  return <BunkerExperience />;
}
