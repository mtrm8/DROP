import { MessageCircle, ShieldCheck } from "lucide-react";
import { WHATSAPP_URL } from "./drop/community";

export default function CommunityFooter() {
  return (
    <footer className="premium-hairline border-t border-white/[0.06] mt-12 px-4 lg:px-8 py-8">
      <div className="max-w-xl mx-auto flex flex-col items-center gap-4 text-center">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl text-slate-950 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 hover:brightness-110 shadow-[0_0_22px_rgba(228,174,57,0.25)] transition active:scale-95 text-sm font-black flex items-center gap-2"
        >
          <MessageCircle size={16} />
          הצטרפו לקהילה בוואטסאפ
        </a>
        <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-slate-500" />
          MOSHA — קהילת כדורגל ופוקר · הדרוף ניתן בהפקדה הבאה בלבד
        </p>
      </div>
    </footer>
  );
}