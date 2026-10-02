import React, { useState, useMemo } from 'react';
import {
  Crown,
  Search,
  Filter,
  Users,
  UserCheck2,
  Clock,
  Download,
  Printer,
  RefreshCw,
  Phone,
  Maximize2,
  CheckCircle2,
  XCircle,
  LogOut,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  User,
  Ticket,
  Calendar,
  Layers,
  FileSpreadsheet,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { formatScanTime, formatIndianDateTime, formatTimeInHindiWords } from '../utils/timeFormat.ts';
import { AdminSmsLogsTab, SmsRecord } from './AdminSmsLogsTab.tsx';
import { PassExpiryChecker } from './PassExpiryChecker.tsx';

export interface StudentRecord {
  id: string;
  name: string;
  roll: string;
  phone: string;
  course: string;
  photoUrl?: string;
  registeredAt: number;
  admitted?: boolean;
  admittedAt?: string;
  admittedTimestamp?: number;
  isExpired?: boolean;
  expiredAt?: string;
  smsSent?: boolean;
  smsSentAt?: string;
  smsMessage?: string;
}

export interface EntryRecord {
  id: string;
  name: string;
  roll: string;
  phone?: string;
  course?: string;
  scannedAt: string;
  timestamp: number;
  photoUrl?: string;
  approvedBy?: string;
}

interface OwnerSectionProps {
  students: StudentRecord[];
  entries: EntryRecord[];
  smsList?: SmsRecord[];
  onRefresh: () => Promise<void> | void;
  onLogout: () => void;
  onPreviewPhoto: (photo: { url: string; name: string; roll: string }) => void;
  onOpenPhonePreview?: (sms: SmsRecord) => void;
}

export const OwnerSection: React.FC<OwnerSectionProps> = ({
  students,
  entries,
  smsList = [],
  onRefresh,
  onLogout,
  onPreviewPhoto,
  onOpenPhonePreview = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'master' | 'registrations' | 'entries' | 'sms'>('master');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'admitted' | 'pending'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Sync admitted status from entries into students if not already flagged
  const mergedStudents = useMemo(() => {
    const entryMap = new Map<string, EntryRecord>();
    entries.forEach((e) => {
      entryMap.set(e.roll.trim().toUpperCase(), e);
    });

    return students.map((s) => {
      const entry = entryMap.get(s.roll.trim().toUpperCase());
      if (entry) {
        return {
          ...s,
          admitted: true,
          admittedAt: s.admittedAt || entry.scannedAt,
          admittedTimestamp: s.admittedTimestamp || entry.timestamp,
          photoUrl: s.photoUrl || entry.photoUrl
        };
      }
      return s;
    });
  }, [students, entries]);

  const stats = useMemo(() => {
    const totalReg = mergedStudents.length;
    const totalEntries = entries.length;
    const pending = Math.max(0, totalReg - totalEntries);
    const rate = totalReg > 0 ? Math.round((totalEntries / totalReg) * 100) : 0;
    return { totalReg, totalEntries, pending, rate };
  }, [mergedStudents, entries]);

  // Filtered lists
  const filteredStudents = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return mergedStudents.filter((student) => {
      const matchSearch =
        !cleanSearch ||
        student.name.toLowerCase().includes(cleanSearch) ||
        student.roll.toLowerCase().includes(cleanSearch) ||
        (student.phone && student.phone.includes(cleanSearch)) ||
        student.id.toLowerCase().includes(cleanSearch);

      if (!matchSearch) return false;

      if (filterStatus === 'admitted') return student.admitted;
      if (filterStatus === 'pending') return !student.admitted;
      return true;
    });
  }, [mergedStudents, searchTerm, filterStatus]);

  const filteredEntries = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!cleanSearch) return true;
      return (
        entry.name.toLowerCase().includes(cleanSearch) ||
        entry.roll.toLowerCase().includes(cleanSearch) ||
        (entry.phone && entry.phone.includes(cleanSearch)) ||
        entry.id.toLowerCase().includes(cleanSearch)
      );
    });
  }, [entries, searchTerm]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // CSV Export for Master View
  const handleExportMasterCSV = () => {
    if (mergedStudents.length === 0) return;
    const headers = [
      'S.No',
      'Student Name',
      'Roll Number',
      'Phone Number',
      'Course',
      'Registration Time',
      'Entry Status',
      'Gate Entry Time',
      'Pass ID'
    ];
    const rows = mergedStudents.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.roll}"`,
      `"${s.phone || 'N/A'}"`,
      `"${s.course || 'HJMC'}"`,
      `"${formatIndianDateTime(s.registeredAt)}"`,
      `"${s.admitted ? 'ADMITTED / ARRIVED' : 'NOT ARRIVED'}"`,
      `"${s.admitted ? (s.admittedAt ? formatScanTime(s.admittedAt) : 'ARRIVED') : '-'}"`,
      `"${s.id}"`
    ]);

    downloadCSV(
      headers,
      rows,
      `Owner_Master_Attendance_HJMC_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // CSV Export for Entries Only
  const handleExportEntriesCSV = () => {
    if (entries.length === 0) return;
    const headers = [
      'S.No',
      'Student Name',
      'Roll Number',
      'Phone Number',
      'Course',
      'Gate Entry Time',
      'Pass ID',
      'Approved By'
    ];
    const rows = entries.map((e, idx) => [
      idx + 1,
      `"${e.name.replace(/"/g, '""')}"`,
      `"${e.roll}"`,
      `"${e.phone || 'N/A'}"`,
      `"${e.course || 'HJMC'}"`,
      `"${formatScanTime(e.scannedAt || e.timestamp)}"`,
      `"${e.id}"`,
      `"${e.approvedBy || 'Gate Admin'}"`
    ]);

    downloadCSV(
      headers,
      rows,
      `Owner_Gate_Entries_HJMC_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // CSV Export for Registrations Only
  const handleExportRegistrationsCSV = () => {
    if (students.length === 0) return;
    const headers = [
      'S.No',
      'Student Name',
      'Roll Number',
      'Phone Number',
      'Course',
      'Registration Date & Time',
      'Status',
      'Pass ID'
    ];
    const rows = students.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.roll}"`,
      `"${s.phone || 'N/A'}"`,
      `"${s.course || 'HJMC'}"`,
      `"${formatIndianDateTime(s.registeredAt)}"`,
      `"${s.admitted ? 'Admitted' : 'Pending'}"`,
      `"${s.id}"`
    ]);

    downloadCSV(
      headers,
      rows,
      `Owner_All_Registrations_HJMC_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/70 via-purple-950/70 to-slate-900 border border-amber-500/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-3 shadow">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>👑 Owner Master Command Center • BRAC HJMC</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Fresher Party Live Attendance &amp; Records</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Sabhi phones se hui saari registrations aur abhi tak jitni gate entry hui hai, unka real-time record live update ho raha hai.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              title="Live Data Refresh Karein"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Live</span>
            </button>

            <button
              onClick={
                activeTab === 'registrations'
                  ? handleExportRegistrationsCSV
                  : activeTab === 'entries'
                  ? handleExportEntriesCSV
                  : handleExportMasterCSV
              }
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              title="Download Excel / CSV Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              title="Print Attendance Sheet"
            >
              <Printer className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              title="Owner Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Registered */}
        <div
          onClick={() => setActiveTab('registrations')}
          className={`glass-card rounded-2xl p-4 sm:p-5 border relative overflow-hidden shadow-xl cursor-pointer transition ${
            activeTab === 'registrations'
              ? 'border-purple-400 ring-2 ring-purple-500/40 bg-purple-950/30'
              : 'border-purple-500/30 hover:border-purple-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Saari Registrations (Total)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalReg}</div>
          <p className="text-[11px] text-purple-300 font-medium mt-1">Sabhi phones se hue registered bachhe</p>
        </div>

        {/* Total Arrived (Entries) */}
        <div
          onClick={() => setActiveTab('entries')}
          className={`glass-card rounded-2xl p-4 sm:p-5 border relative overflow-hidden shadow-xl bg-emerald-950/20 cursor-pointer transition ${
            activeTab === 'entries'
              ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/40'
              : 'border-emerald-500/40 hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-300">Abhi Tak Ki Entries (Admitted)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats.totalEntries}</div>
          <p className="text-[11px] text-emerald-300/80 font-medium mt-1">Gate par scan hokar enter hue bachhe</p>
        </div>

        {/* Pending */}
        <div
          onClick={() => {
            setActiveTab('master');
            setFilterStatus('pending');
          }}
          className="glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/30 relative overflow-hidden shadow-xl bg-amber-950/15 cursor-pointer hover:border-amber-500/50 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-300">Baaki Bachhe (Abhi Aana Bacha Hai)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{stats.pending}</div>
          <p className="text-[11px] text-amber-300/80 font-medium mt-1">Registered hain par gate par nahi aaye</p>
        </div>

        {/* Attendance Rate */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-pink-500/30 relative overflow-hidden shadow-xl bg-pink-950/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-pink-300">Turnout Percentage</span>
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-pink-400">{stats.rate}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 🔍 OWNER TOOL: PEHLE SE REGISTER KIYA HAI? PASS & EXPIRY CHECK KAREIN */}
      <PassExpiryChecker
        students={students}
        entries={entries}
        smsList={smsList}
        onPreviewPhoto={onPreviewPhoto}
        onOpenPhonePreview={onOpenPhonePreview}
        variant="owner"
      />

      {/* Navigation Tabs (Master Overview, All Registrations, All Gate Entries) */}
      <div className="glass-card rounded-2xl p-2 border border-slate-700/80 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap bg-slate-900/80">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('master')}
            className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'master'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Master Attendance ({mergedStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'registrations'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-purple-300" />
            <span>Abhi Tak Ki Registrations ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('entries')}
            className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'entries'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Abhi Tak Ki Entries ({entries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'sms'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-300" />
            <span>UDGHOSH SMS Logs ({smsList.length})</span>
          </button>
        </div>

        <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 rounded-lg border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>Real-Time Multi-Device Synced</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'entries'
                ? 'Entry record me Naam, Roll Number ya Pass ID se search karein...'
                : 'Registration me Naam, Roll Number ya Mobile Number se search karein...'
            }
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills (for Master view) */}
        {activeTab === 'master' && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-700 text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sabhi ({stats.totalReg})
            </button>
            <button
              onClick={() => setFilterStatus('admitted')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'admitted'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aaye Hue ({stats.totalEntries})</span>
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'pending'
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Baaki ({stats.pending})</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MASTER ATTENDANCE VIEW (COMBINED)                   */}
      {/* ========================================================= */}
      {activeTab === 'master' && (
        <div className="glass-card rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h3 className="font-bold text-white text-sm sm:text-base">
                👑 Master Attendance Record ({filteredStudents.length} Students)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Course: <strong className="text-amber-300">HJMC</strong> • Real-time live attendance
            </span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
              <p className="text-base font-bold text-white">Koi student record nahi mila</p>
              <p className="text-xs text-slate-400 mt-1">
                Search term badal kar dekhein ya filter hatayein.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">S.No</th>
                    <th className="py-3.5 px-4 font-semibold">Photo</th>
                    <th className="py-3.5 px-4 font-semibold">Vidyarthi Ka Naam</th>
                    <th className="py-3.5 px-4 font-semibold">Roll Number</th>
                    <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                    <th className="py-3.5 px-4 font-semibold">Course</th>
                    <th className="py-3.5 px-4 font-semibold">Registration Time</th>
                    <th className="py-3.5 px-4 font-semibold">Gate Entry Status</th>
                    <th className="py-3.5 px-4 font-semibold">Pass Expiry Status</th>
                    <th className="py-3.5 px-4 font-semibold">UDGHOSH SMS</th>
                    <th className="py-3.5 px-4 font-semibold">Gate Entry Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student.id || student.roll}
                      className="hover:bg-slate-850/50 transition duration-150"
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{index + 1}</td>

                      {/* Photo */}
                      <td className="py-3.5 px-4">
                        {student.photoUrl ? (
                          <div
                            onClick={() =>
                              onPreviewPhoto({
                                url: student.photoUrl!,
                                name: student.name,
                                roll: student.roll
                              })
                            }
                            className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-pink-500/80 shadow-md group cursor-pointer hover:scale-105 transition-transform shrink-0"
                            title="Click karke photo dekhein"
                          >
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <User className="w-5 h-5" />
                            <span className="text-[7px]">No Photo</span>
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="block">{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                          ID: {student.id}
                        </span>
                      </td>

                      {/* Roll */}
                      <td className="py-3.5 px-4 font-mono font-bold text-pink-400">
                        {student.roll}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        {student.phone ? (
                          <a
                            href={`tel:${student.phone}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
                            title="Call karein"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{student.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs italic">N/A</span>
                        )}
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                          {student.course || 'HJMC'}
                        </span>
                      </td>

                      {/* Registration Date & Time */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{formatIndianDateTime(student.registeredAt)}</span>
                        </div>
                      </td>

                      {/* Entry Status */}
                      <td className="py-3.5 px-4">
                        {student.admitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Aaye Hue (Admitted)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Baaki (Nahi Aaye)</span>
                          </span>
                        )}
                      </td>

                      {/* Pass Expiry Status (Single-Use Rule) */}
                      <td className="py-3.5 px-4">
                        {student.admitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                            <span>⛔ EXPIRED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span>✅ ACTIVE (1-Time)</span>
                          </span>
                        )}
                      </td>

                      {/* UDGHOSH SMS Status */}
                      <td className="py-3.5 px-4">
                        {student.admitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                            <span>📲 Sent</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Waiting</span>
                        )}
                      </td>

                      {/* Gate Entry Time */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {student.admitted ? (
                          <span className="text-emerald-300 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            {student.admittedAt ? formatScanTime(student.admittedAt) : 'Recorded'}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ALL REGISTRATIONS ("Abhi Tak Ki Saari Registrations") */}
      {/* ========================================================= */}
      {activeTab === 'registrations' && (
        <div className="glass-card rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl space-y-0">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-purple-950/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  📋 Abhi Tak Ki Saari Registrations ({filteredStudents.length} Students)
                </h3>
                <p className="text-xs text-slate-400">
                  Sabhi mobile devices se hue registration ka poora live record
                </p>
              </div>
            </div>

            <button
              onClick={handleExportRegistrationsCSV}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All Registrations</span>
            </button>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-400" />
              <p className="text-base font-bold text-white">Abhi tak koi registration nahi hua</p>
              <p className="text-xs text-slate-400 mt-1">
                Student registration form se naye bachhe register karein.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">S.No</th>
                    <th className="py-3.5 px-4 font-semibold">Photo</th>
                    <th className="py-3.5 px-4 font-semibold">Student Name</th>
                    <th className="py-3.5 px-4 font-semibold">Roll Number</th>
                    <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                    <th className="py-3.5 px-4 font-semibold">Course</th>
                    <th className="py-3.5 px-4 font-semibold">Kab Kiya Tha Registration (Date &amp; Time)</th>
                    <th className="py-3.5 px-4 font-semibold">Gate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student.id || student.roll}
                      className="hover:bg-slate-850/50 transition duration-150"
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{index + 1}</td>

                      <td className="py-3.5 px-4">
                        {student.photoUrl ? (
                          <div
                            onClick={() =>
                              onPreviewPhoto({
                                url: student.photoUrl!,
                                name: student.name,
                                roll: student.roll
                              })
                            }
                            className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-purple-500/80 shadow-md group cursor-pointer hover:scale-105 transition-transform shrink-0"
                            title="Click karke photo dekhein"
                          >
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <User className="w-5 h-5" />
                            <span className="text-[7px]">No Photo</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="block">{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                          Pass ID: {student.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-pink-400">
                        {student.roll}
                      </td>

                      <td className="py-3.5 px-4">
                        {student.phone ? (
                          <a
                            href={`tel:${student.phone}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{student.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">N/A</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                          {student.course || 'HJMC'}
                        </span>
                      </td>

                      {/* Real time registration */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-purple-300 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          <span>{formatIndianDateTime(student.registeredAt)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {student.admitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Entered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ALL GATE ENTRIES ("Abhi Tak Jitni Entry Hua Hai")     */}
      {/* ========================================================= */}
      {activeTab === 'entries' && (
        <div className="glass-card rounded-2xl border border-emerald-500/40 overflow-hidden shadow-2xl space-y-0">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  ✅ Abhi Tak Jitni Entry Hua Hai ({filteredEntries.length} Admitted Students)
                </h3>
                <p className="text-xs text-slate-400">
                  Gate entry scanner par scan hokar confirm admitted students ka live log
                </p>
              </div>
            </div>

            <button
              onClick={handleExportEntriesCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Gate Entries CSV</span>
            </button>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <UserCheck2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
              <p className="text-base font-bold text-white">Abhi tak koi entry scan nahi hui</p>
              <p className="text-xs text-slate-400 mt-1">
                Admin scanner se student QR pass scan karke approve karein.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">S.No</th>
                    <th className="py-3.5 px-4 font-semibold">Photo</th>
                    <th className="py-3.5 px-4 font-semibold">Vidyarthi Ka Naam</th>
                    <th className="py-3.5 px-4 font-semibold">Roll Number</th>
                    <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                    <th className="py-3.5 px-4 font-semibold">Exact Entry Scan Time</th>
                    <th className="py-3.5 px-4 font-semibold">Pass ID</th>
                    <th className="py-3.5 px-4 font-semibold">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredEntries.map((entry, index) => (
                    <tr
                      key={entry.id + '-' + entry.timestamp}
                      className="hover:bg-slate-850/50 transition duration-150"
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{index + 1}</td>

                      <td className="py-3.5 px-4">
                        {entry.photoUrl ? (
                          <div
                            onClick={() =>
                              onPreviewPhoto({
                                url: entry.photoUrl!,
                                name: entry.name,
                                roll: entry.roll
                              })
                            }
                            className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-emerald-500/80 shadow-md group cursor-pointer hover:scale-105 transition-transform shrink-0"
                            title="Click karke photo dekhein"
                          >
                            <img
                              src={entry.photoUrl}
                              alt={entry.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <User className="w-5 h-5" />
                            <span className="text-[7px]">No Photo</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="block">{entry.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                          {entry.course || 'HJMC'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-pink-400">
                        {entry.roll}
                      </td>

                      <td className="py-3.5 px-4">
                        {entry.phone ? (
                          <a
                            href={`tel:${entry.phone}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{entry.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">N/A</span>
                        )}
                      </td>

                      {/* Entry Time in IST */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{formatScanTime(entry.scannedAt || entry.timestamp)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {entry.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">
                          {entry.approvedBy || 'Gate Admin'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: UDGHOSH OFFICIAL SMS LOGS & AUDIT TRAIL             */}
      {/* ========================================================= */}
      {activeTab === 'sms' && (
        <AdminSmsLogsTab
          smsList={smsList}
          onRefresh={onRefresh}
          onOpenPhonePreview={onOpenPhonePreview}
        />
      )}
    </div>
  );
};
