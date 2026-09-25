import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Einstein Drop | איינשטיין דרופ",
  description:
    "Einstein Drop — איינשטיין דרופ. חוויית קלפים חכמה לקהילת הכדורגל והפוקר: בחרו קלפים, הפעילו את המכונה וחשפו את הפרס.",
  applicationName: "Einstein Drop",
  openGraph: {
    title: "Einstein Drop | איינשטיין דרופ",
    description: "חוויית קלפים חכמה, מדעית ומלאת הפתעות לקהילה.",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Einstein Drop | איינשטיין דרופ",
    description: "חוויית קלפים חכמה, מדעית ומלאת הפתעות לקהילה.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="text-slate-100 min-h-screen texture-carbon relative selection:bg-cyan-300 selection:text-slate-950 antialiased font-sans">
        {/* Cool scientific ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[460px] bg-hero-glow pointer-events-none z-0" />
        <div
          className="pointer-events-none absolute -right-40 top-[22%] z-0 h-[480px] w-[480px]"
          style={{ background: "radial-gradient(closest-side, rgba(34,211,238,0.12), transparent 72%)" }}
        />

        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
