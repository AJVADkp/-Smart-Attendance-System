'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill, AttendanceColorType } from '@/components/ui/StatusPill';
import { formatDateIST, formatDateTimeIST } from '@/lib/utils';
import {
  CheckCircle2,
  FileQuestion,
  UserCheck,
  UserX,
  Edit3,
  Clock,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { overrideStudentAttendance, resolveProblemReport } from './actions';

interface AttendanceInfo {
  id?: string;
  period_run_id: string;
  student_id: string;
  color: string;
  final_status: string;
  windows_ran: number;
  windows_present: number;
  admin_override: boolean;
  override_reason: string | null;
}

interface ReportWithAttendance {
  id: string;
  student_id: string;
  period_run_id: string;
  message: string;
  status: string;
  resolved_note: string | null;
  created_at: string;
  students: { id: string; name: string; reg_no: string; phone_type?: string } | null;
  period_runs: { id: string; name: string; subject: string; date: string; windows?: number } | null;
  attendance: AttendanceInfo | null;
}

const REASON_PRESETS = [
  'Student verified present in classroom',
  'Hardware probe missed student phone',
  'Excused absence / Medical certificate',
  'Confirmed absent by faculty',
];

export function ReportsClient({
  reports,
  adminEmail,
}: {
  reports: ReportWithAttendance[];
  adminEmail: string;
}) {
  const [local, setLocal] = useState<ReportWithAttendance[]>(reports);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');

  // Simple Resolve Modal state
  const [resolveModal, setResolveModal] = useState<ReportWithAttendance | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [savingResolve, setSavingResolve] = useState(false);

  // Edit Attendance Modal state
  const [editAttModal, setEditAttModal] = useState<ReportWithAttendance | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'present' | 'absent'>('present');
  const [overrideReason, setOverrideReason] = useState('');
  const [resolveTogether, setResolveTogether] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [formError, setFormError] = useState('');

  // Notification banner
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Open Edit Attendance Modal
  function handleOpenEditAttendance(r: ReportWithAttendance) {
    setEditAttModal(r);
    // Suggest present if current status is absent/unmarked, or absent if current is present
    const isCurrentlyPresent = r.attendance?.color === 'green' || r.attendance?.final_status === 'present';
    setSelectedStatus(isCurrentlyPresent ? 'absent' : 'present');
    setOverrideReason('Student verified present in classroom');
    setResolveTogether(r.status === 'open');
    setFormError('');
  }

  // Submit Attendance Override
  async function handleSaveAttendance() {
    if (!editAttModal) return;
    if (!overrideReason.trim()) {
      setFormError('Please enter an override reason for the audit trail.');
      return;
    }

    setSavingAttendance(true);
    setFormError('');

    try {
      const res = await overrideStudentAttendance({
        periodRunId: editAttModal.period_run_id,
        studentId: editAttModal.student_id,
        status: selectedStatus,
        reason: overrideReason.trim(),
        problemReportId: editAttModal.id,
        resolveReport: resolveTogether,
      });

      // Update local state immediately
      setLocal((prev) =>
        prev.map((item) => {
          if (item.id === editAttModal.id) {
            const updatedAttendance: AttendanceInfo = {
              id: res.resultId,
              period_run_id: editAttModal.period_run_id,
              student_id: editAttModal.student_id,
              color: res.color,
              final_status: res.finalStatus,
              windows_ran: res.windowsRan,
              windows_present: res.windowsPresent,
              admin_override: true,
              override_reason: res.overrideReason,
            };

            return {
              ...item,
              status: resolveTogether ? 'resolved' : item.status,
              resolved_note: resolveTogether
                ? `Attendance updated to ${selectedStatus === 'present' ? 'Present' : 'Absent'} by admin. Reason: ${overrideReason.trim()}`
                : item.resolved_note,
              attendance: updatedAttendance,
            };
          }
          return item;
        })
      );

      setBannerMsg({
        type: 'success',
        text: `Attendance for ${editAttModal.students?.name} updated to ${selectedStatus.toUpperCase()}. Change logged to audit trail.`,
      });
      setTimeout(() => setBannerMsg(null), 6000);
      setEditAttModal(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update attendance');
    } finally {
      setSavingAttendance(false);
    }
  }

  // Submit Quick Resolve
  async function handleResolveOnly() {
    if (!resolveModal) return;
    setSavingResolve(true);
    try {
      const note = resolveNote.trim() || 'Inquiry resolved by administrator';
      await resolveProblemReport(resolveModal.id, note);

      setLocal((prev) =>
        prev.map((r) =>
          r.id === resolveModal.id
            ? { ...r, status: 'resolved', resolved_note: note }
            : r
        )
      );

      setBannerMsg({
        type: 'success',
        text: 'Report marked as resolved.',
      });
      setTimeout(() => setBannerMsg(null), 5000);
      setResolveModal(null);
      setResolveNote('');
    } catch (err: any) {
      setBannerMsg({
        type: 'error',
        text: err.message || 'Failed to resolve report',
      });
    } finally {
      setSavingResolve(false);
    }
  }

  const openCount = local.filter((r) => r.status === 'open').length;
  const resolvedCount = local.filter((r) => r.status === 'resolved').length;
  const filtered = local.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Problem Reports"
        subtitle="Review student discrepancy reports, update attendance records, and record resolutions"
      />

      {/* Global alert banner */}
      {bannerMsg && (
        <div
          className={cn(
            'p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in',
            bannerMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60'
          )}
        >
          <div className="flex items-center gap-2">
            {bannerMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 cursor-pointer text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs self-start w-fit text-xs transition-colors">
        <button
          type="button"
          onClick={() => setFilter('open')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5',
            filter === 'open'
              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-800/60 shadow-2xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
          )}
        >
          <span>Open</span>
          <span className="px-1.5 py-0.2 rounded-full bg-orange-600 text-white text-[10px] font-bold">
            {openCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('resolved')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5',
            filter === 'resolved'
              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-800/60 shadow-2xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
          )}
        >
          <span>Resolved</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-semibold">
            {resolvedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer',
            filter === 'all'
              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-800/60 shadow-2xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
          )}
        >
          All ({local.length})
        </button>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileQuestion className="w-6 h-6" />}
            title={
              filter === 'open'
                ? 'No open problem reports'
                : 'No reports match this filter'
            }
            description="Students can report discrepancies directly from their attendance lookup view. When submitted, you can view and edit attendance here."
          />
        ) : (
          filtered.map((r) => {
            const isOpen = r.status === 'open';
            const dateStr = r.period_runs?.date ? formatDateIST(r.period_runs.date) : '';
            const createdTime = formatDateTimeIST(r.created_at);

            const att = r.attendance;
            const attColor: AttendanceColorType = (att?.color as AttendanceColorType) ?? 'grey';
            const attStatusLabel =
              att?.color === 'green'
                ? 'Present'
                : att?.color === 'red'
                ? 'Absent'
                : att?.color === 'yellow' || att?.color === 'orange'
                ? 'Under Review'
                : 'Unmarked';

            return (
              <div
                key={r.id}
                className={cn(
                  'bg-white dark:bg-zinc-900 rounded-2xl border p-5 shadow-2xs transition-all space-y-4',
                  isOpen
                    ? 'border-orange-200/90 dark:border-orange-800/60 shadow-sm'
                    : 'border-slate-200/80 dark:border-zinc-800 opacity-85'
                )}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge variant={isOpen ? 'orange' : 'success'}>
                      {isOpen ? 'Open Inquiry' : 'Resolved'}
                    </Badge>
                    <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                      {r.students?.name}
                    </span>
                    <span className="font-mono text-xs text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200/60 dark:border-orange-800/60">
                      {r.students?.reg_no}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                      — {r.period_runs?.subject || r.period_runs?.name} on {dateStr}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400 dark:text-zinc-500">
                    {createdTime}
                  </span>
                </div>

                {/* Current Attendance Status Card */}
                <div className="p-3 bg-slate-50/80 dark:bg-zinc-800/80 rounded-xl border border-slate-200/80 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-slate-600 dark:text-zinc-300">Current Attendance:</span>
                    <StatusPill
                      color={attColor}
                      label={attStatusLabel}
                      size="sm"
                    />
                    {att && (
                      <span className="text-slate-500 dark:text-zinc-400 font-mono">
                        ({att.windows_present}/{att.windows_ran} windows detected)
                      </span>
                    )}
                    {att?.admin_override && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold">
                        Admin Overridden: {att.override_reason}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Student ID: {r.student_id?.slice(0, 8)}…
                  </span>
                </div>

                {/* Student Quoted Message */}
                <div className="p-3.5 bg-orange-50/40 dark:bg-orange-950/20 rounded-xl border border-orange-200/60 dark:border-orange-800/40 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed relative">
                  <span className="font-semibold text-orange-800 dark:text-orange-400 block text-[11px] uppercase tracking-wider mb-1">
                    Student Inquiry:
                  </span>
                  <p className="italic font-medium">"{r.message}"</p>
                </div>

                {/* Resolution Note if resolved */}
                {r.resolved_note && (
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Resolution Note: </strong>
                      <span>{r.resolved_note}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenEditAttendance(r)}
                    className="shadow-glow-orange cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Attendance</span>
                  </Button>

                  {isOpen && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResolveModal(r);
                        setResolveNote('');
                      }}
                      className="cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                      <span>Resolve Inquiry</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Student Attendance Modal */}
      {editAttModal && (
        <Modal
          open={true}
          onClose={() => setEditAttModal(null)}
          title="Edit Student Attendance"
          size="lg"
        >
          <div className="space-y-5">
            {/* Context Summary Banner */}
            <div className="p-4 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-200/80 dark:border-orange-800/60 space-y-2 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base">
                    {editAttModal.students?.name}
                  </span>
                  <span className="font-mono text-xs text-orange-600 dark:text-orange-400 font-bold ml-2">
                    ({editAttModal.students?.reg_no})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-zinc-400 text-xs">Current:</span>
                  <StatusPill
                    color={(editAttModal.attendance?.color as AttendanceColorType) ?? 'grey'}
                    label={
                      editAttModal.attendance?.color === 'green'
                        ? 'Present'
                        : editAttModal.attendance?.color === 'red'
                        ? 'Absent'
                        : editAttModal.attendance?.color === 'yellow' || editAttModal.attendance?.color === 'orange'
                        ? 'Under Review'
                        : 'Unmarked'
                    }
                    size="sm"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-zinc-300 flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <strong>Subject:</strong> {editAttModal.period_runs?.subject || editAttModal.period_runs?.name}
                </span>
                <span>
                  <strong>Date:</strong> {formatDateIST(editAttModal.period_runs?.date || '')}
                </span>
              </div>

              <div className="pt-2 border-t border-orange-200/60 dark:border-orange-800/60 text-xs text-slate-700 dark:text-zinc-300 italic">
                <strong>Student reported: </strong>"{editAttModal.message}"
              </div>
            </div>

            {/* Error banner if any */}
            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Attendance Status Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider mb-2">
                Select New Attendance Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Present Card */}
                <button
                  type="button"
                  onClick={() => setSelectedStatus('present')}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3',
                    selectedStatus === 'present'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 shadow-xs'
                      : 'border-slate-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-zinc-800'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                      selectedStatus === 'present'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">Mark as Present</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">Student was in class</div>
                  </div>
                </button>

                {/* Absent Card */}
                <button
                  type="button"
                  onClick={() => setSelectedStatus('absent')}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-3',
                    selectedStatus === 'absent'
                      ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 shadow-xs'
                      : 'border-slate-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-700 bg-white dark:bg-zinc-800'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                      selectedStatus === 'absent'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                    )}
                  >
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">Mark as Absent</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">Student was not in class</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Reason Presets */}
            <div>
              <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
                Quick reason templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOverrideReason(preset)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-zinc-800 hover:bg-orange-100 dark:hover:bg-zinc-700 hover:text-orange-800 dark:hover:text-orange-400 text-slate-700 dark:text-zinc-300 transition-colors border border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Reason Input */}
            <div>
              <Input
                label="Override Reason (Recorded in immutable Audit Log)"
                placeholder="e.g. Student verified present in classroom by faculty; phone Bluetooth was toggled off"
                value={overrideReason}
                onChange={(e) => {
                  setOverrideReason(e.target.value);
                  if (formError) setFormError('');
                }}
                required
              />
            </div>

            {/* Checkbox: Resolve together */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center gap-3">
              <input
                id="resolve-together-cb"
                type="checkbox"
                checked={resolveTogether}
                onChange={(e) => setResolveTogether(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-zinc-600 cursor-pointer"
              />
              <label
                htmlFor="resolve-together-cb"
                className="text-xs text-slate-700 dark:text-zinc-200 font-medium cursor-pointer select-none"
              >
                Mark this problem report as <strong>Resolved</strong> with the update note
              </label>
            </div>

            {/* Audit Trail Note */}
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All manual overrides are cryptographically logged with your admin identity ({adminEmail})
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditAttModal(null)}
                disabled={savingAttendance}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                loading={savingAttendance}
                onClick={handleSaveAttendance}
                className="shadow-glow-orange font-semibold"
              >
                Confirm & Apply Attendance Change
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Resolve Modal (Resolve without attendance change) */}
      {resolveModal && (
        <Modal
          open={true}
          onClose={() => setResolveModal(null)}
          title="Resolve Problem Report"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-200/80 dark:border-orange-800/60 text-xs">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 block mb-1">
                Student Message:
              </span>
              <p className="text-slate-600 dark:text-zinc-300 italic">"{resolveModal.message}"</p>
            </div>

            <Input
              label="Resolution Note (optional)"
              placeholder="e.g. Reviewed probe records with student; confirmed attendance status was correct"
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              autoFocus
            />

            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResolveModal(null)}
                disabled={savingResolve}
              >
                Cancel
              </Button>
              <Button size="sm" loading={savingResolve} onClick={handleResolveOnly}>
                Mark as Resolved
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
