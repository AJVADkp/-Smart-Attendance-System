'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Banner } from '@/components/ui/Banner';
import {
  StudentAttendanceSession,
  getStudentAttendanceHistory,
} from '@/app/admin/students/actions';
import { overrideStudentAttendance } from '@/app/admin/reports/actions';
import { formatTimeRange12, TZ, cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Bluetooth,
  Pencil,
  Search,
  X,
  Radio,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';

interface Student {
  id: string;
  reg_no: string;
  reg_no_normalized: string;
  name: string;
  bluetooth_address: string;
  phone_type: string;
  active: boolean;
  created_at: string;
}

interface StudentAttendanceDrawerProps {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  onStudentUpdated?: () => void;
}

export function StudentAttendanceDrawer({
  student,
  open,
  onClose,
  onStudentUpdated,
}: StudentAttendanceDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<StudentAttendanceSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'other'>('all');
  const [search, setSearch] = useState('');

  // Inline override state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'present' | 'absent'>('present');
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load records whenever student opens
  useEffect(() => {
    if (!open || !student) {
      setRecords([]);
      setEditingSessionId(null);
      setBanner(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getStudentAttendanceHistory(student.id)
      .then((data) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load attendance history.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, student]);

  const refreshHistory = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const data = await getStudentAttendanceHistory(student.id);
      setRecords(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to reload attendance history.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const attendedCount = records.filter(
    (r) => (r.color === 'green' || r.finalStatus === 'present') && r.finalStatus !== 'under_review'
  ).length;

  const absentCount = records.filter(
    (r) => r.color === 'red' || r.finalStatus === 'absent'
  ).length;

  const otherCount = records.filter(
    (r) => r.finalStatus === 'under_review' || r.finalStatus === 'not_recorded'
  ).length;

  const completedTotal = attendedCount + absentCount;
  const attendanceRate =
    completedTotal > 0 ? Math.round((attendedCount / completedTotal) * 100) : 100;

  // Filtered sessions
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (filter === 'present' && (r.color !== 'green' && r.finalStatus !== 'present')) return false;
      if (filter === 'absent' && (r.color !== 'red' && r.finalStatus !== 'absent')) return false;
      if (
        filter === 'other' &&
        r.finalStatus !== 'under_review' &&
        r.finalStatus !== 'not_recorded' &&
        r.color !== 'grey'
      )
        return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSubject = r.subject.toLowerCase().includes(q);
        const matchesPeriod = r.periodName.toLowerCase().includes(q);
        const matchesDate = r.date.toLowerCase().includes(q);
        if (!matchesSubject && !matchesPeriod && !matchesDate) return false;
      }

      return true;
    });
  }, [records, filter, search]);

  function handleStartEdit(session: StudentAttendanceSession) {
    setEditingSessionId(session.periodRunId);
    setOverrideStatus(session.finalStatus === 'absent' ? 'present' : 'absent');
    setOverrideReason(
      session.overrideReason ||
        (session.finalStatus === 'absent' ? 'Verified in classroom' : 'Marked absent by administrator')
    );
    setBanner(null);
  }

  async function handleSaveOverride(session: StudentAttendanceSession) {
    if (!student) return;
    if (!overrideReason.trim()) {
      setBanner({ type: 'error', message: 'Please provide a reason for the attendance override.' });
      return;
    }

    setSavingOverride(true);
    setBanner(null);

    try {
      await overrideStudentAttendance({
        periodRunId: session.periodRunId,
        studentId: student.id,
        status: overrideStatus,
        reason: overrideReason.trim(),
      });

      setBanner({
        type: 'success',
        message: `Attendance updated to ${overrideStatus.toUpperCase()} for ${session.periodName} (${session.subject}).`,
      });
      setEditingSessionId(null);
      await refreshHistory();
      if (onStudentUpdated) onStudentUpdated();
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Failed to update attendance.',
      });
    } finally {
      setSavingOverride(false);
    }
  }

  if (!student) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="sm:max-w-xl md:max-w-2xl"
      title={
        <div className="flex items-center gap-2">
          <span className="text-slate-900 font-bold">{student.name}</span>
          <Badge variant={student.active ? 'success' : 'neutral'} size="sm">
            {student.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      }
      subtitle={
        <span className="font-mono text-orange-600 font-medium">
          {student.reg_no} • Attendance History & Records
        </span>
      }
    >
      <div className="space-y-5">
        {/* Banner notification */}
        {banner && (
          <Banner
            variant={banner.type}
            onDismiss={() => setBanner(null)}
          >
            {banner.message}
          </Banner>
        )}

        {/* Student hardware credentials bar */}
        <div className="p-3.5 bg-orange-50/50 dark:bg-orange-950/30 rounded-xl border border-orange-200/80 dark:border-orange-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-zinc-400 font-medium">Bluetooth MAC:</span>
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-orange-200 dark:border-orange-800/60 text-slate-800 dark:text-zinc-200">
              <Bluetooth className="w-3 h-3 text-orange-500 inline mr-1" />
              {student.bluetooth_address}
            </span>
          </div>
          {student.phone_type && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Device:</span>
              <span className="font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                {student.phone_type}
              </span>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Rate card */}
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Attendance
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-xl font-bold tracking-tight',
                  attendanceRate >= 75
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : attendanceRate >= 60
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {completedTotal > 0 ? `${attendanceRate}%` : 'N/A'}
              </span>
            </div>
            {/* Progress bar */}
            {completedTotal > 0 && (
              <div className="w-full bg-slate-100 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    attendanceRate >= 75
                      ? 'bg-emerald-500'
                      : attendanceRate >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
                />
              </div>
            )}
          </div>

          {/* Conducted card */}
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Sessions
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              {records.length}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500">Class periods</p>
          </div>

          {/* Present card */}
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Present
            </span>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
              {attendedCount}
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Sessions attended</p>
          </div>

          {/* Absent card */}
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 shadow-2xs space-y-1">
            <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Absent
            </span>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">
              {absentCount}
            </div>
            <p className="text-[10px] text-rose-600 dark:text-rose-400">Sessions missed</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-zinc-800">
          {/* Status Chips */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap',
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-orange-600 dark:text-orange-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              )}
            >
              All ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('present')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap',
                filter === 'present'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              )}
            >
              Present ({attendedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('absent')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap',
                filter === 'absent'
                  ? 'bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              )}
            >
              Absent ({absentCount})
            </button>
            {otherCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter('other')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap',
                  filter === 'other'
                    ? 'bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                )}
              >
                Other ({otherCount})
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search subject/date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-800 focus:border-orange-500 dark:focus:border-orange-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-slate-800 dark:text-zinc-100"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Session Attendance Records */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading student attendance records…</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60">
              {error}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700 italic space-y-1">
              <p className="font-semibold text-slate-700 dark:text-zinc-200 not-italic">No matching sessions found</p>
              <p>No attendance records match your active search or filter.</p>
            </div>
          ) : (
            filteredRecords.map((session) => {
              const isPresent = session.color === 'green' || session.finalStatus === 'present';
              const isAbsent = session.color === 'red' || session.finalStatus === 'absent';
              const isReview = session.finalStatus === 'under_review';
              const isEditing = editingSessionId === session.periodRunId;

              // Format date nicely
              let dateFormatted = session.date;
              try {
                dateFormatted = new Intl.DateTimeFormat('en-GB', {
                  timeZone: TZ,
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date(session.date + 'T00:00:00+05:30'));
              } catch {
                // fallback
              }

              const timeRange = formatTimeRange12(session.startAt, session.endAt);

              return (
                <div
                  key={session.periodRunId}
                  className={cn(
                    'p-4 rounded-xl border transition-all space-y-3 bg-white dark:bg-zinc-800/90 shadow-2xs',
                    isPresent
                      ? 'border-emerald-200/90 dark:border-emerald-800/80 hover:border-emerald-300 dark:hover:border-emerald-700'
                      : isAbsent
                      ? 'border-rose-200/90 dark:border-rose-800/80 hover:border-rose-300 dark:hover:border-rose-700'
                      : isReview
                      ? 'border-amber-200/90 dark:border-amber-800/80 hover:border-amber-300 dark:hover:border-amber-700'
                      : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                  )}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 leading-snug">
                        {session.subject}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-slate-700 dark:text-zinc-300">{session.periodName}</span>
                        <span>•</span>
                        <span>{timeRange}</span>
                        <span>•</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">{dateFormatted}</span>
                      </p>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {isPresent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Present</span>
                        </span>
                      ) : isAbsent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Absent</span>
                        </span>
                      ) : isReview ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Under Review</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-600 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                          <span>Not Recorded</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Windows and Details Row */}
                  <div className="text-xs text-slate-500 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-600">
                        Probes: {session.windowsPresent}/{session.windowsRan} windows
                      </span>
                      {session.adminOverride && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Admin Override
                        </span>
                      )}
                    </div>

                    {/* Quick Edit Action Button */}
                    {!isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(session)}
                        className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50/80 dark:hover:bg-orange-950/40 h-7 px-2.5"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        <span>Override Attendance</span>
                      </Button>
                    )}
                  </div>

                  {/* Override reason callout if already overridden */}
                  {session.adminOverride && session.overrideReason && !isEditing && (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <FileCheck2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-950 dark:text-amber-100">Override note:</span>{' '}
                        <span>{session.overrideReason}</span>
                      </div>
                    </div>
                  )}

                  {/* Inline Override Form */}
                  {isEditing && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-orange-200 dark:border-orange-800/60 space-y-3 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                          Override Attendance Record
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Status toggle selector */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOverrideStatus('present')}
                          className={cn(
                            'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                            overrideStatus === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Present</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverrideStatus('absent')}
                          className={cn(
                            'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                            overrideStatus === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          )}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Mark Absent</span>
                        </button>
                      </div>

                      {/* Reason input */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1">
                          Override Reason (logged to audit) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="e.g. Verified physically present in classroom, medical excuse"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 dark:text-zinc-100"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSessionId(null)}
                          disabled={savingOverride}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveOverride(session)}
                          loading={savingOverride}
                          className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          Save Override
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}
