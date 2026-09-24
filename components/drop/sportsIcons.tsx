"use client";

import { useId } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

const svgProps = (size?: number, className?: string) => ({
  width: size ?? 24,
  height: size ?? 24,
  viewBox: "0 0 24 24",
  className,
  fill: "none",
});

// Shared premium rendering kit: deep metallic gradients, sphere lighting,
// glass gloss and grounding shadows — so every icon reads as a lit 3D object.
function GoldKit({ id }: { id: string }) {
  return (
    <>
      {/* metallic gold, lit from the top-left */}
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="#fff0b3" />
        <stop offset="0.35" stopColor="#f4d671" />
        <stop offset="0.6" stopColor="#d9a83c" />
        <stop offset="0.82" stopColor="#9c7a22" />
        <stop offset="1" stopColor="#6e5416" />
      </linearGradient>
      {/* radial sphere shading: brilliant top-left, rich dark recess */}
      <radialGradient id={`${id}-sphere`} cx="0.35" cy="0.28" r="1.05">
        <stop offset="0" stopColor="#fff3c0" />
        <stop offset="0.28" stopColor="#f0cc68" />
        <stop offset="0.55" stopColor="#d9a83c" />
        <stop offset="0.8" stopColor="#8f6b1f" />
        <stop offset="1" stopColor="#472f0b" />
      </radialGradient>
      {/* bright piercing highlight */}
      <linearGradient id={`${id}-pale`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff6c9" />
        <stop offset="1" stopColor="#d4a539" />
      </linearGradient>
      {/* dark graphite for card recesses / chip edges */}
      <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#262d3e" />
        <stop offset="0.55" stopColor="#131722" />
        <stop offset="1" stopColor="#090b11" />
      </linearGradient>
      {/* glass gloss streak */}
      <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="rgba(255,255,255,0.42)" />
        <stop offset="0.45" stopColor="rgba(255,255,255,0.08)" />
        <stop offset="1" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
      {/* ground shadow */}
      <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="rgba(0,0,0,0.55)" />
        <stop offset="1" stopColor="rgba(0,0,0,0)" />
      </radialGradient>
    </>
  );
}

// ---- Football: beveled metallic crest shield ----
export function CrestIcon({ size, className }: IconProps) {
  const uid = useId();
  const shield =
    "M12 2.6 18.9 4.9 V10.9 C18.9 15.6 15.9 19 12 21.6 8.1 19 5.1 15.6 5.1 10.9 V4.9 Z";
  return (
    <svg {...svgProps(size, className)}>
      <defs>
        <GoldKit id={uid} />
        <clipPath id={`${uid}-clip`}>
          <path d={shield} />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx="12" cy="21.1" rx="5.4" ry="1.2" fill={`url(#${uid}-shadow)`} />
      {/* metallic bevel rim */}
      <path d={shield} fill={`url(#${uid}-metal)`} />
      {/* recessed inner face */}
      <path
        d="M12 5 17.4 6.9 V10.9 C17.4 14.8 15.1 17.7 12 19.9 8.9 17.7 6.6 14.8 6.6 10.9 V6.9 Z"
        fill={`url(#${uid}-dark)`}
      />
      <g clipPath={`url(#${uid}-clip)`}>
        {/* diagonal championship band */}
        <path d="M5.2 10.3 18.8 6.2 18.8 9.8 5.6 13.8 Z" fill={`url(#${uid}-metal)`} opacity="0.96" />
        <path d="M6.1 11.1 17.9 7.3" stroke="#7a5c18" strokeWidth="0.6" opacity="0.55" />
        {/* glass sheen */}
        <path d="M4.4 6.4 Q12 3.6 19.6 6.4 L19.6 13.4 Q12 10.2 4.4 13.4 Z" fill={`url(#${uid}-gloss)`} opacity="0.8" />
      </g>
      {/* rim specular top-left + laurel marks */}
      <path d="M7.2 5.3 Q12 3.4 16.8 5.3" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
      <path d="M7.3 8.2 8.7 9.5 M16.7 8.2 15.3 9.5" stroke={`url(#${uid}-metal)`} strokeWidth="1" strokeLinecap="round" />
      <circle cx="8.9" cy="6.9" r="1.05" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

// ---- Football: glossy golden match ball (sphere) ----
export function BallIcon({ size, className }: IconProps) {
  const uid = useId();
  return (
    <svg {...svgProps(size, className)}>
      <defs>
        <GoldKit id={uid} />
        <clipPath id={`${uid}-bclip`}>
          <circle cx="12" cy="11.6" r="9" />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx="12" cy="20.9" rx="6" ry="1.35" fill={`url(#${uid}-shadow)`} />
      {/* sphere body */}
      <circle cx="12" cy="11.6" r="9" fill={`url(#${uid}-sphere)`} />
      <circle cx="12" cy="11.6" r="9" fill="none" stroke="rgba(71,47,11,0.55)" strokeWidth="1.6" opacity="0.7" />

      {/* classic panel seams */}
      <g stroke="#8a6a20" strokeWidth="0.8" strokeLinejoin="round">
        <path d="M12 5.3 15.9 7.9 14.3 12.4 H9.7 L8.1 7.9 Z" fill="#0e1118" strokeWidth="0.9" />
        <path d="M12 5.3 V3.4 M15.9 7.9 18.8 7.2 M14.3 12.4 17.7 14.3 M9.7 12.4 6.3 14.3 M8.1 7.9 5.2 7.2" strokeLinecap="round" />
        <path d="M7.6 9.9 6.4 12.6 M16.4 9.9 17.6 12.6 M12 12.4 12 14.6" strokeLinecap="round" opacity="0.65" />
      </g>
      {/* top-adjacent panel hints */}
      <path d="M8.1 7.9 6.4 8.6 M15.9 7.9 17.6 8.6" stroke="rgba(138,106,32,0.7)" strokeWidth="0.8" strokeLinecap="round" />

      {/* glass gloss + specular */}
      <g clipPath={`url(#${uid}-bclip)`}>
        <ellipse cx="8.2" cy="7" rx="6.6" ry="3.6" fill={`url(#${uid}-gloss)`} transform="rotate(-22 8.2 7)" opacity="0.95" />
      </g>
      <circle cx="8.4" cy="7.3" r="1.05" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

// ---- Poker: single luxury chip with beveled edge ----
export function ChipIcon({ size, className }: IconProps) {
  const uid = useId();
  const pockets = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg {...svgProps(size, className)}>
      <defs>
        <GoldKit id={uid} />
        <clipPath id={`${uid}-cclip`}>
          <circle cx="12" cy="11.8" r="9.1" />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx="12" cy="20.7" rx="6.2" ry="1.45" fill={`url(#${uid}-shadow)`} />
      {/* coin body + dark edge bevel */}
      <circle cx="12" cy="11.8" r="9.1" fill={`url(#${uid}-sphere)`} />
      <circle cx="12" cy="11.8" r="9.1" fill="none" stroke="rgba(71,47,11,0.55)" strokeWidth="1.9" />
      <circle cx="12" cy="11.8" r="7.9" fill="none" stroke={`url(#${uid}-metal)`} strokeWidth="1.1" />
      {/* text ring */}
      <circle cx="12" cy="11.8" r="5.6" fill="none" stroke={`url(#${uid}-pale)`} strokeWidth="1.2" opacity="0.95" />
      {/* edge pockets */}
      {pockets.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 12 + Math.cos(rad) * 8.6;
        const y1 = 11.8 + Math.sin(rad) * 8.6;
        const x2 = 12 + Math.cos(rad) * 7;
        const y2 = 11.8 + Math.sin(rad) * 7;
        return (
          <path
            key={i}
            d={`M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}`}
            stroke="#efd489"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.95"
          />
        );
      })}
      {/* glass sheen + specular rim */}
      <g clipPath={`url(#${uid}-cclip)`}>
        <path d="M4.2 8.2 Q12 4.9 19.8 8.2 L19.8 12.4 L4.2 12.4 Z" fill={`url(#${uid}-gloss)`} opacity="0.9" />
      </g>
      <path d="M6.7 6.7 A7.2 7.2 0 0 1 11.2 3.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// ---- Poker: 3D stack of luxury chips ----
export function StackIcon({ size, className }: IconProps) {
  const uid = useId();
  const seam = "rgba(217,168,60,0.65)";
  return (
    <svg {...svgProps(size, className)}>
      <defs>
        <GoldKit id={uid} />
      </defs>
      {/* ground shadow */}
      <ellipse cx="12" cy="21.3" rx="7.8" ry="1.8" fill={`url(#${uid}-shadow)`} />

      {/* bottom chip */}
      <rect x="4.5" y="15.4" width="15" height="3.3" rx="1.1" fill={`url(#${uid}-dark)`} />
      <ellipse cx="12" cy="15.4" rx="7.5" ry="2.6" fill={`url(#${uid}-sphere)`} />
      <ellipse cx="12" cy="15.4" rx="7.5" ry="2.6" fill="none" stroke="rgba(71,47,11,0.5)" strokeWidth="0.85" />

      {/* middle chip */}
      <rect x="5.1" y="12.8" width="13.8" height="2.8" rx="1" fill={`url(#${uid}-dark)`} />
      <ellipse cx="12" cy="12.8" rx="6.9" ry="2.45" fill={`url(#${uid}-sphere)`} />
      <ellipse cx="12" cy="12.8" rx="6.9" ry="2.45" fill="none" stroke="rgba(71,47,11,0.5)" strokeWidth="0.85" />

      {/* top chip */}
      <rect x="5.8" y="10.2" width="12.4" height="2.55" rx="1" fill={`url(#${uid}-dark)`} />
      <ellipse cx="12" cy="10.2" rx="6.2" ry="2.3" fill={`url(#${uid}-sphere)`} />
      <ellipse cx="12" cy="10.2" rx="6.2" ry="2.3" fill="none" stroke="rgba(71,47,11,0.5)" strokeWidth="0.85" />

      {/* side seams */}
      <path d="M7.2 10.7 V18.5 M12 10.4 V18.5 M16.8 10.7 V18.5" stroke={seam} strokeWidth="0.7" opacity="0.8" />
      <path d="M5.4 15.4 V18.4 M5.9 12.8 V15.6" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
      {/* top shine + face highlight */}
      <path d="M6.2 9.7 Q12 7.9 17.8 9.7" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <ellipse cx="9.2" cy="9.2" rx="2.6" ry="0.9" fill="rgba(255,255,255,0.16)" transform="rotate(-18 9.2 9.2)" />
    </svg>
  );
}

// ---- Poker: royal ace of spades card (beveled frame) ----
export function CardIcon({ size, className }: IconProps) {
  const uid = useId();
  return (
    <svg {...svgProps(size, className)}>
      <defs>
        <GoldKit id={uid} />
        <clipPath id={`${uid}-kclip`}>
          <rect x="4.9" y="3.9" width="14.2" height="16.2" rx="1.7" />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx="12.6" cy="22" rx="4.6" ry="0.95" fill={`url(#${uid}-shadow)`} />
      {/* outer metallic bevel frame */}
      <rect x="4" y="2.9" width="16" height="18.1" rx="2.4" fill={`url(#${uid}-metal)`} />
      {/* recessed dark face */}
      <rect x="4.9" y="3.9" width="14.2" height="16.2" rx="1.7" fill={`url(#${uid}-dark)`} />
      {/* hairline inner gold frame */}
      <rect x="6.4" y="5.4" width="11.2" height="13.2" rx="1.2" fill="none" stroke="rgba(217,168,60,0.5)" strokeWidth="0.8" />
      {/* top edge light */}
      <path d="M6.4 5.15 H17.6" stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" strokeLinecap="round" />
      {/* glass sheen */}
      <g clipPath={`url(#${uid}-kclip)`}>
        <path d="M3.4 6 Q12 3.6 20.6 6 L20.6 12.2 L3.4 12.2 Z" fill={`url(#${uid}-gloss)`} opacity="0.75" />
      </g>
      {/* corner pips */}
      <path d="M6.8 5.9 a1.15 1.15 0 0 1 1.15 1.15 v.3 M6.9 9.4 v-1.9" stroke={`url(#${uid}-pale)`} strokeWidth="0.75" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M17.2 18.1 a1.15 1.15 0 0 1 -1.15 1.15 v-.3 M17.1 14.6 v1.9" stroke={`url(#${uid}-pale)`} strokeWidth="0.75" fill="none" strokeLinecap="round" opacity="0.85" transform="rotate(180 12 12)" />
      {/* embossed centre spade */}
      <path d="M12 6.8 C10.2 9 8.2 9.6 8.2 12 A3.8 3.8 0 0 0 12 15.8 A3.8 3.8 0 0 0 15.8 12 C15.8 9.6 13.8 9 12 6.8 Z" stroke="#52390f" strokeWidth="0.9" strokeLinejoin="round" fill={`url(#${uid}-pale)`} />
      <path d="M12 15.2 V17.4" stroke={`url(#${uid}-metal)`} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9.4 17.6 H14.6 L12 19.9 Z" stroke="#52390f" strokeWidth="0.8" strokeLinejoin="round" fill={`url(#${uid}-pale)`} />
    </svg>
  );
}

// ---- Poker: royal king card with embossed crown ----
export function KingIcon({ size, className }: IconProps) {
  const uid = useId();
  return (
    <svg {...svgProps(size, className)}>
      <defs>
        <GoldKit id={uid} />
        <clipPath id={`${uid}-kclip`}>
          <rect x="4.9" y="3.9" width="14.2" height="16.2" rx="1.7" />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx="12.6" cy="22" rx="4.6" ry="0.95" fill={`url(#${uid}-shadow)`} />
      {/* outer metallic bevel frame */}
      <rect x="4" y="2.9" width="16" height="18.1" rx="2.4" fill={`url(#${uid}-metal)`} />
      {/* recessed dark face */}
      <rect x="4.9" y="3.9" width="14.2" height="16.2" rx="1.7" fill={`url(#${uid}-dark)`} />
      <rect x="6.4" y="5.4" width="11.2" height="13.2" rx="1.2" fill="none" stroke="rgba(217,168,60,0.5)" strokeWidth="0.8" />
      <path d="M6.4 5.15 H17.6" stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" strokeLinecap="round" />
      {/* glass sheen */}
      <g clipPath={`url(#${uid}-kclip)`}>
        <path d="M3.4 6 Q12 3.6 20.6 6 L20.6 12.2 L3.4 12.2 Z" fill={`url(#${uid}-gloss)`} opacity="0.75" />
      </g>
      {/* embossed crown */}
      <path
        d="M7.1 8.1 9.2 6.5 12 8.8 14.8 6.5 16.9 8.1 V10.9 H7.1 Z"
        stroke="#52390f"
        strokeWidth="0.8"
        strokeLinejoin="round"
        fill={`url(#${uid}-sphere)`}
      />
      <path d="M7.1 10.9 H16.9 V12.7 H7.1 Z" fill="none" stroke="#52390f" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M9 7.6 Q12 6.6 15 7.9" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      {/* royal K */}
      <path
        d="M8.5 13.9 V19.6 M8.5 16.7 H13.4 L17.3 13.9 M8.5 16.7 L13 19.6 M10.8 16.7 12.7 19.6"
        stroke={`url(#${uid}-metal)`}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 13.6 V19.9 M8.2 17 V16.4 H13.4 L17.3 13.6 M8.2 17 L13.3 19.9 M11 17 12.6 19.5"
        stroke="rgba(74,50,12,0.45)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}

// ---- Navbar mark: gold trophy with laurel accents ----
export function TrophyIcon({ size = 26, className }: IconProps) {
  const uid = useId();
  return (
    <svg {...svgProps(size, className)}>
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#e4ae39" />
          <stop offset="1" stopColor="#b57e1e" />
        </linearGradient>
        <radialGradient id={`${uid}-sheen`} cx="0.32" cy="0.25" r="1.1">
          <stop offset="0" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {/* ground shadow */}
      <ellipse cx="12" cy="22.2" rx="4.6" ry="0.9" fill="rgba(0,0,0,0.4)" />
      {/* cup */}
      <path d="M8.2 3.4 H15.8 V7.4 a3.8 3.8 0 0 1 -7.6 0 Z" fill={`url(#${uid}-gold)`} />
      <ellipse cx="12" cy="7.8" rx="4.6" ry="1.15" fill={`url(#${uid}-sheen)`} opacity="0.6" />
      <rect x="8.2" y="7" width="7.6" height="1.15" rx="0.55" fill="#0b0d13" opacity="0.85" />
      {/* handles */}
      <path d="M8.2 4.5 C6.4 4.5 5 5.8 5 7.3 C5 8.6 6 9.6 7.2 9.85" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M15.8 4.5 C17.6 4.5 19 5.8 19 7.3 C19 8.6 18 9.6 16.8 9.85" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="1.1" strokeLinecap="round" />
      {/* stem + base */}
      <rect x="11.3" y="10.8" width="1.4" height="3.1" rx="0.7" fill={`url(#${uid}-gold)`} />
      <path d="M9.2 13.9 H14.8 V15.4 H9.2 Z" fill={`url(#${uid}-gold)`} />
      <path d="M10.3 15.4 H13.7 V16.9 H10.3 Z" fill={`url(#${uid}-gold)`} />
    </svg>
  );
}