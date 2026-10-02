import React from 'react';
import {
  Smartphone,
  X,
  CheckCircle2,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Sparkles,
  Phone,
  Signal,
  Wifi,
  Battery
} from 'lucide-react';
import { SmsRecord } from './AdminSmsLogsTab.tsx';

interface PhoneSmsModalProps {
  sms: SmsRecord | null;
  onClose: () => void;
}

export const PhoneSmsModal: React.FC<PhoneSmsModalProps> = ({ sms, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!sms) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sms.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative max-w-sm w-full">
        {/* Close Button top-right */}
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 text-white/80 hover:text-white bg-slate-800/80 hover:bg-slate-700 p-2 rounded-full border border-slate-600 transition"
          title="Close Phone Preview"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Smartphone Chassis */}
        <div className="bg-slate-950 rounded-[44px] p-3.5 border-4 border-slate-700/80 shadow-2xl ring-1 ring-white/10 overflow-hidden relative">
          {/* Inner Screen */}
          <div className="bg-slate-900 rounded-[34px] overflow-hidden border border-slate-800 flex flex-col h-[580px] text-slate-100 relative">
            {/* Status Bar */}
            <div className="px-6 pt-3 pb-2 flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-800/60 bg-slate-950/70">
              <span className="font-mono text-white">{sms.sentAt.split(' ')[0] || '12:30'}</span>
              {/* Dynamic Island / Notch */}
              <div className="w-20 h-4 rounded-full bg-black border border-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-300">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Messaging App Header */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                    UD
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide truncate max-w-[190px]">
                      {sms.sender || 'udghosh_hjmc_swagtam_by_Aditya'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 text-pink-400" /> Verified
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block">
                    To: +91 {sms.phone} • {sms.studentName}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-full bg-slate-800 text-slate-400">
                <Phone className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
              <div className="flex items-center justify-center">
                <span className="px-3 py-1 rounded-full bg-slate-800/80 text-[10px] text-slate-400 font-semibold border border-slate-700/60 shadow-inner">
                  Today • Official SMS Gateway
                </span>
              </div>

              {/* Single Use Pass Expired Notice Banner in SMS */}
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Pass scan hote hi student ko automated SMS dispatch kiya gaya hai.</span>
              </div>

              {/* Incoming SMS Bubble */}
              <div className="flex flex-col items-start max-w-[92%] space-y-1">
                <div className="bg-gradient-to-br from-indigo-950/90 via-slate-800 to-purple-950/80 border border-purple-500/40 p-3.5 rounded-2xl rounded-tl-sm text-slate-100 shadow-xl relative text-xs sm:text-[13px] leading-relaxed">
                  <div className="font-bold text-pink-400 text-xs mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-pink-400" />
                    <span>UDGHOSH Official Gate Verification</span>
                  </div>
                  <p className="whitespace-pre-wrap">{sms.message}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 text-[10px] text-slate-400 font-mono">
                  <span>{sms.sentAt}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Delivered
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar inside chassis */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SMS</span>
                  </>
                )}
              </button>

              <a
                href={`sms:${sms.phone}?body=${encodeURIComponent(sms.message)}`}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in SMS App</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
