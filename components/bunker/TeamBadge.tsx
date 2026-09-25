"use client";

import { useId } from "react";

export type Country = "austria" | "israel" | "netherlands" | "germany";
const NAMES: Record<Country, string> = {
  austria: "אוסטריה", israel: "ישראל", netherlands: "הולנד", germany: "גרמניה",
};

// Original national-flag shields, not federation logos or official endorsements.
export default function TeamBadge({ country }: { country: Country }) {
  const clip = useId().replace(/:/g, "");
  const stripes = country === "austria" ? ["#ed2939", "#fff", "#ed2939"]
    : country === "netherlands" ? ["#ae1c28", "#fff", "#21468b"]
    : ["#161616", "#dd0000", "#ffce00"];
  return (
    <figure className="flex min-w-0 flex-col items-center gap-2 text-center">
      <svg viewBox="0 0 100 118" role="img" aria-label={`סמל מעוצב בצבעי דגל ${NAMES[country]}`}
        className="h-24 w-20 drop-shadow-[0_8px_18px_rgba(16,185,129,.18)] sm:h-28 sm:w-24">
        <defs><clipPath id={clip}><path d="M14 18 Q50 5 86 18 V65 Q84 90 50 105 Q16 90 14 65Z" /></clipPath></defs>
        <path d="M8 14 Q50 -1 92 14 V65 Q90 96 50 114 Q10 96 8 65Z" fill="#07110e" stroke="#d4af37" strokeWidth="1.5" />
        <g clipPath={`url(#${clip})`}>
          {country === "israel" ? <>
            <rect width="100" height="118" fill="#f8fafc" />
            <path d="M0 30H100M0 82H100" stroke="#1d4ed8" strokeWidth="9" />
            <path d="M50 40 66 67H34ZM50 76 34 49H66Z" fill="none" stroke="#1d4ed8" strokeWidth="2.4" />
          </> : stripes.map((color, index) => <rect key={index} x="0" y={index * 38} width="100" height="38" fill={color} />)}
          <path d="M14 0H50V118H14Z" fill="#fff" opacity=".09" />
        </g>
        <path d="M14 18 Q50 5 86 18 V65 Q84 90 50 105 Q16 90 14 65Z" fill="none" stroke="#fff" strokeOpacity=".4" />
      </svg>
      <figcaption className="text-base font-black text-white">{NAMES[country]}</figcaption>
    </figure>
  );
}
