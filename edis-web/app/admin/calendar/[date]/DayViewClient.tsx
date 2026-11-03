'use client';
import { useState } from 'react';
import { cn, formatTime12IST, formatTimeRange12, TZ, getAdjacentDates } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill, AttendanceColorType } from '@/components/ui/StatusPill';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { Badge } from '@/components/ui/Badge';
import { Legend } from '@/components/ui/Legend';
import { Input } from '@/components/ui/Input';
import { overrideStudentAttendance } from '@/app/admin/reports/actions';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';

interface PeriodRun {
  id: string;
  name: string;
  subject: string;
  status: string;
  windows: number;
  start_at: string;
  end_at: string;
  locked: boolean;
}

interface Student {
  id: string;
  name: string;
  reg_no: string;
  bluetooth_address: string;
}

interface AttResult {
  id?: string;
  period_run_id: string;
  student_id: string;
  color: string;
  windows_ran: number;
  windows_present: number;
  admin_override: boolean;
  override_reason: string | null;
  locked: boolean;
  final_status: string;
}

interface Detection {
  id: string;
  period_run_id: string;
  student_id: string;
  window_num: number;
  detected: boolean;
  detected_at: string;
  rssi?: number;
}

interface WindowItem {
  id: string;
  period_run_id: string;
  window_num: number;
  status: string;
}

const REASON_PRESETS = [
  'Problem report resolved',
  'Verified present in room',
  'Medical certificate / Excused',
  'Confirmed absent by faculty',
];

export function DayViewClient({
  date,
  periodRuns,
  students,
  results,
  detections,
  windowsList,
  adminEmail,
}: {
  date: string;
  periodRuns: PeriodRun[];
  students: Student[];
  results: AttResult[];
  detections: Detection[];
  windowsList: WindowItem[];
  adminEmail: string;
}) {
  const [localResults, setLocalResults] = useState<AttResult[]>(results);
  const [search, setSearch] = useState('');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    student: Student;
    period: PeriodRun;
    result?: AttResult;
  } | null>(null);

  // Override Form State
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'absent'>('present');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState('');

  // Compute midnight lock status (00:00 IST next day)
  const dObj = new Date(date + 'T00:00:00+05:30');
  const midnightDeadline = new Date(dObj.getTime() + 24 * 60 * 60 * 1000);
  const isLocked = Date.now() > midnightDeadline.getTime();

  // Compute previous and next calendar dates (avoiding UTC timezone drift)
  const { prevDate, nextDate } = getAdjacentDates(date);

  const fullDateDisplay = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dObj); // e.g. "Tuesday, 27 Oct 2026"

  function getResult(periodId: string, studentId: string) {
    return localResults.find(
      (r) => r.period_run_id === periodId && r.student_id === studentId
    );
  }

  // Summary counts
  const totalPeriods = periodRuns.length;
  const presentCount = localResults.filter((r) => r.color === 'green').length;
  const reviewCount = localResults.filter(
    (r) => (r.color === 'yellow' || r.color === 'orange') && !r.admin_override
  ).length;
  const absentCount = localResults.filter((r) => r.color === 'red').length;

  // Missed windows check
  const missedWindows = windowsList.filter(
    (w) =>
      w.status === 'missed' && periodRuns.some((pr) => pr.id === w.period_run_id)
  );

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.reg_no.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (needsReviewOnly) {
      const hasReview = periodRuns.some((pr) => {
        const res = getResult(pr.id, s.id);
        return res && (res.color === 'yellow' || res.color === 'orange');
      });
      return hasReview;
    }

    return true;
  });

  function handleSelectCell(student: Student, period: PeriodRun, result?: AttResult) {
    setSelectedCell({ student, period, result });
    const isCurrentlyPresent = result?.color === 'green' || result?.final_status === 'present';
    setOverrideStatus(isCurrentlyPresent ? 'absent' : 'present');
    setOverrideReason('');
    setOverrideError('');
    setOverrideSuccess('');
  }

  async function handleApplyOverride() {
    if (!selectedCell) return;
    if (!overrideReason.trim()) {
      setOverrideError('Please provide an override reason for the audit trail.');
      return;
    }

    setOverrideLoading(true);
    setOverrideError('');
    setOverrideSuccess('');

    try {
      const { student, period } = selectedCell;
      const res = await overrideStudentAttendance({
        periodRunId: period.id,
        studentId: student.id,
        status: overrideStatus,
        reason: overrideReason.trim(),
      });

      const newColor = res.color;
      const newStatus = res.finalStatus;
      const newRan = res.windowsRan;
      const newPres = res.windowsPresent;

      // Update local matrix state
      setLocalResults((prev) => {
        const found = prev.some(
          (r) => r.period_run_id === period.id && r.student_id === student.id
        );
        if (found) {
          return prev.map((r) =>
            r.period_run_id === period.id && r.student_id === student.id
              ? {
                  ...r,
                  color: newColor,
                  final_status: newStatus,
                  windows_ran: newRan,
                  windows_present: newPres,
                  admin_override: true,
                  override_reason: overrideReason.trim(),
                  reviewed: true,
                }
              : r
          );
        } else {
          return [
            ...prev,
            {
              id: res.resultId,
              period_run_id: period.id,
              student_id: student.id,
              color: newColor,
              final_status: newStatus,
              windows_ran: newRan,
              windows_present: newPres,
              admin_override: true,
              override_reason: overrideReason.trim(),
              reviewed: true,
              locked: false,
            },
          ];
        }
      });

      // Refresh drawer state
      setSelectedCell((prev) =>
        prev
          ? {
              ...prev,
              result: {
                ...(prev.result ?? {
                  period_run_id: period.id,
                  student_id: student.id,
                  locked: false,
                }),
                color: newColor,
                final_status: newStatus,
                windows_ran: newRan,
                windows_present: newPres,
                admin_override: true,
                override_reason: overrideReason.trim(),
              },
            }
          : null
      );

      setOverrideSuccess(`Attendance successfully updated to ${newStatus.toUpperCase()}.`);
    } catch (err: any) {
      setOverrideError(err.message ?? 'Failed to update record.');
    } finally {
      setOverrideLoading(false);
    }
  }

  // Get raw detections for selected drawer item
  const selectedDetections = selectedCell
    ? detections.filter(
        (d) =>
          d.period_run_id === selectedCell.period.id &&
          d.student_id === selectedCell.student.id
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={fullDateDisplay}
        subtitle="Individual classroom attendance records and window probe verification"
        backHref="/admin/calendar"
        backLabel="Back to calendar"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/calendar/${prevDate}`}>
              <Button size="sm" variant="outline" title="Previous day">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/admin/calendar/${nextDate}`}>
              <Button size="sm" variant="outline" title="Next day">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="ml-1">
              {isLocked ? (
                <Badge variant="neutral" icon={<Lock className="w-3.5 h-3.5" />}>
                  Locked (00:00 IST)
                </Badge>
              ) : (
                <Badge variant="orange" icon={<Unlock className="w-3.5 h-3.5" />}>
                  Open for review
                </Badge>
              )}
            </div>
          </div>
        }
      />

      {/* Missed Window Warning Banner */}
      {missedWindows.length > 0 && (
        <Banner variant="error" title="Window Probe Incomplete">
          One or more planned checking windows encountered a timeout or USB disconnect during execution.
        </Banner>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Periods Scheduled" value={totalPeriods} />
        <StatCard label="Verified Present" value={presentCount} />
        <StatCard label="Awaiting Review" value={reviewCount} />
        <StatCard label="Recorded Absent" value={absentCount} />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-[#FED7AA] dark:border-zinc-800 p-4 shadow-edis flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-zinc-400" />
          <input
            type="text"
            placeholder="Search student name or reg…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-[10px] border border-[#FED7AA] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 placeholder:text-[#6B7280] dark:placeholder:text-zinc-500 focus:border-[#F97316] dark:focus:border-orange-500 focus:ring-2 focus:ring-[#F97316]/20 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNeedsReviewOnly(!needsReviewOnly)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
              needsReviewOnly
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Needs review only ({reviewCount})</span>
          </button>
        </div>
      </div>

      {/* Students x Periods Matrix Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        {periodRuns.length === 0 ? (
          <div className="p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            No attendance sessions ran on this date.
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left text-xs border-collapse">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 shadow-2xs">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-50 dark:bg-zinc-800 px-4 py-3.5 font-bold text-slate-900 dark:text-zinc-100 border-r border-slate-200 dark:border-zinc-700 min-w-[180px] max-w-[220px]">
                    Student
                  </th>
                  {periodRuns.map((pr) => {
                    const timeRange = formatTimeRange12(pr.start_at, pr.end_at);
                    const hasMissed = windowsList.some(
                      (w) => w.period_run_id === pr.id && w.status === 'missed'
                    );

                    return (
                      <th
                        key={pr.id}
                        className="px-4 py-3 text-center border-r border-slate-200 dark:border-zinc-700 min-w-[130px] font-medium"
                      >
                        <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                          {pr.subject || pr.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {timeRange}
                        </div>
                        {hasMissed && (
                          <span className="inline-block mt-1 text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full font-bold">
                            Window dropped
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body with Sticky Student Column */}
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={periodRuns.length + 1}
                      className="py-12 text-center text-slate-500 dark:text-zinc-400"
                    >
                      No students match the active filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors">
                      {/* Sticky Student Column */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-700 px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-zinc-100">{s.name}</div>
                        <div className="font-mono text-[11px] text-orange-600 dark:text-orange-400 font-bold">
                          {s.reg_no}
                        </div>
                      </td>

                      {/* Period Cells */}
                      {periodRuns.map((pr) => {
                        const res = getResult(pr.id, s.id);
                        const color: AttendanceColorType =
                          (res?.color as AttendanceColorType) ?? 'grey';

                        // Label formatting e.g. "3/3", "2/3 !", "1/3 !!", "0/3", "Unmarked"
                        let cellLabel = 'Pending';
                        if (res) {
                          if (res.final_status === 'not_recorded' || res.windows_ran === 0) {
                            cellLabel = 'Unmarked';
                          } else {
                            const tag =
                              color === 'yellow' ? ' !' : color === 'orange' ? ' !!' : '';
                            cellLabel = `${res.windows_present}/${res.windows_ran}${tag}`;
                          }
                        }

                        return (
                          <td
                            key={pr.id}
                            className="px-3 py-3 text-center border-r border-slate-100 dark:border-zinc-800"
                          >
                            <StatusPill
                              color={color}
                              label={cellLabel}
                              size="sm"
                              onClick={() => handleSelectCell(s, pr, res)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result Colours Legend */}
      <Legend isAdmin={true} />

      {/* Cell Detail Drawer (Side panel desktop / Bottom sheet phone) */}
      <Drawer
        open={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        title={selectedCell?.student.name}
        subtitle={`${selectedCell?.student.reg_no} • ${selectedCell?.period.subject} (${selectedCell?.period.name})`}
      >
        {selectedCell && (
          <div className="space-y-5 text-xs sm:text-sm">
            {overrideError && <Banner variant="error">{overrideError}</Banner>}
            {overrideSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{overrideSuccess}</span>
              </div>
            )}

            {/* Attendance Status Overview */}
            <div className="p-4 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-200/80 dark:border-orange-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-400">Current Status:</span>
                <StatusPill
                  color={(selectedCell.result?.color as AttendanceColorType) ?? 'grey'}
                  label={
                    selectedCell.result?.final_status === 'not_recorded' ||
                    selectedCell.result?.windows_ran === 0
                      ? 'Unmarked'
                      : undefined
                  }
                  size="md"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-400">Windows Present:</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                  {selectedCell.result?.windows_present ?? 0} of{' '}
                  {selectedCell.result?.windows_ran ?? selectedCell.period.windows}
                </span>
              </div>
              {selectedCell.result?.admin_override && (
                <div className="pt-2 border-t border-orange-200/60 dark:border-orange-800/60 text-xs">
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Admin Override: </span>
                  <span className="text-slate-600 dark:text-zinc-300">
                    {selectedCell.result.override_reason}
                  </span>
                </div>
              )}
            </div>

            {/* Bluetooth Probe Detections Timeline */}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-zinc-200 uppercase tracking-wider text-xs mb-2">
                Bluetooth Probe Detections
              </h3>
              {selectedDetections.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-zinc-400 italic bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                  No probe responses recorded for this device during this session.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDetections.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 bg-white dark:bg-zinc-800/90 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {d.detected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-zinc-100">Window {d.window_num}</span>
                      </div>
                      <span className="font-mono text-slate-500 dark:text-zinc-400 text-[11px]">
                        {formatTime12IST(d.detected_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Universal Administrator Attendance Override Panel */}
            <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Edit3 className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span>Admin Attendance Override</span>
                </h3>
                {selectedCell.result?.admin_override && (
                  <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                    Previously Overridden
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Administrators can manually update this student's attendance to Present or Absent.
              </p>

              {/* Status Radio Choices */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setOverrideStatus('present')}
                  className={cn(
                    'p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2',
                    overrideStatus === 'present'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 shadow-2xs font-bold text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-zinc-700 hover:border-emerald-200 dark:hover:border-emerald-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  )}
                >
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs">Mark Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverrideStatus('absent')}
                  className={cn(
                    'p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2',
                    overrideStatus === 'absent'
                      ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 shadow-2xs font-bold text-rose-900 dark:text-rose-200'
                      : 'border-slate-200 dark:border-zinc-700 hover:border-rose-200 dark:hover:border-rose-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  )}
                >
                  <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="text-xs">Mark Absent</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Quick reasons:</span>
                <div className="flex flex-wrap gap-1">
                  {REASON_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setOverrideReason(p)}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-zinc-700 hover:text-orange-700 dark:hover:text-orange-400 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 cursor-pointer transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Override Reason Input */}
              <Input
                label="Override Reason (Immutable Audit Log)"
                placeholder="e.g. Verified physically present in classroom"
                value={overrideReason}
                onChange={(e) => {
                  setOverrideReason(e.target.value);
                  if (overrideError) setOverrideError('');
                }}
                required
              />

              {isLocked && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Past midnight lock: change will be logged with administrative audit trail.</span>
                </div>
              )}

              <Button
                variant={overrideStatus === 'present' ? 'primary' : 'danger-outline'}
                size="sm"
                onClick={handleApplyOverride}
                loading={overrideLoading}
                disabled={!overrideReason.trim()}
                className="w-full font-semibold shadow-glow-orange cursor-pointer"
              >
                Apply Attendance Override ({overrideStatus === 'present' ? 'Present' : 'Absent'})
              </Button>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Logged under {adminEmail}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
