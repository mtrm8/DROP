import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOSHA — הדרוף היומי של קהילת הכדורגל והפוקר",
  description:
    "MOSHA — הדרוף היומי של קהילת הכדורגל והפוקר. סבבו וזכו בבונוס או במתנה בשקלים בהפקדה הבאה. כניסה עם קוד הקהילה מהוואטסאפ.",
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
      <body className="text-slate-100 min-h-screen texture-carbon relative selection:bg-amber-400 selection:text-black antialiased font-sans">
        {/* Restrained gold + violet ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[460px] bg-hero-glow pointer-events-none z-0" />
        <div
          className="pointer-events-none absolute -right-40 top-[22%] z-0 h-[480px] w-[480px]"
          style={{ background: "radial-gradient(closest-side, rgba(124,58,237,0.09), transparent 72%)" }}
        />

        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
