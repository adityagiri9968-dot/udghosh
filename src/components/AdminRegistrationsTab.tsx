import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck2,
  Clock,
  Phone,
  Maximize2,
  CheckCircle2,
  RefreshCw,
  Download,
  Printer,
  Sparkles,
  User,
  ShieldCheck
} from 'lucide-react';
import { StudentRecord } from './OwnerSection.tsx';

interface AdminRegistrationsTabProps {
  students: StudentRecord[];
  onRefresh: () => void;
  onApproveStudent: (student: StudentRecord) => void;
  onPreviewPhoto: (photo: { url: string; name: string; roll: string }) => void;
}

export const AdminRegistrationsTab: React.FC<AdminRegistrationsTabProps> = ({
  students,
  onRefresh,
  onApproveStudent,
  onPreviewPhoto
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'admitted' | 'pending'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const stats = useMemo(() => {
    const total = students.length;
    const admitted = students.filter((s) => s.admitted).length;
    const pending = total - admitted;
    const percentage = total > 0 ? Math.round((admitted / total) * 100) : 0;
    return { total, admitted, pending, percentage };
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone && student.phone.includes(searchTerm));

      if (!matchSearch) return false;

      if (filterStatus === 'admitted') return student.admitted;
      if (filterStatus === 'pending') return !student.admitted;
      return true;
    });
  }, [students, searchTerm, filterStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportCSV = () => {
    if (students.length === 0) return;
    const headers = ['S.No', 'Student Name', 'Roll Number', 'Phone', 'Course', 'Status', 'Entry Time', 'Pass ID'];
    const rows = students.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.roll}"`,
      `"${s.phone || 'N/A'}"`,
      `"${s.course || 'HJMC'}"`,
      `"${s.admitted ? 'Admitted' : 'Pending'}"`,
      `"${s.admittedAt || '-'}"`,
      `"${s.id}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `All_Registered_Students_HJMC_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 mb-2">
              <Users className="w-3.5 h-3.5 text-pink-400" />
              <span>🌐 Central Registration Hub (All Devices Synced)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Total Registrations (कुल कितने बच्चे हो गए)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Chahe jitne bhi phone ya computer se registration hua ho, sabhi ka live data yahan central database se sync hai.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition shadow cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Registered */}
        <div className="glass-card rounded-2xl p-5 border border-purple-500/30 shadow-lg relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Bachhe Ho Gaye
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.total}</div>
          <p className="text-xs text-purple-300 mt-1">Sabhi phones se mila kar total</p>
        </div>

        {/* Total Admitted */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/20 shadow-lg relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Gate Par Aaye Hue (Admitted)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{stats.admitted}</div>
          <p className="text-xs text-emerald-300/80 mt-1">
            {stats.percentage}% bachhe gate par enter kar chuke hain
          </p>
        </div>

        {/* Pending */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/30 bg-amber-950/15 shadow-lg relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Bache Hue (Pending Entry)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{stats.pending}</div>
          <p className="text-xs text-amber-300/80 mt-1">Inka aana abhi baaki hai</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card rounded-2xl p-4 border border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Student Name, Roll No ya Phone No search karein..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
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

        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-700 text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-pink-600 text-white font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All ({stats.total})
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
            <span>Admitted ({stats.admitted})</span>
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
            <span>Pending ({stats.pending})</span>
          </button>
        </div>
      </div>

      {/* Table of all registered students */}
      <div className="glass-card rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
            <span>Panchikrit Vidyarthi Suchi ({filteredStudents.length})</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              Course: HJMC
            </span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Gate Par Aane Par "Approve" Button Dabayein
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-pink-400" />
            <p className="text-base font-bold text-white">Koi registration nahi mila</p>
            <p className="text-xs text-slate-400 mt-1">
              Search filter clear karein ya refresh karein.
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
                  <th className="py-3.5 px-4 font-semibold">Entry Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id || student.roll}
                    className="hover:bg-slate-850/50 transition duration-150"
                  >
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{index + 1}</td>

                    {/* Photo with zoom preview */}
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
                          className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-pink-500 shadow-md group cursor-pointer hover:scale-105 transition-transform shrink-0"
                          title="Click karke photo badi dekhein"
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
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

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {student.admitted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Admitted ({student.admittedAt || 'Done'})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending (Abhi Nahi Aaye)</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {student.admitted ? (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Entry Done</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onApproveStudent(student)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-950/40 cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Approve Entry</span>
                        </button>
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
