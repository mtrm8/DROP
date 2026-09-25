import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        amber: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
        gold: {
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          glow: "#fbbf24",
        },
        crystal: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        }
      },
      boxShadow: {
        'neon-gold': '0 0 20px rgba(234, 179, 8, 0.4), inset 0 0 15px rgba(234, 179, 8, 0.2)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 15px rgba(6, 182, 212, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(circle at 45% 15%, rgba(34, 211, 238, 0.15) 0%, rgba(132, 204, 22, 0.05) 46%, transparent 74%)',
      },
    },
  },
  plugins: [],
};
export default config;
