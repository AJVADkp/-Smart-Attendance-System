'use client';
import { useState, useMemo } from 'react';
import { cn, formatTime12IST, formatTimeRange12, TZ } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Bluetooth,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { StatusPill, AttendanceColorType } from '@/components/ui/StatusPill';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AttendanceResult {
  periodRunId: string;
  date: string;
  periodName: string;
  subject: string;
  startAt: string;
  endAt: string;
  periodStatus: string;
  color: string;
  label: string;
  isReview?: boolean;
  locked: boolean;
}

interface StudentData {
  student: { name: string; regNo: string; className?: string };
  results: AttendanceResult[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StudentCalendar({
  data,
  onBack,
}: {
  data: StudentData;
  onBack: () => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Problem reporting modal state
  const [reportingPeriod, setReportingPeriod] = useState<AttendanceResult | null>(null);
  const [reportMsg, setReportMsg] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

  const resultsByDate = useMemo(() => {
    const map = new Map<string, AttendanceResult[]>();
    data.results.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    });
    return map;
  }, [data.results]);

  // Current month results
  const monthResults = useMemo(() => {
    return data.results.filter((r) => {
      const parts = r.date.split('-');
      return Number(parts[0]) === viewYear && Number(parts[1]) === viewMonth;
    });
  }, [data.results, viewYear, viewMonth]);

  // Accurate Metrics
  const attendedCount = monthResults.filter(
    (r) => (r.color === 'green' || r.label === 'Present') && !r.isReview
  ).length;

  const absentCount = monthResults.filter(
    (r) => r.color === 'red' || r.label === 'Absent'
  ).length;

  const upcomingCount = monthResults.filter(
    (r) => r.periodStatus === 'scheduled' || r.label === 'Scheduled'
  ).length;

  const completedTotal = attendedCount + absentCount;
  const attendanceRate =
    completedTotal > 0 ? Math.round((attendedCount / completedTotal) * 100) : null;

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  }

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr: dStr });
  }

  async function sendReport() {
    if (!reportingPeriod || !reportMsg.trim()) return;
    setReportLoading(true);
    try {
      await fetch('/api/student/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regNo: data.student.regNo,
          periodRunId: reportingPeriod.periodRunId,
          message: reportMsg.trim(),
        }),
      });
      setReportSent(true);
    } finally {
      setReportLoading(false);
    }
  }

  const selectedDayResults = useMemo(() => {
    if (!selectedDate) return [];
    const list = resultsByDate.get(selectedDate) ?? [];
    return [...list].sort((a, b) => {
      const sA = a.startAt ? new Date(a.startAt).getTime() : 0;
      const sB = b.startAt ? new Date(b.startAt).getTime() : 0;
      if (sA !== sB) return sA - sB;
      return (a.periodName || '').localeCompare(b.periodName || '', undefined, { numeric: true });
    });
  }, [selectedDate, resultsByDate]);

  return (
    <div className="min-h-screen bg-[#FFF7ED] dark:bg-zinc-950 text-[#1F2937] dark:text-zinc-100 flex flex-col selection:bg-[#FED7AA] dark:selection:bg-orange-950/60 transition-colors duration-200">
      {/* Aligned Student Header */}
      <header className="border-b border-[#FED7AA]/60 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-xs sticky top-0 z-30 transition-colors">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 gap-1 px-2.5 sm:px-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch Student</span>
            <span className="sm:hidden">Switch</span>
          </Button>

          <div className="text-center min-w-0 px-2">
            <h1 className="font-semibold text-[#1F2937] dark:text-zinc-100 text-sm sm:text-base tracking-tight truncate max-w-[130px] sm:max-w-none">
              {data.student.name}
            </h1>
            <span className="font-mono text-xs font-semibold text-[#EA580C] dark:text-orange-400 block truncate">
              {data.student.regNo}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-semibold text-[#1F2937] dark:text-zinc-200 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#FFF7ED] dark:bg-zinc-800 border border-[#FED7AA] dark:border-zinc-700 whitespace-nowrap">
              {data.student.className || 'CS 3rd Year'}
            </span>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* 4 Summary Stat Cards with Accurate Maths */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-4 sm:p-5 shadow-card transition-colors">
            <div className="text-xs uppercase tracking-wider text-[#6B7280] dark:text-zinc-400 font-medium">
              Periods attended
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-[#15803D] dark:text-emerald-400 tabular-nums">
              {attendedCount}
            </div>
            <div className="text-[11px] text-[#6B7280] dark:text-zinc-400 mt-1">Verified present</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-4 sm:p-5 shadow-card transition-colors">
            <div className="text-xs uppercase tracking-wider text-[#6B7280] dark:text-zinc-400 font-medium">
              Marked absent
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-[#B91C1C] dark:text-rose-400 tabular-nums">
              {absentCount}
            </div>
            <div className="text-[11px] text-[#6B7280] dark:text-zinc-400 mt-1">Unrecorded presence</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-4 sm:p-5 shadow-card transition-colors">
            <div className="text-xs uppercase tracking-wider text-[#6B7280] dark:text-zinc-400 font-medium">
              Upcoming
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-[#1F2937] dark:text-zinc-100 tabular-nums">
              {upcomingCount}
            </div>
            <div className="text-[11px] text-[#6B7280] dark:text-zinc-400 mt-1">Scheduled this month</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-4 sm:p-5 shadow-card transition-colors">
            <div className="text-xs uppercase tracking-wider text-[#6B7280] dark:text-zinc-400 font-medium">
              Attendance rate
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-semibold text-[#EA580C] dark:text-orange-400 tabular-nums">
              {attendanceRate !== null ? `${attendanceRate}%` : '—'}
            </div>
            <div className="text-[11px] text-[#6B7280] dark:text-zinc-400 mt-1">
              {attendanceRate !== null ? 'Of completed classes' : 'No periods recorded yet'}
            </div>
          </div>
        </div>

        {/* Calendar Grid Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 shadow-card overflow-hidden transition-colors">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#EA580C] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="bg-white/15 text-white border-white/30 hover:bg-white/25 hover:text-white text-xs h-7 min-h-0 px-2.5 rounded-full"
              >
                Today
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-[#FED7AA] dark:border-zinc-800 bg-[#FFF7ED]/70 dark:bg-zinc-800/60 text-center text-xs font-semibold text-[#6B7280] dark:text-zinc-400">
            {DAY_SHORT.map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#FED7AA]/40 dark:divide-zinc-800">
            {cells.map((cell, idx) => {
              if (!cell.day || !cell.dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="bg-[#FFF7ED]/20 dark:bg-zinc-950/40 min-h-[56px] sm:min-h-[88px]"
                  />
                );
              }

              const { day, dateStr } = cell;
              const isToday = dateStr === todayISO;
              const dayRuns = resultsByDate.get(dateStr) ?? [];

              // Sort runs chronologically and only consider periods where attendance was actually taken
              const sortedRuns = [...dayRuns].sort((a, b) => {
                const sA = a.startAt ? new Date(a.startAt).getTime() : 0;
                const sB = b.startAt ? new Date(b.startAt).getTime() : 0;
                return sA - sB;
              });

              // Filter out untaken/not-recorded periods (never show grey dots or untaken periods on student view)
              const takenRuns = sortedRuns.filter(
                (r) => r.color !== 'grey' && r.label !== 'Not recorded' && r.label !== 'Cancelled'
              );
              const hasRuns = takenRuns.length > 0;

              const attendedInDay = takenRuns.filter(
                (r) => (r.color === 'green' || r.label === 'Present') && !r.isReview
              ).length;

              function getPeriodDot(r: AttendanceResult) {
                const isUnderReview =
                  r.isReview ||
                  r.color === 'yellow' ||
                  r.color === 'orange' ||
                  r.label.toLowerCase().includes('review');
                const isPresent = (r.color === 'green' || r.label === 'Present') && !isUnderReview;
                const isAbsent = r.color === 'red' || r.label === 'Absent';
                const isScheduled = r.periodStatus === 'scheduled' || r.label === 'Scheduled';

                if (isPresent) {
                  return {
                    dotClass: 'bg-[#16A34A] shadow-2xs',
                    label: 'Present',
                  };
                }
                if (isAbsent) {
                  return {
                    dotClass: 'bg-[#DC2626] shadow-2xs',
                    label: 'Absent',
                  };
                }
                if (isUnderReview) {
                  return {
                    dotClass: 'bg-[#EAB308] shadow-2xs',
                    label: 'Under Review',
                  };
                }
                if (isScheduled) {
                  return {
                    dotClass: 'border border-[#EA580C] bg-transparent',
                    label: 'Upcoming',
                  };
                }
                return {
                  dotClass: 'bg-transparent',
                  label: r.label,
                };
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    'min-h-[52px] sm:min-h-[72px] p-1.5 sm:p-2 flex flex-col justify-between items-start transition-all duration-100 group cursor-pointer text-left',
                    hasRuns
                      ? 'bg-white dark:bg-zinc-900 hover:bg-[#FFF7ED] dark:hover:bg-zinc-800/80'
                      : 'bg-[#FFF7ED]/30 dark:bg-zinc-900/40 text-[#9CA3AF] dark:text-zinc-600',
                    selectedDate === dateStr &&
                      'bg-[#FFEDD5] dark:bg-orange-950/50 ring-2 ring-inset ring-[#F97316]'
                  )}
                  aria-label={`${day} ${MONTH_NAMES[viewMonth - 1]}, ${takenRuns.length} periods recorded`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-[#EA580C] text-white shadow-xs font-bold'
                          : 'text-[#1F2937] dark:text-zinc-200'
                      )}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Individual dots for each period with compact mobile size and tight spacing */}
                  {hasRuns && (
                    <div className="w-full mt-1">
                      <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                        {takenRuns.map((r, pIdx) => {
                          const dot = getPeriodDot(r);
                          return (
                            <span
                              key={r.periodRunId || pIdx}
                              title={`${r.periodName || `P${pIdx + 1}`}: ${r.subject} — ${dot.label}`}
                              className={cn(
                                'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 transition-transform group-hover:scale-125 cursor-pointer',
                                dot.dotClass
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend & Honest Note */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 shadow-card space-y-2 transition-colors">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] dark:text-zinc-400">
            <span className="font-semibold text-[#1F2937] dark:text-zinc-200 uppercase tracking-wider text-[11px]">
              Period Indicators:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#16A34A]" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#DC2626]" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#EAB308]" />
              <span>Under Review</span>
            </div>
          </div>
          <p className="text-[11px] text-[#9CA3AF] dark:text-zinc-500 pt-2 border-t border-[#FED7AA]/40 dark:border-zinc-800">
            Each day box shows colored dots for class sessions where attendance was conducted (green = Present, red = Absent). Click any day to view details.
          </p>
        </div>
      </main>

      {/* Day Details Modal (Centered Popup) */}
      {selectedDate && (
        <Modal
          open={true}
          onClose={() => setSelectedDate(null)}
          title={
            new Intl.DateTimeFormat('en-GB', {
              timeZone: TZ,
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }).format(new Date(selectedDate + 'T00:00:00+05:30'))
          }
          size="md"
        >
          {(() => {
            const displayResults = selectedDayResults.filter(
              (r) => r.color !== 'grey' && r.label !== 'Not recorded' && r.label !== 'Cancelled'
            );
            return (
              <>
                <p className="text-xs text-[#6B7280] dark:text-zinc-400 -mt-2 mb-4">
                  {displayResults.length} class session{displayResults.length === 1 ? '' : 's'} recorded
                </p>

                <div className="space-y-3">
                  {displayResults.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#6B7280] dark:text-zinc-400 italic">
                      No attendance sessions were recorded on this date.
                    </div>
                  ) : (
                    displayResults.map((r) => {
                      const timeRange = formatTimeRange12(r.startAt, r.endAt);
                      const isUnderReview =
                        r.isReview ||
                        r.color === 'yellow' ||
                        r.color === 'orange' ||
                        r.label.toLowerCase().includes('review');
                      const isPresent = (r.color === 'green' || r.label === 'Present') && !isUnderReview;
                      const isAbsent = r.color === 'red' || r.label === 'Absent';

                return (
                  <div
                    key={r.periodRunId}
                    className={cn(
                      'p-4 rounded-[12px] border transition-all space-y-3 shadow-xs',
                      isUnderReview
                        ? 'bg-[#FEF9C3]/80 dark:bg-yellow-950/40 border-[#FDE047] dark:border-yellow-700/60 text-[#713F12] dark:text-yellow-200'
                        : isPresent
                        ? 'bg-[#DCFCE7]/70 dark:bg-emerald-950/40 border-[#86EFAC] dark:border-emerald-700/60 text-[#14532D] dark:text-emerald-200'
                        : isAbsent
                        ? 'bg-[#FEE2E2]/70 dark:bg-rose-950/40 border-[#FCA5A5] dark:border-rose-700/60 text-[#7F1D1D] dark:text-rose-200'
                        : 'bg-[#F3F4F6] dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-[#374151] dark:text-zinc-300'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                      <div>
                        <h3 className="font-semibold text-sm leading-snug">
                          {r.subject}
                        </h3>
                        <p
                          className={cn(
                            'text-xs mt-0.5',
                            isUnderReview
                              ? 'text-[#854D0E] dark:text-yellow-300'
                              : isPresent
                              ? 'text-[#166534] dark:text-emerald-300'
                              : isAbsent
                              ? 'text-[#991B1B] dark:text-rose-300'
                              : 'text-[#6B7280] dark:text-zinc-400'
                          )}
                        >
                          {r.periodName} • {timeRange}
                        </p>
                      </div>

                      {/* Status / Warning Badge */}
                      {isUnderReview ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF08A] dark:bg-yellow-900/60 text-[#854D0E] dark:text-yellow-200 border border-[#FACC15] dark:border-yellow-600 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#CA8A04] dark:text-yellow-400 shrink-0" />
                          <span>Under Review</span>
                        </span>
                      ) : isPresent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-zinc-900/90 text-[#15803D] dark:text-emerald-300 border border-[#86EFAC] dark:border-emerald-700 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400 shrink-0" />
                          <span>Present</span>
                        </span>
                      ) : isAbsent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-zinc-900/90 text-[#B91C1C] dark:text-rose-300 border border-[#FCA5A5] dark:border-rose-700 shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-rose-400 shrink-0" />
                          <span>Absent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-zinc-800 text-[#4B5563] dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400 shrink-0" />
                          <span>{r.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Problem Report Action */}
                    <div
                      className={cn(
                        'pt-2 border-t flex justify-end',
                        isUnderReview
                          ? 'border-[#FDE047]/60 dark:border-yellow-700/60'
                          : isPresent
                          ? 'border-[#86EFAC]/60 dark:border-emerald-700/60'
                          : isAbsent
                          ? 'border-[#FCA5A5]/60 dark:border-rose-700/60'
                          : 'border-gray-200 dark:border-zinc-700'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setReportingPeriod(r);
                          setReportMsg('');
                          setReportSent(false);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors',
                          isUnderReview
                            ? 'text-[#A16207] dark:text-yellow-400 hover:text-[#713F12] dark:hover:text-yellow-300'
                            : isPresent
                            ? 'text-[#15803D] dark:text-emerald-400 hover:text-[#14532D] dark:hover:text-emerald-300'
                            : isAbsent
                            ? 'text-[#B91C1C] dark:text-rose-400 hover:text-[#7F1D1D] dark:hover:text-rose-300'
                            : 'text-[#EA580C] dark:text-orange-400 hover:text-[#C2410C] dark:hover:text-orange-300'
                        )}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Report a problem</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      );
    })()}
  </Modal>
      )}

      {/* Report a Problem Modal */}
      {reportingPeriod && (
        <Modal
          open={true}
          onClose={() => setReportingPeriod(null)}
          title="Report Discrepancy"
          size="md"
        >
          {reportSent ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-[#1F2937] dark:text-zinc-100 font-semibold">
                Your report has been securely delivered to the course admin for review.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportingPeriod(null)}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-[#FFF7ED] dark:bg-orange-950/40 rounded-[10px] border border-[#FED7AA] dark:border-orange-800/60 text-xs text-slate-800 dark:text-zinc-200">
                Submitting discrepancy inquiry for <strong>{reportingPeriod.subject}</strong> ({reportingPeriod.periodName}) on {reportingPeriod.date}.
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1F2937] dark:text-zinc-200 block mb-1">
                  Describe what happened (up to 500 characters)
                </label>
                <textarea
                  value={reportMsg}
                  maxLength={500}
                  onChange={(e) => setReportMsg(e.target.value)}
                  placeholder="e.g. My Bluetooth was enabled, but phone was in my bag or had low battery…"
                  className="w-full border border-[#FED7AA] dark:border-zinc-700 rounded-[10px] p-3 text-xs bg-white dark:bg-zinc-800 focus:border-[#F97316] dark:focus:border-orange-500 focus:ring-2 focus:ring-[#F97316]/20 dark:focus:ring-orange-500/20 focus:outline-none min-h-[110px] resize-none text-[#1F2937] dark:text-zinc-100"
                />
                <div className="text-[11px] text-[#9CA3AF] dark:text-zinc-500 text-right mt-1">
                  {reportMsg.length} / 500 characters
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-[#FED7AA] dark:border-zinc-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReportingPeriod(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  loading={reportLoading}
                  disabled={!reportMsg.trim()}
                  onClick={sendReport}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report</span>
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#6B7280] dark:text-zinc-500 border-t border-[#FED7AA]/40 dark:border-zinc-800">
        Automated Classroom Attendance System • Classic Bluetooth Attendance Node
      </footer>
    </div>
  );
}
