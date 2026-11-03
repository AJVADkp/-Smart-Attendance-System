'use client';
import { useState } from 'react';
import { cn, TZ } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface PeriodRun {
  id: string;
  date: string;
  name: string;
  subject: string;
  status: string;
  windows: number;
  start_at: string;
  end_at: string;
}

interface TimetableItem {
  id: string;
  weekday: number;
  period_name: string;
  subject: string;
  start_time: string;
  end_time: string;
  windows: number;
}

interface Props {
  periodRuns: PeriodRun[];
  timetable: TimetableItem[];
  reviewCountByDate: Record<string, number>;
  missedDateSet: string[];
  year: number;
  month: number;
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

export function CalendarClient({
  periodRuns,
  timetable,
  reviewCountByDate,
  missedDateSet,
  year,
  month,
}: Props) {
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Map period runs by date
  const runsByDate = new Map<string, PeriodRun[]>();
  periodRuns.forEach((r) => {
    if (!runsByDate.has(r.date)) runsByDate.set(r.date, []);
    runsByDate.get(r.date)!.push(r);
  });

  function goToPrevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
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

  const cells: Array<{ day: number | null; dateStr: string | null; weekday: number }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null, weekday: i });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const wd = new Date(viewYear, viewMonth - 1, d).getDay();
    // Monday is 1, Sun is 7 in our timetable representation
    const timetableWd = wd === 0 ? 7 : wd;
    cells.push({ day: d, dateStr: dStr, weekday: timetableWd });
  }

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 shadow-card overflow-hidden">
        {/* Month Navigation Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#EA580C] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight">
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
              onClick={goToPrevMonth}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Day Name Header (Sun to Sat) */}
        <div className="grid grid-cols-7 border-b border-[#FED7AA] dark:border-zinc-800 bg-[#FFF7ED]/70 dark:bg-zinc-800/60 text-center text-xs font-semibold text-[#6B7280] dark:text-zinc-400">
          {DAY_SHORT.map((d) => (
            <div key={d} className="py-2.5">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#FED7AA]/40 dark:divide-zinc-800">
          {cells.map((cell, idx) => {
            if (!cell.day || !cell.dateStr) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="bg-[#FFF7ED]/20 dark:bg-zinc-950/40 min-h-[50px] sm:min-h-[96px]"
                />
              );
            }

            const { day, dateStr, weekday } = cell;
            const isToday = dateStr === todayISO;
            const runs = runsByDate.get(dateStr) ?? [];
            const timetableScheduled = timetable.filter((t) => t.weekday === weekday);
            const periodCount = runs.length > 0 ? runs.length : timetableScheduled.length;
            const hasRan = runs.some((r) => r.status === 'finished' || r.status === 'running');
            const reviewCount = reviewCountByDate[dateStr] ?? 0;
            const hasMissedWindow = missedDateSet.includes(dateStr);
            const isSunday = weekday === 7;

            return (
              <Link
                key={dateStr}
                href={`/admin/calendar/${dateStr}`}
                className={cn(
                  'min-h-[56px] sm:min-h-[96px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-all duration-100 group relative',
                  isSunday
                    ? 'bg-gray-50/40 dark:bg-zinc-950/40 text-[#9CA3AF] dark:text-zinc-600'
                    : 'bg-white dark:bg-zinc-900 hover:bg-[#FFF7ED]/60 dark:hover:bg-zinc-800/50',
                  isToday && 'ring-2 ring-inset ring-[#F97316]'
                )}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors',
                      isToday
                        ? 'bg-[#EA580C] text-white shadow-xs'
                        : isSunday
                        ? 'text-[#9CA3AF] dark:text-zinc-600'
                        : 'text-[#1F2937] dark:text-zinc-100 group-hover:text-[#EA580C] dark:group-hover:text-orange-400'
                    )}
                  >
                    {day}
                  </span>

                  {/* Mobile Dots (< 640px) */}
                  <div className="flex sm:hidden items-center gap-1">
                    {periodCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                    )}
                    {reviewCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
                    )}
                    {hasMissedWindow && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                    )}
                  </div>
                </div>

                {/* Desktop Chips (>= 640px) */}
                <div className="hidden sm:flex flex-col gap-1 mt-1">
                  {periodCount > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] truncate flex items-center gap-1',
                        hasRan
                          ? 'bg-[#FFEDD5] dark:bg-orange-950/40 text-[#C2410C] dark:text-orange-300 font-semibold border border-[#FED7AA] dark:border-orange-800/60'
                          : 'bg-[#FFF7ED] dark:bg-zinc-800/70 text-[#6B7280] dark:text-zinc-400 border border-[#FED7AA]/60 dark:border-zinc-700'
                      )}
                    >
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span>
                        {periodCount} {periodCount === 1 ? 'period' : 'periods'}
                      </span>
                    </span>
                  )}

                  {reviewCount > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-[#FEF9C3] dark:bg-yellow-950/40 text-[#A16207] dark:text-yellow-300 border border-[#FDE047] dark:border-yellow-800/60 flex items-center gap-1 truncate">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                      <span>Review {reviewCount}</span>
                    </span>
                  )}

                  {hasMissedWindow && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-[#FEE2E2] dark:bg-rose-950/40 text-[#B91C1C] dark:text-rose-300 border border-[#FCA5A5] dark:border-rose-800/60 flex items-center gap-1 truncate">
                      <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                      <span>Missed window</span>
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Legend below the grid */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 shadow-card flex flex-wrap items-center gap-4 text-xs text-[#6B7280] dark:text-zinc-400">
        <span className="font-semibold text-[#1F2937] dark:text-zinc-100 uppercase tracking-wider text-[11px]">
          Calendar Legend:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#EA580C] text-white text-[10px] font-bold flex items-center justify-center">
            {now.getDate()}
          </span>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-[#FFEDD5] dark:bg-orange-950/40 border border-[#FED7AA] dark:border-orange-800/60 text-[#C2410C] dark:text-orange-300 font-semibold text-[11px]">
            N periods
          </span>
          <span>Class scheduled / completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-[#FEF9C3] dark:bg-yellow-950/40 border border-[#FDE047] dark:border-yellow-800/60 text-[#A16207] dark:text-yellow-300 font-semibold text-[11px]">
            Review N
          </span>
          <span>Awaiting manual review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-[#FEE2E2] dark:bg-rose-950/40 border border-[#FCA5A5] dark:border-rose-800/60 text-[#B91C1C] dark:text-rose-300 font-semibold text-[11px]">
            Missed window
          </span>
          <span>Uncompleted window probe</span>
        </div>
      </div>
    </div>
  );
}
