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
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  User
} from 'lucide-react';
import { formatScanTime } from '../utils/timeFormat.ts';

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
}

interface OwnerSectionProps {
  students: StudentRecord[];
  onRefresh: () => void;
  onLogout: () => void;
  onPreviewPhoto: (photo: { url: string; name: string; roll: string }) => void;
}

export const OwnerSection: React.FC<OwnerSectionProps> = ({
  students,
  onRefresh,
  onLogout,
  onPreviewPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'admitted' | 'pending'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const stats = useMemo(() => {
    const total = students.length;
    const admitted = students.filter((s) => s.admitted).length;
    const pending = total - admitted;
    const rate = total > 0 ? Math.round((admitted / total) * 100) : 0;
    return { total, admitted, pending, rate };
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm);

      if (!matchSearch) return false;

      if (filterStatus === 'admitted') return student.admitted;
      if (filterStatus === 'pending') return !student.admitted;
      return true;
    });
  }, [students, searchTerm, filterStatus]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      return;
    }
    const headers = [
      'S.No',
      'Student Name',
      'Roll Number',
      'Phone Number',
      'Course',
      'Attendance Status',
      'Entry Time',
      'Pass ID',
      'Registration Date'
    ];
    const rows = students.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.roll}"`,
      `"${s.phone || 'N/A'}"`,
      `"${s.course || 'HJMC'}"`,
      `"${s.admitted ? 'ARRIVED / ADMITTED' : 'NOT ARRIVED'}"`,
      `"${s.admitted ? (s.admittedAt ? formatScanTime(s.admittedAt) : 'ARRIVED') : '-'}"`,
      `"${s.id}"`,
      `"${new Date(s.registeredAt).toLocaleString('en-IN')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Owner_Master_Attendance_HJMC_${new Date().toISOString().slice(0, 10)}.csv`
    );
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-slate-900 border border-amber-500/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-3">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>👑 Owner Master Command Center • BRAC HJMC</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Fresher Party Live Attendance &amp; Records</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Sabhi phones se hue registration aur entry ka poora master record yahan live update hota hai.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              title="Live Data Refresh Karein"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              title="Export CSV to Excel"
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
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Bachhe (Registered)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.total}</div>
          <p className="text-[11px] text-purple-300 font-medium mt-1">Chahe kisi bhi phone se hua ho</p>
        </div>

        {/* Total Arrived */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-emerald-500/40 relative overflow-hidden shadow-xl bg-emerald-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-300">Aaye Hue (Gate Admitted)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats.admitted}</div>
          <p className="text-[11px] text-emerald-300/80 font-medium mt-1">Entry gate par scan ho chuke</p>
        </div>

        {/* Pending */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/30 relative overflow-hidden shadow-xl bg-amber-950/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-300">Baaki Bachhe (Abhi Nahi Aaye)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{stats.pending}</div>
          <p className="text-[11px] text-amber-300/80 font-medium mt-1">Aana bacha hua hai</p>
        </div>

        {/* Attendance Rate */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-pink-500/30 relative overflow-hidden shadow-xl bg-pink-950/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-pink-300">Attendance Percentage</span>
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

      {/* Search & Filter Toolbar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Naam, Roll Number ya Mobile Number se search karein..."
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

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-700 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sabhi ({stats.total})
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
            <span>Aaye Hue ({stats.admitted})</span>
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
      </div>

      {/* Master Students Records Table */}
      <div className="glass-card rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              Master Attendance List ({filteredStudents.length} Students)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Course: <strong className="text-amber-300">HJMC</strong> (Hindi Journalism &amp; Mass Comm)
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
            <p className="text-base font-bold text-white">Koi record nahi mila</p>
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
                  <th className="py-3.5 px-4 font-semibold">Entry Status (Aaye / Baaki)</th>
                  <th className="py-3.5 px-4 font-semibold">Entry Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id || student.roll}
                    className="hover:bg-slate-850/50 transition duration-150"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{index + 1}</td>

                    {/* Photo with zoom */}
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
                          title="Click karke badi photo dekhein"
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

                    {/* Entry Time */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {student.admitted ? (
                        <span className="text-emerald-300 font-bold">{student.admittedAt ? formatScanTime(student.admittedAt) : 'Recorded'}</span>
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
    </div>
  );
};
