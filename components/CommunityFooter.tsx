import { MessageCircle, ShieldCheck } from "lucide-react";
import { WHATSAPP_URL } from "./drop/community";

export default function CommunityFooter({ hebrewBrand = false }: { hebrewBrand?: boolean }) {
  return (
    <footer className="premium-hairline w-full border-t border-white/[0.06] mt-8 sm:mt-12 px-4 lg:px-8 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-xs sm:w-auto px-5 py-3 rounded-xl text-slate-950 bg-gradient-to-br from-cyan-200 via-cyan-400 to-lime-300 hover:brightness-110 shadow-[0_0_22px_rgba(34,211,238,0.25)] transition active:scale-95 text-sm font-black flex items-center justify-center gap-2"
        >
          <MessageCircle size={16} className="shrink-0" />
          <span className="truncate">הצטרפו לקהילה בוואטסאפ</span>
        </a>
        <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-slate-500" />
          {hebrewBrand ? "איינשטיין דרופ" : "Einstein Drop · איינשטיין דרופ"} — קהילת כדורגל ופוקר
        </p>
      </div>
    </footer>
  );
}
