'use client';
import { useState, useMemo } from 'react';
import {
  cn,
  formatTimeRange12,
  getAttendanceRateInfo,
  TZ,
} from '@/lib/utils';
import {
  ArrowLeft,
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Modal } from '@/components/ui/Modal';

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

interface SubjectItem {
  subject: string;
  attended: number;
  absent: number;
  total: number;
  rate: number | null;
  sessions: AttendanceResult[];
}

export function StudentSubjectView({
  data,
  onBack,
  isStandalone = false,
}: {
  data: StudentData;
  onBack: () => void;
  isStandalone?: boolean;
}) {
  // Modal state: holds the clicked subject item for the popup
  const [activeSubjectModal, setActiveSubjectModal] = useState<SubjectItem | null>(null);

  // Group attendance by subject
  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, SubjectItem>();

    data.results.forEach((r) => {
      const subj = r.subject?.trim() || 'General';
      if (!map.has(subj)) {
        map.set(subj, {
          subject: subj,
          attended: 0,
          absent: 0,
          total: 0,
          rate: null,
          sessions: [],
        });
      }
      const entry = map.get(subj)!;
      entry.sessions.push(r);
      const isPresent = (r.color === 'green' || r.label === 'Present') && !r.isReview;
      const isAbsent = r.color === 'red' || r.label === 'Absent';
      if (isPresent) entry.attended++;
      if (isAbsent) entry.absent++;
      entry.total = entry.attended + entry.absent;
      entry.rate = entry.total > 0 ? Math.round((entry.attended / entry.total) * 100) : null;
    });

    // Sort sessions inside each subject by newest date and start time first
    map.forEach((entry) => {
      entry.sessions.sort((a, b) => {
        const dDiff = b.date.localeCompare(a.date);
        if (dDiff !== 0) return dDiff;
        const tA = a.startAt ? new Date(a.startAt).getTime() : 0;
        const tB = b.startAt ? new Date(b.startAt).getTime() : 0;
        return tB - tA;
      });
    });

    return Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [data.results]);

  // Total attended and absent across all subjects
  const overallAttended = data.results.filter(
    (r) => (r.color === 'green' || r.label === 'Present') && !r.isReview
  ).length;
  const overallAbsent = data.results.filter(
    (r) => r.color === 'red' || r.label === 'Absent'
  ).length;
  const overallTotal = overallAttended + overallAbsent;
  const overallRate =
    overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : null;
  const overallRateInfo = getAttendanceRateInfo(overallRate);

  function formatDateHuman(dStr: string) {
    const [y, m, d] = dStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: TZ,
    }).format(dateObj);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col selection:bg-orange-100 dark:selection:bg-orange-950/60 transition-colors">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-20 transition-colors">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold shrink-0"
              title={isStandalone ? 'Back to Lookup' : 'Back to Student Calendar'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isStandalone ? 'Back to Search' : 'Back to Calendar'}
              </span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {data.student.name}
                </h1>
                <span className="font-mono text-xs font-semibold text-[#EA580C] dark:text-orange-400 shrink-0">
                  {data.student.regNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:block truncate">
                Attendance by Subject • Verified Classroom Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-zinc-200 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-800/70 whitespace-nowrap">
              {data.student.className || 'CS 3rd Year'}
            </span>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* Page Hero Banner */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-orange-200/70 dark:border-zinc-800 p-5 sm:p-6 shadow-sm space-y-4 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-800/70 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100">
                    Subject-wise Attendance & Standing
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {subjectBreakdown.length} subject{subjectBreakdown.length === 1 ? '' : 's'} enrolled • Click any subject to view its full session history
                  </p>
                </div>
              </div>
            </div>

            {/* Overall Rate Pill */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700/80 shrink-0">
              <div className="text-right">
                <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-zinc-400 tracking-wider">
                  Total Attendance
                </div>
                <div className={cn('text-lg font-extrabold tabular-nums', overallRateInfo.textClass)}>
                  {overallRate !== null ? `${overallRate}%` : 'N/A'}
                </div>
              </div>
              <span
                className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs',
                  overallRateInfo.badgeClass
                )}
              >
                {overallRateInfo.label}
              </span>
            </div>
          </div>

          {/* 4-Tier Color Legend Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <span className="text-slate-500 dark:text-zinc-400 font-medium text-[11px]">
              College Attendance Standing Thresholds:
            </span>
            <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                &ge;85% Green (Excellent)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                80&ndash;85% Blue (Good Standing)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                75&ndash;80% Amber (Watch / Warning)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                &lt;75% Red (Shortage)
              </span>
            </div>
          </div>
        </div>

        {/* Subject Cards Grid (With Percentage Alongside Every Subject) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {subjectBreakdown.map((subj) => {
            const sRateInfo = getAttendanceRateInfo(subj.rate);
            return (
              <div
                key={subj.subject}
                onClick={() => setActiveSubjectModal(subj)}
                className="p-4 rounded-xl border bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-orange-500 dark:hover:border-orange-500/80 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-xs"
                title={`Click to view class session history for ${subj.subject}`}
              >
                {/* Subject Name and Percentage Badge Side by Side */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {subj.subject}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {subj.attended} of {subj.total} class{subj.total === 1 ? '' : 'es'} attended
                    </span>
                  </div>

                  {/* Percentage Badge Displayed Prominently Alongside Subject */}
                  <div className="shrink-0 flex flex-col items-end">
                    <span
                      className={cn(
                        'text-base font-extrabold tabular-nums px-2.5 py-0.5 rounded-lg border shadow-2xs',
                        sRateInfo.badgeClass
                      )}
                    >
                      {subj.rate !== null ? `${subj.rate}%` : '—'}
                    </span>
                    <span className={cn('text-[9px] font-semibold mt-0.5', sRateInfo.textClass)}>
                      {sRateInfo.label}
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Exact Tier Color */}
                <div className="space-y-1">
                  {subj.total > 0 && (
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-300', sRateInfo.progressClass)}
                        style={{ width: `${Math.min(100, Math.max(0, subj.rate ?? 0))}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 pt-0.5">
                    <span>{subj.absent} missed</span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium group-hover:underline flex items-center gap-1 transition-colors">
                      <span>View details</span>
                      <span>&rarr;</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Subject Detail Popup Modal */}
      {activeSubjectModal && (
        <Modal
          open={Boolean(activeSubjectModal)}
          onClose={() => setActiveSubjectModal(null)}
          size="lg"
          title={
            <div className="flex items-center gap-2.5 pr-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-800/70 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {activeSubjectModal.subject}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">
                  Class History & Attendance Breakdown
                </div>
              </div>
            </div>
          }
          footer={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSubjectModal(null)}
              className="cursor-pointer"
            >
              Close
            </Button>
          }
        >
          {(() => {
            const sRateInfo = getAttendanceRateInfo(activeSubjectModal.rate);
            return (
              <div className="space-y-4">
                {/* Metric Summary Card inside Popup */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase font-medium text-slate-500 dark:text-zinc-400 tracking-wider">
                        Attendance Rate
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className={cn('text-2xl font-black tabular-nums', sRateInfo.textClass)}>
                          {activeSubjectModal.rate !== null ? `${activeSubjectModal.rate}%` : '—'}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                          ({activeSubjectModal.attended} of {activeSubjectModal.total} classes attended)
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs',
                        sRateInfo.badgeClass
                      )}
                    >
                      {sRateInfo.label}
                    </span>
                  </div>

                  {activeSubjectModal.total > 0 && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', sRateInfo.progressClass)}
                          style={{ width: `${Math.min(100, Math.max(0, activeSubjectModal.rate ?? 0))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>{activeSubjectModal.attended} attended</span>
                        <span>{activeSubjectModal.absent} missed</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* List of sessions for this subject */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                    <span>Conducted Sessions ({activeSubjectModal.sessions.length})</span>
                  </div>

                  {activeSubjectModal.sessions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                      No conducted classes recorded yet for this subject.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                      {activeSubjectModal.sessions.map((session) => {
                        const isPresent = (session.color === 'green' || session.label === 'Present') && !session.isReview;
                        const timeSlot = session.startAt && session.endAt ? formatTimeRange12(session.startAt, session.endAt) : '';

                        return (
                          <div
                            key={session.periodRunId}
                            className="p-3 sm:p-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                                  isPresent
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/70'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/70'
                                )}
                              >
                                {isPresent ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                                  {session.periodName}
                                </div>
                                <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 flex-wrap">
                                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
                                    <CalendarIcon className="w-3 h-3 text-slate-400" />
                                    {formatDateHuman(session.date)}
                                  </span>
                                  {timeSlot && (
                                    <span className="flex items-center gap-1 font-mono text-[10px]">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {timeSlot}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0',
                                isPresent
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              )}
                            >
                              {isPresent ? 'Verified Present' : 'Marked Absent'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
