import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  BarChart3,
  Clock,
  TrendingUp,
  Activity,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users
} from 'lucide-react';

export interface EntryRecord {
  id: string;
  name: string;
  roll: string;
  scannedAt: string;
  timestamp: number;
  photoUrl?: string;
}

interface EntryAnalyticsProps {
  entries: EntryRecord[];
  onAddSampleData?: () => void;
}

type TimeInterval = '30m' | '1h' | '3h' | 'today';

interface ChartBucket {
  label: string;
  rangeLabel: string;
  count: number;
  students: string[];
  startMs: number;
  endMs: number;
}

export const EntryAnalytics: React.FC<EntryAnalyticsProps> = ({
  entries,
  onAddSampleData
}) => {
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('30m');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Periodically refresh current time every 15 seconds to slide the real-time window
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const formatShortTime = (ms: number): string => {
    return new Date(ms).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Generate buckets based on selected time interval
  const { chartData, totalInRange, peakBucket, recentPace } = useMemo(() => {
    const now = currentTime;
    let buckets: ChartBucket[] = [];

    if (selectedInterval === '30m') {
      // 6 buckets of 5 minutes each (30 minutes total)
      const bucketMinutes = 5;
      const count = 6;
      const bucketMs = bucketMinutes * 60 * 1000;

      for (let i = 0; i < count; i++) {
        const startMs = now - (count - i) * bucketMs;
        const endMs = now - (count - i - 1) * bucketMs;
        const label = formatShortTime(startMs);
        const rangeLabel = `${formatShortTime(startMs)} - ${formatShortTime(endMs)}`;

        const matched = entries.filter((e) => {
          const t = e.timestamp || now;
          return t >= startMs && (i === count - 1 ? t <= endMs : t < endMs);
        });

        buckets.push({
          label,
          rangeLabel,
          count: matched.length,
          students: matched.map((m) => `${m.name} (${m.roll})`),
          startMs,
          endMs
        });
      }
    } else if (selectedInterval === '1h') {
      // 6 buckets of 10 minutes each (60 minutes total)
      const bucketMinutes = 10;
      const count = 6;
      const bucketMs = bucketMinutes * 60 * 1000;

      for (let i = 0; i < count; i++) {
        const startMs = now - (count - i) * bucketMs;
        const endMs = now - (count - i - 1) * bucketMs;
        const label = formatShortTime(startMs);
        const rangeLabel = `${formatShortTime(startMs)} - ${formatShortTime(endMs)}`;

        const matched = entries.filter((e) => {
          const t = e.timestamp || now;
          return t >= startMs && (i === count - 1 ? t <= endMs : t < endMs);
        });

        buckets.push({
          label,
          rangeLabel,
          count: matched.length,
          students: matched.map((m) => `${m.name} (${m.roll})`),
          startMs,
          endMs
        });
      }
    } else if (selectedInterval === '3h') {
      // 6 buckets of 30 minutes each (180 minutes total)
      const bucketMinutes = 30;
      const count = 6;
      const bucketMs = bucketMinutes * 60 * 1000;

      for (let i = 0; i < count; i++) {
        const startMs = now - (count - i) * bucketMs;
        const endMs = now - (count - i - 1) * bucketMs;
        const label = formatShortTime(startMs);
        const rangeLabel = `${formatShortTime(startMs)} - ${formatShortTime(endMs)}`;

        const matched = entries.filter((e) => {
          const t = e.timestamp || now;
          return t >= startMs && (i === count - 1 ? t <= endMs : t < endMs);
        });

        buckets.push({
          label,
          rangeLabel,
          count: matched.length,
          students: matched.map((m) => `${m.name} (${m.roll})`),
          startMs,
          endMs
        });
      }
    } else {
      // 'today' - 8 buckets of 1 hour each
      const bucketHours = 1;
      const count = 8;
      const bucketMs = bucketHours * 60 * 60 * 1000;

      for (let i = 0; i < count; i++) {
        const startMs = now - (count - i) * bucketMs;
        const endMs = now - (count - i - 1) * bucketMs;
        const label = formatShortTime(startMs);
        const rangeLabel = `${formatShortTime(startMs)} - ${formatShortTime(endMs)}`;

        const matched = entries.filter((e) => {
          const t = e.timestamp || now;
          return t >= startMs && (i === count - 1 ? t <= endMs : t < endMs);
        });

        buckets.push({
          label,
          rangeLabel,
          count: matched.length,
          students: matched.map((m) => `${m.name} (${m.roll})`),
          startMs,
          endMs
        });
      }
    }

    const total = buckets.reduce((acc, b) => acc + b.count, 0);
    const peak = [...buckets].sort((a, b) => b.count - a.count)[0];
    const latest = buckets[buckets.length - 1];

    return {
      chartData: buckets,
      totalInRange: total,
      peakBucket: peak,
      recentPace: latest ? latest.count : 0
    };
  }, [entries, selectedInterval, currentTime]);

  // Custom Dark Glassmorphism Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartBucket = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-purple-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs text-slate-200 min-w-[170px] z-50">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-mono text-purple-300">
              <Clock className="w-3 h-3 text-pink-400" />
              {data.rangeLabel}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-xl font-black bg-gradient-to-r from-pink-400 via-purple-300 to-rose-400 bg-clip-text text-transparent">
              {data.count}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {data.count === 1 ? 'Student Entry' : 'Student Entries'}
            </span>
          </div>

          {data.students.length > 0 ? (
            <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Admitted Students:
              </span>
              <ul className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                {data.students.slice(0, 4).map((nameRoll, idx) => (
                  <li key={idx} className="truncate text-slate-300 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-pink-400 shrink-0" />
                    <span>{nameRoll}</span>
                  </li>
                ))}
                {data.students.length > 4 && (
                  <li className="text-[10px] text-pink-400 font-semibold pt-0.5">
                    +{data.students.length - 4} aur students
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic mt-1">Is interval me koi entry nahi</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/25 shadow-xl relative overflow-hidden transition-all duration-300">
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-pink-500/5 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-64 h-32 bg-purple-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header bar with interval switcher & collapse button */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-pink-400 shadow-sm">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base tracking-tight">
                Entry Analytics
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/10 border border-pink-500/30 text-pink-300">
                Pacing &amp; Intervals
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Auditorium gate crowd pacing by time intervals
            </p>
          </div>
        </div>

        {/* Interval Selector Tabs & Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedInterval('30m')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                selectedInterval === '30m'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 30 Min
            </button>
            <button
              onClick={() => setSelectedInterval('1h')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                selectedInterval === '1h'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 Hour
            </button>
            <button
              onClick={() => setSelectedInterval('3h')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer hidden xs:inline-block ${
                selectedInterval === '3h'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3 Hours
            </button>
            <button
              onClick={() => setSelectedInterval('today')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                selectedInterval === 'today'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title={isCollapsed ? 'Expand Analytics' : 'Collapse Analytics'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-4 space-y-3.5 relative z-10 animate-in fade-in duration-200">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-0.5">
                <Users className="w-3 h-3 text-purple-400" />
                <span className="truncate">Range Total</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold text-white">{totalInRange}</span>
                <span className="text-[10px] text-slate-500">entries</span>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-0.5">
                <Flame className="w-3 h-3 text-pink-400" />
                <span className="truncate">Peak Window</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold text-pink-400">
                  {peakBucket?.count || 0}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {peakBucket && peakBucket.count > 0 ? `@ ${peakBucket.label}` : 'None'}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 sm:p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-0.5">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="truncate">Latest Interval</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold text-emerald-400">{recentPace}</span>
                <span className="text-[10px] text-slate-500">
                  {selectedInterval === '30m' ? 'in 5m' : selectedInterval === '1h' ? 'in 10m' : 'recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart Area */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 sm:p-4 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span>Entries per interval ({selectedInterval === '30m' ? '5 min bins' : selectedInterval === '1h' ? '10 min bins' : selectedInterval === '3h' ? '30 min bins' : '1 hr bins'})</span>
              </span>

              {totalInRange === 0 && onAddSampleData && (
                <button
                  onClick={onAddSampleData}
                  className="text-[11px] text-pink-400 hover:text-pink-300 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>+ Test Demo Crowd</span>
                </button>
              )}
            </div>

            <div className="h-44 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 10, left: -22, bottom: 0 }}
                  onMouseMove={(state: any) => {
                    if (state && state.activeTooltipIndex !== undefined) {
                      setHoveredIndex(state.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <defs>
                    <linearGradient id="entryBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.95} />
                      <stop offset="60%" stopColor="#a855f7" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="entryBarGradHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="60%" stopColor="#ec4899" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />

                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(168, 85, 247, 0.08)', radius: 6 }}
                  />

                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    animationDuration={600}
                    maxBarSize={48}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          hoveredIndex === index
                            ? 'url(#entryBarGradHover)'
                            : entry.count === peakBucket?.count && entry.count > 0
                            ? 'url(#entryBarGradHover)'
                            : 'url(#entryBarGrad)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {totalInRange === 0 && (
              <div className="text-center py-2 text-xs text-slate-500">
                <span>Is samay window ({selectedInterval}) me koi entries nahi hui hain. </span>
                {onAddSampleData && (
                  <button
                    onClick={onAddSampleData}
                    className="text-pink-400 hover:text-pink-300 underline font-medium cursor-pointer ml-1"
                  >
                    Demo crowd simulate karein
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
