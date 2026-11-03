'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Banner } from '@/components/ui/Banner';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { saveTimetableEntry, deleteTimetableEntry } from './actions';
import { runPlanner, validatePeriodTimes, timeToMin } from '@/lib/planner';
import { pgTimeToHHMM, formatTimeRange12, minToHHMM } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = [
  { num: 1, label: 'Monday' },
  { num: 2, label: 'Tuesday' },
  { num: 3, label: 'Wednesday' },
  { num: 4, label: 'Thursday' },
  { num: 5, label: 'Friday' },
  { num: 6, label: 'Saturday' },
];

interface Entry {
  id: string;
  weekday: number;
  period_name: string;
  subject: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  windows: number;
  buffer_min: number;
  planner_override?: boolean;
}

interface Settings {
  roster_limit: number;
  default_buffer_min: number;
  worst_case_absence_pct: number;
  secs_per_absent_check: number;
  secs_per_present_reply: number;
}

function EntryModal({
  entry,
  defaultWeekday,
  settings,
  existingEntries,
  rosterSize,
  onClose,
}: {
  entry?: Entry | null;
  defaultWeekday?: number;
  settings: Settings | null;
  existingEntries: Entry[];
  rosterSize: number;
  onClose: () => void;
}) {
  const [weekday, setWeekday] = useState(entry?.weekday ?? defaultWeekday ?? 1);
  const [periodName, setPeriodName] = useState(entry?.period_name ?? '');
  const [subject, setSubject] = useState(entry?.subject ?? '');
  const [teacher, setTeacher] = useState(entry?.teacher_name ?? '');
  const [startTime, setStartTime] = useState(entry ? pgTimeToHHMM(entry.start_time) : '09:00');
  const [endTime, setEndTime] = useState(entry ? pgTimeToHHMM(entry.end_time) : '10:00');
  const [windows, setWindows] = useState(entry?.windows ?? 3);
  const [bufferMin, setBufferMin] = useState(
    entry?.buffer_min ?? (settings?.default_buffer_min ?? 2)
  );

  const [overrideChecked, setOverrideChecked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Time calculations & planner feedback
  const startMin = timeToMin(startTime);
  const endMin = timeToMin(endTime);
  const durationMin = endMin - startMin;
  const isTimeOrderValid = durationMin > 0;

  // Check overlap with existing periods on same day
  const overlapEntry = existingEntries.find((e) => {
    if (e.id === entry?.id) return false;
    if (e.weekday !== weekday) return false;
    const eStart = timeToMin(pgTimeToHHMM(e.start_time));
    const eEnd = timeToMin(pgTimeToHHMM(e.end_time));
    return Math.max(startMin, eStart) < Math.min(endMin, eEnd);
  });

  const planner = isTimeOrderValid
    ? runPlanner({
        rosterSize,
        periodLengthMin: durationMin,
        bufferMin,
        windows,
        secsPerAbsent: settings?.secs_per_absent_check ?? 5.14,
        secsPerPresent: settings?.secs_per_present_reply ?? 1,
        worstCasePct: settings?.worst_case_absence_pct ?? 95,
      })
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isTimeOrderValid) {
      setError('End time must be later than start time.');
      return;
    }

    if (overlapEntry) {
      setError(
        `This period overlaps with existing period "${overlapEntry.period_name}" (${overlapEntry.subject}) on ${WEEKDAYS.find((w) => w.num === weekday)?.label}.`
      );
      return;
    }

    if (planner && !planner.feasible && !overrideChecked) {
      setError('Please review suggestions or confirm the feasibility risk checkbox below.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.set('weekday', String(weekday));
      fd.set('period_name', periodName.trim());
      fd.set('subject', subject.trim());
      fd.set('teacher_name', teacher.trim());
      fd.set('start_time', startTime);
      fd.set('end_time', endTime);
      fd.set('windows', String(windows));
      fd.set('buffer_min', String(bufferMin));
      fd.set('override_confirmed', String(overrideChecked));

      await saveTimetableEntry(fd, entry?.id);
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save timetable entry.');
    } finally {
      setLoading(false);
    }
  }

  // Suggestion helpers
  function applyWindowsSuggestion() {
    if (planner && planner.maxWindowsThatFit >= 1) {
      setWindows(planner.maxWindowsThatFit);
    }
  }

  function applyLengthSuggestion() {
    if (planner && planner.minPeriodLengthForWindowsMin > 0) {
      const newEnd = startMin + Math.ceil(planner.minPeriodLengthForWindowsMin);
      setEndTime(minToHHMM(newEnd));
    }
  }

  function applyBufferSuggestion() {
    setBufferMin(0);
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={entry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Banner variant="error">{error}</Banner>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Select
              label="Day of Week"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              required
            >
              {WEEKDAYS.map((w) => (
                <option key={w.num} value={w.num}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Period Name"
            value={periodName}
            onChange={(e) => setPeriodName(e.target.value)}
            required
            placeholder="e.g. Period 1"
          />

          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="e.g. Data Structures"
          />

          <div className="sm:col-span-2">
            <Input
              label="Teacher Name"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="e.g. Dr. Rao"
              hint="Optional instructor name"
            />
          </div>

          <Input
            label="Start Time (12-hour)"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />

          <Input
            label="End Time (12-hour)"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />

          <Input
            label="Checking Windows"
            type="number"
            min={1}
            max={8}
            value={windows}
            onChange={(e) => setWindows(Number(e.target.value))}
            required
            hint="Number of detection probes (1 to 4 typical)"
          />

          <Input
            label="Buffer (min on each end)"
            type="number"
            min={0}
            max={15}
            value={bufferMin}
            onChange={(e) => setBufferMin(Number(e.target.value))}
            required
            hint="Settling time before start & after end"
          />
        </div>

        {/* Live Planner Feasibility Panel */}
        {planner && (
          <div className="pt-2">
            {planner.feasible ? (
              <div className="p-3.5 bg-[#FFF7ED] dark:bg-orange-950/40 rounded-[10px] border border-[#FED7AA] dark:border-orange-800/60 flex items-start gap-2.5 text-xs text-[#9A3412] dark:text-orange-200">
                <CheckCircle2 className="w-4 h-4 text-[#EA580C] dark:text-orange-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Safe:</strong> {planner.budgetPerWindowMin.toFixed(1)} min per window available, {planner.minTimePerWindowMin.toFixed(1)} min needed
                </span>
              </div>
            ) : (
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-[10px] border border-[#B91C1C] dark:border-rose-700/80 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-[#B91C1C] dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 text-[#B91C1C] dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">
                      Not feasible in worst case (budget {planner.budgetPerWindowMin.toFixed(1)} min &lt; needed {planner.minTimePerWindowMin.toFixed(1)} min)
                    </span>
                    <span className="text-slate-500 dark:text-zinc-400 block mt-0.5">
                      Class cohort of {rosterSize} active students cannot be reliably probed {windows} times in {durationMin} min.
                    </span>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="pt-2 border-t border-red-100 dark:border-rose-950/80 flex flex-wrap gap-2 text-xs">
                  <span className="text-xs text-[#6B7280] dark:text-zinc-400 py-1 font-medium">Apply suggestion:</span>
                  {planner.maxWindowsThatFit >= 1 && (
                    <button
                      type="button"
                      onClick={applyWindowsSuggestion}
                      className="px-2.5 py-1 bg-red-50 dark:bg-rose-950/50 text-[#B91C1C] dark:text-rose-300 border border-red-200 dark:border-rose-800/60 rounded-[6px] hover:bg-red-100 dark:hover:bg-rose-900/50 font-medium cursor-pointer"
                    >
                      Use {planner.maxWindowsThatFit} window{planner.maxWindowsThatFit > 1 ? 's' : ''}
                    </button>
                  )}
                  {planner.minPeriodLengthForWindowsMin > durationMin && (
                    <button
                      type="button"
                      onClick={applyLengthSuggestion}
                      className="px-2.5 py-1 bg-red-50 dark:bg-rose-950/50 text-[#B91C1C] dark:text-rose-300 border border-red-200 dark:border-rose-800/60 rounded-[6px] hover:bg-red-100 dark:hover:bg-rose-900/50 font-medium cursor-pointer"
                    >
                      Lengthen to {Math.ceil(planner.minPeriodLengthForWindowsMin)} min
                    </button>
                  )}
                  {bufferMin > 0 && (
                    <button
                      type="button"
                      onClick={applyBufferSuggestion}
                      className="px-2.5 py-1 bg-red-50 dark:bg-rose-950/50 text-[#B91C1C] dark:text-rose-300 border border-red-200 dark:border-rose-800/60 rounded-[6px] hover:bg-red-100 dark:hover:bg-rose-900/50 font-medium cursor-pointer"
                    >
                      Reduce buffer to 0 min
                    </button>
                  )}
                </div>

                {/* Risk Override Checkbox */}
                <div className="pt-2 border-t border-red-100 dark:border-rose-950/80 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="override-risk"
                    checked={overrideChecked}
                    onChange={(e) => setOverrideChecked(e.target.checked)}
                    className="mt-0.5 rounded border-red-300 dark:border-rose-700 text-[#B91C1C] focus:ring-[#B91C1C] cursor-pointer"
                  />
                  <label htmlFor="override-risk" className="text-xs text-[#1F2937] dark:text-zinc-200 cursor-pointer select-none">
                    I understand the risk and want to save this period despite the timing warning.
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2.5 justify-end pt-3 border-t border-[#FED7AA] dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={Boolean(planner && !planner.feasible && !overrideChecked)}
          >
            {entry ? 'Save Changes' : 'Add Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function TimetableClient({
  entries,
  settings,
  activeStudentCount = 0,
}: {
  entries: Entry[];
  settings: Settings | null;
  activeStudentCount?: number;
}) {
  const effectiveRoster =
    activeStudentCount > 0 ? activeStudentCount : (settings?.roster_limit ?? 65);
  const [modalEntry, setModalEntry] = useState<Entry | null | undefined>(undefined);
  const [defaultDay, setDefaultDay] = useState<number>(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteTimetableEntry(deleteId);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  function openAddModal(weekdayNum: number) {
    setDefaultDay(weekdayNum);
    setModalEntry(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        subtitle={`Weekly Monday to Saturday class schedule • Feasibility calibrated for ${effectiveRoster} enrolled students`}
        action={
          <Button onClick={() => openAddModal(1)}>
            <Plus className="w-4 h-4" />
            <span>Add entry</span>
          </Button>
        }
      />

      {/* 6 Day Cards: Monday to Saturday */}
      <div className="space-y-4">
        {WEEKDAYS.map((day) => {
          const dayEntries = entries
            .filter((e) => e.weekday === day.num)
            .sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time));

          return (
            <Card
              key={day.num}
              title={
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold text-[#1F2937] dark:text-zinc-100">
                    {day.label}
                  </span>
                  <span className="text-xs font-normal text-[#6B7280] dark:text-zinc-400">
                    ({dayEntries.length} {dayEntries.length === 1 ? 'period' : 'periods'})
                  </span>
                </div>
              }
              action={
                <button
                  type="button"
                  onClick={() => openAddModal(day.num)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#EA580C] hover:text-[#C2410C] dark:hover:text-orange-400 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add period</span>
                </button>
              }
              className="overflow-hidden"
            >
              {dayEntries.length === 0 ? (
                <div className="py-4 text-xs text-[#6B7280] dark:text-zinc-400 italic flex items-center justify-between">
                  <span>No periods scheduled for {day.label}.</span>
                  <button
                    type="button"
                    onClick={() => openAddModal(day.num)}
                    className="text-xs text-[#EA580C] font-medium hover:underline not-italic cursor-pointer"
                  >
                    + Add first period
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (>= 768px) */}
                  <div className="hidden md:block overflow-x-auto -mx-5 -my-5">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#FFF7ED]/50 dark:bg-zinc-800/80 border-b border-[#FED7AA]/50 dark:border-zinc-700 text-[#6B7280] dark:text-zinc-400">
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                            Period
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                            Subject
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                            Teacher
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                            Time (12-hour)
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                            Windows
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                            Buffer
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">
                            Planner
                          </th>
                          <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider text-[11px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#FED7AA]/30 dark:divide-zinc-800">
                        {dayEntries.map((e) => {
                          const timeRange = formatTimeRange12(e.start_time, e.end_time);
                          const startM = timeToMin(e.start_time);
                          const endM = timeToMin(e.end_time);
                          const dur = endM - startM;
                          const plan =
                            dur > 0
                              ? runPlanner({
                                  rosterSize: effectiveRoster,
                                  periodLengthMin: dur,
                                  bufferMin: e.buffer_min,
                                  windows: e.windows,
                                  secsPerAbsent: settings?.secs_per_absent_check ?? 5.14,
                                  secsPerPresent: settings?.secs_per_present_reply ?? 1,
                                  worstCasePct: settings?.worst_case_absence_pct ?? 95,
                                })
                              : null;

                          return (
                            <tr key={e.id} className="hover:bg-[#FFF7ED]/30 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="px-5 py-3.5 font-semibold text-[#1F2937] dark:text-zinc-100">
                                {e.period_name}
                              </td>
                              <td className="px-5 py-3.5 font-medium text-[#1F2937] dark:text-zinc-100">
                                {e.subject}
                              </td>
                              <td className="px-5 py-3.5 text-[#6B7280] dark:text-zinc-400">
                                {e.teacher_name || '—'}
                              </td>
                              <td className="px-5 py-3.5 text-[#1F2937] dark:text-zinc-100 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-[#EA580C] dark:text-orange-400" />
                                  <span>{timeRange}</span>
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-[#1F2937] dark:text-zinc-100">{e.windows}</td>
                              <td className="px-5 py-3.5 text-[#6B7280] dark:text-zinc-400">{e.buffer_min}m</td>
                              <td className="px-5 py-3.5">
                                {plan?.feasible ? (
                                  <Badge variant="success">Safe</Badge>
                                ) : (
                                  <Badge variant="warning" icon={<AlertTriangle className="w-3 h-3 text-[#A16207] dark:text-yellow-400" />}>
                                    Overridden
                                  </Badge>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setModalEntry(e)}
                                    title="Edit period"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#EA580C] dark:text-orange-400" />
                                    <span>Edit</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteId(e.id)}
                                    title="Delete period"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-[#B91C1C] dark:text-rose-400" />
                                    <span className="text-[#B91C1C] dark:text-rose-400">Delete</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Cards (< 768px) */}
                  <div className="md:hidden space-y-3">
                    {dayEntries.map((e) => {
                      const timeRange = formatTimeRange12(e.start_time, e.end_time);
                      const startM = timeToMin(e.start_time);
                      const endM = timeToMin(e.end_time);
                      const dur = endM - startM;
                      const plan =
                        dur > 0
                          ? runPlanner({
                              rosterSize: effectiveRoster,
                              periodLengthMin: dur,
                              bufferMin: e.buffer_min,
                              windows: e.windows,
                              secsPerAbsent: settings?.secs_per_absent_check ?? 5.14,
                              secsPerPresent: settings?.secs_per_present_reply ?? 1,
                              worstCasePct: settings?.worst_case_absence_pct ?? 95,
                            })
                          : null;

                      return (
                        <div
                          key={e.id}
                          className="p-3.5 rounded-[10px] bg-[#FFF7ED]/50 dark:bg-zinc-800/60 border border-[#FED7AA]/60 dark:border-zinc-700 space-y-2.5 text-xs transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-sm text-[#1F2937] dark:text-zinc-100">
                                {e.period_name}: {e.subject}
                              </div>
                              {e.teacher_name && (
                                <div className="text-xs text-[#6B7280] dark:text-zinc-400 mt-0.5">
                                  {e.teacher_name}
                                </div>
                              )}
                            </div>
                            {plan?.feasible ? (
                              <Badge variant="success">Safe</Badge>
                            ) : (
                              <Badge variant="warning" icon={<AlertTriangle className="w-3 h-3 text-[#A16207] dark:text-yellow-400" />}>
                                Overridden
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[#6B7280] dark:text-zinc-400 pt-2 border-t border-[#FED7AA]/40 dark:border-zinc-700/60">
                            <span className="inline-flex items-center gap-1 font-medium text-[#1F2937] dark:text-zinc-100">
                              <Clock className="w-3.5 h-3.5 text-[#EA580C] dark:text-orange-400" />
                              <span>{timeRange}</span>
                            </span>
                            <span>{e.windows} windows ({e.buffer_min}m buffer)</span>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#FED7AA]/40 dark:border-zinc-700/60">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setModalEntry(e)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="danger-outline"
                              onClick={() => setDeleteId(e.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Entry Modal */}
      {modalEntry !== undefined && (
        <EntryModal
          entry={modalEntry}
          defaultWeekday={defaultDay}
          settings={settings}
          existingEntries={entries}
          rosterSize={effectiveRoster}
          onClose={() => setModalEntry(undefined)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Timetable Period"
        description="Are you sure you want to remove this recurring period from the weekly schedule? Future period runs will not be scheduled."
        confirmLabel="Delete Period"
        isDestructive={true}
        loading={deleting}
      />
    </div>
  );
}
