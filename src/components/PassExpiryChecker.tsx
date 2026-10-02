import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Phone,
  MessageSquare,
  Smartphone,
  Send,
  Maximize2,
  Check
} from 'lucide-react';
import { formatScanTime, formatIndianDateTime, formatTimeInHindiWords } from '../utils/timeFormat.ts';
import { StudentRecord } from './OwnerSection.tsx';
import { EntryRecord } from '../App.tsx';
import { SmsRecord } from './AdminSmsLogsTab.tsx';

interface PassExpiryCheckerProps {
  students: StudentRecord[];
  entries: EntryRecord[];
  smsList: SmsRecord[];
  onApproveStudent?: (student: StudentRecord) => void;
  onPreviewPhoto?: (photo: { url: string; name: string; roll: string }) => void;
  onOpenPhonePreview?: (sms: SmsRecord) => void;
  variant?: 'admin' | 'owner';
}

export const PassExpiryChecker: React.FC<PassExpiryCheckerProps> = ({
  students,
  entries,
  smsList,
  onApproveStudent,
  onPreviewPhoto,
  onOpenPhonePreview,
  variant = 'admin'
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    student: StudentRecord;
    entryMatch?: EntryRecord;
    smsMatch?: SmsRecord;
    isExpired: boolean;
    expiredTime?: string;
    expiredTimeHindi?: string;
  } | null>(null);
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (!clean) {
      setSearchError('Kripya Roll Number ya Mobile Number dalein');
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    // Search in students list by roll, phone, id, or name
    const foundStudent = students.find((s) => {
      const sRoll = (s.roll || '').trim().toUpperCase();
      const sPhone = (s.phone || '').trim();
      const sId = (s.id || '').trim().toUpperCase();
      const sName = (s.name || '').trim().toUpperCase();
      return (
        sRoll === clean ||
        sPhone === clean ||
        sPhone.endsWith(clean) ||
        clean.endsWith(sPhone) ||
        sId === clean ||
        sName === clean
      );
    });

    if (!foundStudent) {
      setSearchError(`Koi registration record nahi mila ("${query}"). Kripya sahi Roll No. ya Mobile Number dalein.`);
      setSearchResult(null);
      setIsSearching(false);
      return;
    }

    const cleanRoll = foundStudent.roll.trim().toUpperCase();
    const entryMatch = entries.find((e) => e.roll.trim().toUpperCase() === cleanRoll);
    const smsMatch = smsList.find((s) => s.roll.trim().toUpperCase() === cleanRoll);

    const isExpired = Boolean(
      foundStudent.admitted ||
      foundStudent.isExpired ||
      entryMatch
    );

    const expiredTime =
      entryMatch?.scannedAt ||
      foundStudent.admittedAt ||
      (entryMatch?.timestamp ? formatScanTime(entryMatch.timestamp) : undefined);

    const expiredTimeHindi = entryMatch?.timestamp
      ? formatTimeInHindiWords(entryMatch.timestamp)
      : expiredTime
      ? formatTimeInHindiWords()
      : undefined;

    setSearchResult({
      student: foundStudent,
      entryMatch,
      smsMatch,
      isExpired,
      expiredTime,
      expiredTimeHindi
    });
    setIsSearching(false);
  };

  const handleClear = () => {
    setQuery('');
    setSearchResult(null);
    setSearchError('');
  };

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border shadow-xl relative overflow-hidden transition-all duration-200 ${
        variant === 'owner'
          ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/20'
          : 'bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/50 border-purple-500/40 ring-1 ring-purple-500/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
              variant === 'owner'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-purple-500/20 text-pink-300 border border-purple-500/40'
            }`}
          >
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span>Pehle Se Register Kiya Hai? Pass &amp; Expiry Check Karein</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Student ka Roll Number ya Mobile Number daal kar instant real-time registration, gate entry aur single-use pass expiry status dekhein.
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border self-start sm:self-center shrink-0 ${
            variant === 'owner'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
          }`}
        >
          {variant === 'owner' ? '👑 Owner Verification Tool' : '🛡️ Gatekeeper Admin Tool'}
        </span>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Roll Number (e.g. 24HJMC01) ya Mobile Number dalein..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 uppercase tracking-wide"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2.5 rounded-xl gradient-party text-white font-bold text-xs sm:text-sm shrink-0 flex items-center gap-1.5 shadow-lg shadow-pink-500/25 active:scale-95 transition cursor-pointer"
        >
          {isSearching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>Check Status</span>
        </button>
      </form>

      {/* Error Message */}
      {searchError && (
        <div className="mt-3 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Detailed Result Card */}
      {searchResult && (
        <div className="mt-4 p-4 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-xl space-y-3.5 animate-in fade-in zoom-in-95">
          {/* 1. Header with Pass Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Verification Result:
              </span>
              <span className="font-mono text-xs text-white font-bold">
                {searchResult.student.roll}
              </span>
            </div>

            {searchResult.isExpired ? (
              <span className="px-3 py-1 rounded-xl bg-red-950 text-red-200 text-xs font-black border-2 border-red-500 flex items-center gap-1.5 shadow">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>⛔ PASS STATUS: EXPIRED (Single-Use Completed)</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-200 text-xs font-black border-2 border-emerald-500 flex items-center gap-1.5 shadow">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>✅ PASS STATUS: ACTIVE (1-Time Single Use)</span>
              </span>
            )}
          </div>

          {/* 2. Student Info Details */}
          <div className="flex items-start sm:items-center gap-3.5">
            {searchResult.student.photoUrl ? (
              <div
                onClick={() =>
                  onPreviewPhoto &&
                  onPreviewPhoto({
                    url: searchResult.student.photoUrl!,
                    name: searchResult.student.name,
                    roll: searchResult.student.roll
                  })
                }
                className="relative group cursor-pointer shrink-0"
                title="Badi photo dekhein"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-pink-500 shadow-lg">
                  <img
                    src={searchResult.student.photoUrl}
                    alt={searchResult.student.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-black/80 text-[8px] text-pink-300 font-bold border border-slate-700 flex items-center gap-0.5">
                  <Maximize2 className="w-2 h-2" /> View
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0">
                <User className="w-7 h-7 text-slate-500" />
                <span className="text-[8px] text-slate-500">No Photo</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-white truncate">
                {searchResult.student.name}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 font-bold">
                  Roll: {searchResult.student.roll}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {searchResult.student.course || 'HJMC'}
                </span>
                {searchResult.student.phone && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    +91 {searchResult.student.phone}
                  </span>
                )}
                <span className="text-slate-400 text-[11px]">
                  ID: {searchResult.student.id}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Real-Time Timeline Grid: Registration vs Scan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Kab Register Kiya Tha */}
            <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200">
              <span className="text-[10px] uppercase font-bold text-purple-300 block mb-1">
                📅 Registration Record:
              </span>
              <div className="flex items-center gap-1.5 font-mono text-white font-semibold">
                <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>
                  {searchResult.student.registeredAt
                    ? formatIndianDateTime(searchResult.student.registeredAt)
                    : 'Pehle se verified'}
                </span>
              </div>
              <span className="text-[11px] text-purple-300 mt-1 block">
                ✓ Student portal par pehle hi register ho chuka hai.
              </span>
            </div>

            {/* Scan / Expiry Info */}
            <div
              className={`p-3 rounded-xl border text-xs ${
                searchResult.isExpired
                  ? 'bg-red-950/70 border-red-500/50 text-red-200'
                  : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block mb-1">
                {searchResult.isExpired ? '⛔ Pass Expiration Info:' : '✅ Pass Validity Info:'}
              </span>
              {searchResult.isExpired ? (
                <>
                  <div className="flex items-center gap-1.5 font-mono text-amber-300 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Scanned at: {searchResult.expiredTime || 'Verified'}</span>
                  </div>
                  {searchResult.expiredTimeHindi && (
                    <span className="text-[11px] text-red-200 mt-0.5 block font-medium">
                      🕒 Pehli baar scan: {searchResult.expiredTimeHindi}
                    </span>
                  )}
                  <span className="text-[10px] text-red-300 font-semibold mt-1 block">
                    Yeh pass dobara kisi bhi scanner par kaam nahi karega!
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Pass abhi Active hai (Unused)</span>
                  </div>
                  <span className="text-[11px] text-emerald-200 mt-0.5 block">
                    Gate par 1 baar scan hote hi pass expire ho jayega.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 4. UDGHOSH Portal SMS Notification Details */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-purple-950/80 border border-emerald-500/40 text-xs space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-white">
                  📲 Official Portal SMS: <span className="text-pink-300 font-mono">udghosh_hjmc_swagtam_by_Aditya</span>
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  searchResult.isExpired
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {searchResult.isExpired ? '✅ DELIVERED' : '⏳ Ready on Gate Scan'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              {searchResult.isExpired
                ? `Student ke mobile (+91 ${searchResult.student.phone || 'N/A'}) par sender "udghosh_hjmc_swagtam_by_Aditya" se portal OTP style verification SMS deliver ho chuka hai.`
                : `Gate par scan hote hi student ke mobile (+91 ${searchResult.student.phone || 'N/A'}) par "udghosh_hjmc_swagtam_by_Aditya" naam se automated SMS chala jayega.`}
            </p>

            <div className="pt-1 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const smsObj: SmsRecord = searchResult.smsMatch || {
                    id: 'SMS-' + Date.now(),
                    roll: searchResult.student.roll,
                    studentName: searchResult.student.name,
                    phone: searchResult.student.phone || '',
                    sender: 'udghosh_hjmc_swagtam_by_Aditya',
                    message: `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${searchResult.student.name}! Aapka registration (${searchResult.student.roll}) QR scan hokar safalta-purvak verify ho chuka hai aur Gate Entry allow kar di gayi hai. Aapka single-use pass ab EXPIRE ho gaya hai. Swagatam! - udghosh_hjmc_swagtam_by_Aditya`,
                    sentAt: searchResult.expiredTime || formatScanTime(),
                    timestamp: Date.now(),
                    status: 'DELIVERED'
                  };
                  if (onOpenPhonePreview) onOpenPhonePreview(smsObj);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-pink-300" />
                <span>📱 View Phone SMS Notification</span>
              </button>

              {searchResult.student.phone && (
                <>
                  <a
                    href={`https://wa.me/91${searchResult.student.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                      `🎉 *BRAC HJMC • UDGHOSH FRESHER PARTY 2026* 🎉\n🔐 *Portal Verification:* udghosh_hjmc_swagtam_by_Aditya\n\nनमस्ते *${searchResult.student.name}*!\nआपकी वेबसाइट पर रजिस्ट्रेशन रिकॉर्ड:\n\n🎫 *Roll No:* ${searchResult.student.roll}\n📚 *Course:* ${searchResult.student.course || 'HJMC'}\n🛡️ *Pass Status:* ${searchResult.isExpired ? '⛔ EXPIRED (Gate Entry Completed)' : '✅ ACTIVE (Single-Use Entry Pass)'}\n\nधन्यवाद!\n- *udghosh_hjmc_swagtam_by_Aditya*`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
                  >
                    <span>💬 Direct WhatsApp</span>
                  </a>
                  <a
                    href={`sms:${searchResult.student.phone}?body=${encodeURIComponent(
                      `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${searchResult.student.name}! Aapka fresher party pass (${searchResult.student.roll}) verify ho chuka hai aur ab EXPIRE ho gaya hai.`
                    )}`}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5 text-slate-400" />
                    <span>SMS App</span>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* 5. Quick Action Button if Student is ACTIVE and gatekeeper wants to admit */}
          {!searchResult.isExpired && onApproveStudent && (
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  onApproveStudent(searchResult.student);
                  setSearchResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          isExpired: true,
                          expiredTime: formatScanTime(),
                          expiredTimeHindi: formatTimeInHindiWords()
                        }
                      : null
                  );
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>⚡ Gate Entry Approve Karein (Expire Pass &amp; Send SMS)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
