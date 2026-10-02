import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Download,
  Phone,
  CheckCircle2,
  Copy,
  Check,
  Send,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Clock,
  Sparkles,
  User,
  AlertTriangle
} from 'lucide-react';
import { formatScanTime, formatIndianDateTime } from '../utils/timeFormat.ts';

export interface SmsRecord {
  id: string;
  roll: string;
  studentName: string;
  phone: string;
  sender: 'UDGHOSH' | string;
  message: string;
  sentAt: string;
  timestamp: number;
  status: 'DELIVERED' | string;
}

interface AdminSmsLogsTabProps {
  smsList: SmsRecord[];
  onRefresh: () => Promise<void> | void;
  onSendCustomSms?: (data: { phone: string; studentName: string; roll: string; message?: string }) => Promise<void>;
  onOpenPhonePreview: (sms: SmsRecord) => void;
}

export const AdminSmsLogsTab: React.FC<AdminSmsLogsTabProps> = ({
  smsList,
  onRefresh,
  onSendCustomSms,
  onOpenPhonePreview
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const [manualRoll, setManualRoll] = useState<string>('');
  const [manualMsg, setManualMsg] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<string>('');

  const stats = useMemo(() => {
    const total = smsList.length;
    const uniqueStudents = new Set(smsList.map((s) => s.roll.toUpperCase())).size;
    return { total, uniqueStudents };
  }, [smsList]);

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return smsList;
    return smsList.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.roll.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.message.toLowerCase().includes(q)
    );
  }, [smsList, searchTerm]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone || !manualName) return;
    setIsSending(true);
    try {
      if (onSendCustomSms) {
        await onSendCustomSms({
          phone: manualPhone,
          studentName: manualName,
          roll: manualRoll || 'HJMC',
          message: manualMsg || undefined
        });
      } else {
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: manualPhone,
            studentName: manualName,
            roll: manualRoll || 'HJMC',
            message: manualMsg || undefined
          })
        });
      }
      setSendSuccess(`✅ UDGHOSH SMS safalta-purvak bhej diya gaya +91 ${manualPhone} par!`);
      setManualPhone('');
      setManualName('');
      setManualRoll('');
      setManualMsg('');
      setTimeout(() => {
        setSendSuccess('');
        setShowSendModal(false);
      }, 1500);
      onRefresh();
    } catch {
      // Error handling
    } finally {
      setIsSending(false);
    }
  };

  const handleExportCSV = () => {
    if (smsList.length === 0) return;
    const headers = ['S.No', 'Student Name', 'Roll Number', 'Phone Number', 'Sender Name', 'Dispatched Time', 'Delivery Status', 'SMS Message Content'];
    const rows = smsList.map((s, idx) => [
      idx + 1,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.roll}"`,
      `"${s.phone}"`,
      `"${s.sender}"`,
      `"${s.sentAt}"`,
      `"${s.status}"`,
      `"${s.message.replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UDGHOSH_SMS_Dispatches_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official SMS Dispatch Gateway • Sender ID: UDGHOSH</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>UDGHOSH SMS Delivery Logs</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Pass scan hone ke baad student ke phone number par <strong>"UDGHOSH"</strong> naam se bheje gaye confirmation aur single-use expiry SMS ka poora record.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowSendModal(true)}
              className="px-3.5 py-2.5 rounded-xl gradient-party hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test SMS</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/20 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Total SMS Dispatched
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.total}</div>
          <p className="text-xs text-emerald-300 mt-1">Sabhi bachhon ke number par bheje gaye</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-purple-500/30 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Official Sender Name
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300">
            UDGHOSH
          </div>
          <p className="text-xs text-purple-300 mt-1">Verified Sender Header</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-amber-500/30 bg-amber-950/15 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Delivery Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">100%</div>
          <p className="text-xs text-amber-300 mt-1">Instant gate scan notification</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, roll number, phone number or SMS message..."
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              Clear
            </button>
          )}
        </div>

        {/* SMS List Table */}
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
            <p className="text-base font-bold text-white">Koi SMS record nahi mila</p>
            <p className="text-xs text-slate-400 mt-1">
              Pass scan hone par automatic SMS generate ho kar yahan dikhega.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-semibold">S.No</th>
                  <th className="py-3 px-3 font-semibold">Vidyarthi Ka Naam</th>
                  <th className="py-3 px-3 font-semibold">Roll Number</th>
                  <th className="py-3 px-3 font-semibold">Recipient Phone</th>
                  <th className="py-3 px-3 font-semibold">Sender Name</th>
                  <th className="py-3 px-3 font-semibold">Sent Time</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">SMS Preview</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredList.map((sms, index) => (
                  <tr key={sms.id || index} className="hover:bg-slate-850/50 transition duration-150">
                    <td className="py-3 px-3 text-slate-400 font-mono">{index + 1}</td>

                    <td className="py-3 px-3 font-bold text-white">
                      <span className="block">{sms.studentName}</span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-pink-400">
                      {sms.roll}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <a
                        href={`tel:${sms.phone}`}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>+91 {sms.phone}</span>
                      </a>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-extrabold text-[11px] border border-purple-500/40 tracking-wider">
                        {sms.sender}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-300 font-mono text-xs">
                      {sms.sentAt}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>DELIVERED</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      <p className="text-slate-300 text-xs truncate" title={sms.message}>
                        {sms.message}
                      </p>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenPhonePreview(sms)}
                          title="Phone screen par SMS preview dekhein"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopy(sms.id, sms.message)}
                          title="Copy SMS Message"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        >
                          {copiedId === sms.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={`sms:${sms.phone}?body=${encodeURIComponent(sms.message)}`}
                          title="Open in native mobile SMS app"
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Test SMS Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-card rounded-2xl max-w-md w-full p-6 border border-emerald-500/40 bg-slate-900 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Send SMS with Sender "udghosh_hjmc_swagtam_by_Aditya"</h3>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {sendSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs">
                {sendSuccess}
              </div>
            )}

            <form onSubmit={handleSendManual} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Phone Number (10 Digits)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Aarav Sharma"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Roll Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="24HJMC01"
                  value={manualRoll}
                  onChange={(e) => setManualRoll(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm uppercase focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Message (Leave empty for default portal message)
                </label>
                <textarea
                  rows={3}
                  placeholder={`🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${manualName || 'Student'}! Aapka registration scan hokar verify ho chuka hai...`}
                  value={manualMsg}
                  onChange={(e) => setManualMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl gradient-party text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Bhej Rahe Hain...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send UDGHOSH SMS</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
