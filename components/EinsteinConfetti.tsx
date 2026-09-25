"use client";

import { motion } from "framer-motion";

const COLORS = ["#052e2b", "#047857", "#10b981", "#2dd4bf", "#d4af37", "#fbbf24", "#ecfdf5"];

export default function EinsteinConfetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 64 }, (_, i) => {
        const color = COLORS[i % COLORS.length];
        const drift = ((i * 37) % 181) - 90;
        const size = 5 + (i % 4) * 2;
        return (
          <motion.span
            key={i}
            className="absolute -top-8"
            style={{
              left: `${(i * 47) % 100}%`,
              width: i % 5 === 0 ? size + 3 : size,
              height: i % 5 === 0 ? size + 3 : size * 1.7,
              borderRadius: i % 4 === 0 ? "50%" : "2px",
              border: "1px solid rgba(236,253,245,0.3)",
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}99`,
            }}
            initial={{ opacity: 0, y: "-5vh", x: 0, rotate: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: ["-5vh", "108vh"],
              x: [0, drift],
              rotate: [0, (i % 2 ? 1 : -1) * (360 + (i % 5) * 90)],
              scale: [0.6, 1, 0.8],
            }}
            transition={{
              delay: (i % 16) * 0.035,
              duration: 3.2 + (i % 5) * 0.12,
              ease: "easeIn",
            }}
          />
        );
      })}
    </div>
  );
}
