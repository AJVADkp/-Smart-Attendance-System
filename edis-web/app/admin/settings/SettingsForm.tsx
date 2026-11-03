'use client';
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { runPlanner } from '@/lib/planner';
import { hhmmToMin } from '@/lib/utils';
import { RotateCcw, CheckCircle2, Shield, Users, Clock, Sliders, KeyRound, Lock, Mail, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { saveClassSettings, updateAdminCredentials } from './actions';

interface Settings {
  id?: string;
  class_name: string;
  roster_limit: number;
  default_buffer_min: number;
  worst_case_absence_pct: number;
  secs_per_absent_check: number;
  secs_per_present_reply: number;
  review_deadline_time: string;
}

interface TimetableItem {
  id: string;
  name: string;
  subject: string;
  start_time: string;
  end_time: string;
  windows: number;
  buffer_min: number;
}

export function SettingsForm({
  settings,
  timetableEntries = [],
  currentUserEmail = 'admin@school.edu',
}: {
  settings: Settings | null;
  timetableEntries?: TimetableItem[];
  currentUserEmail?: string;
}) {
  const [formData, setFormData] = useState<Settings>({
    class_name: settings?.class_name ?? '',
    roster_limit: settings?.roster_limit ?? 65,
    default_buffer_min: settings?.default_buffer_min ?? 2,
    worst_case_absence_pct: settings?.worst_case_absence_pct ?? 95,
    secs_per_absent_check: settings?.secs_per_absent_check ?? 5.14,
    secs_per_present_reply: settings?.secs_per_present_reply ?? 1.0,
    review_deadline_time: settings?.review_deadline_time ? settings.review_deadline_time.slice(0, 5) : '00:00',
  });

  const [initialData, setInitialData] = useState<Settings>(formData);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [infeasibleEntries, setInfeasibleEntries] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Administrator Credentials State
  const [currentEmail, setCurrentEmail] = useState(currentUserEmail);
  const [newEmail, setNewEmail] = useState(currentUserEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [credUpdating, setCredUpdating] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');
  const [credConfirmOpen, setCredConfirmOpen] = useState(false);

  function handleRequestCredUpdate(e: React.FormEvent) {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!currentPassword.trim()) {
      setCredError('Please enter your current password to authorize credentials changes.');
      return;
    }

    const trimmedNewEmail = newEmail.trim().toLowerCase();
    const hasEmailChange = Boolean(trimmedNewEmail && trimmedNewEmail !== currentEmail.toLowerCase());
    const hasPasswordChange = Boolean(newPassword.trim());

    if (!hasEmailChange && !hasPasswordChange) {
      setCredError('No changes detected. Please specify a new email or new password.');
      return;
    }

    if (hasEmailChange) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedNewEmail)) {
        setCredError('Please enter a valid email address.');
        return;
      }
    }

    if (hasPasswordChange) {
      if (newPassword.length < 8) {
        setCredError('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setCredError('New password and confirmation do not match.');
        return;
      }
    }

    // Open confirmation dialog
    setCredConfirmOpen(true);
  }

  async function executeCredUpdate() {
    setCredUpdating(true);
    setCredError('');
    try {
      const trimmedNewEmail = newEmail.trim().toLowerCase();
      const res = await updateAdminCredentials({
        currentPassword,
        newEmail: trimmedNewEmail !== currentEmail.toLowerCase() ? trimmedNewEmail : undefined,
        newPassword: newPassword.trim() || undefined,
      });

      if (res.error) {
        setCredError(res.error);
        setCredConfirmOpen(false);
        setCredUpdating(false);
        return;
      }

      setCredSuccess('Credentials updated successfully! Logging you out to re-authenticate...');
      setCredConfirmOpen(false);

      setTimeout(() => {
        window.location.href = '/admin/login?updated=true';
      }, 1200);
    } catch (err: any) {
      setCredError(err.message || 'An unexpected error occurred while updating credentials.');
      setCredConfirmOpen(false);
      setCredUpdating(false);
    }
  }

  useEffect(() => {
    const dirty = JSON.stringify(formData) !== JSON.stringify(initialData);
    setIsDirty(dirty);
    if (dirty) setSaved(false);
  }, [formData, initialData]);

  function handleChange(field: keyof Settings, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleDiscard() {
    setFormData(initialData);
    setIsDirty(false);
    setError('');
  }

  async function executeSave() {
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, String(v)));
      await saveClassSettings(fd);
      setInitialData(formData);
      setIsDirty(false);
      setSaved(true);
      setConfirmOpen(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check if new settings cause existing timetable entries to become infeasible
    const broken: string[] = [];
    timetableEntries.forEach((te) => {
      const startMin = hhmmToMin(te.start_time.slice(0, 5));
      const endMin = hhmmToMin(te.end_time.slice(0, 5));
      const durationMin = endMin - startMin;
      if (durationMin > 0) {
        const plan = runPlanner({
          periodLengthMin: durationMin,
          windows: te.windows,
          bufferMin: te.buffer_min ?? formData.default_buffer_min,
          rosterSize: Number(formData.roster_limit),
          worstCasePct: Number(formData.worst_case_absence_pct),
          secsPerAbsent: Number(formData.secs_per_absent_check),
          secsPerPresent: Number(formData.secs_per_present_reply),
        });
        if (!plan.feasible) {
          broken.push(
            `${te.name} (${te.subject}): needs ${Math.ceil(plan.minPeriodLengthForWindowsMin)} min`
          );
        }
      }
    });

    if (broken.length > 0) {
      setInfeasibleEntries(broken);
      setConfirmOpen(true);
    } else {
      executeSave();
    }
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6 pb-24">
        {saved && (
          <Banner variant="success">
            Settings saved successfully. All changes are active and logged to the audit trail.
          </Banner>
        )}

        {error && <Banner variant="error">{error}</Banner>}

        {/* 1. Class */}
        <Card
          title="Class Information"
          description="Identification and classroom enrollment capacity"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Class Name"
                value={formData.class_name}
                onChange={(e) => handleChange('class_name', e.target.value)}
                required
                placeholder="e.g. CS 3rd Year - Expo Demo"
                hint="Displayed in student portal headers and admin overview"
              />
            </div>
            <Input
              label="Roster Limit"
              type="number"
              min={1}
              value={formData.roster_limit}
              onChange={(e) => handleChange('roster_limit', Number(e.target.value))}
              required
              hint="Maximum class enrollment capacity"
            />
          </div>
        </Card>

        {/* 2. Planner and Timing */}
        <Card
          title="Planner and Timing"
          description="Hardware latency measurements and timing physics"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Buffer (minutes)"
              type="number"
              min={0}
              max={15}
              value={formData.default_buffer_min}
              onChange={(e) => handleChange('default_buffer_min', Number(e.target.value))}
              required
              hint="Settling buffer before first window and after last window"
            />
            <Input
              label="Worst-Case Absence (%)"
              type="number"
              min={50}
              max={100}
              value={formData.worst_case_absence_pct}
              onChange={(e) =>
                handleChange('worst_case_absence_pct', Number(e.target.value))
              }
              required
              hint="Benchmark assumption (default 95% = 62 absent / 3 present)"
            />

            <div>
              <Input
                label="Seconds per Absent Check"
                type="number"
                step="0.01"
                min={1}
                max={15}
                value={formData.secs_per_absent_check}
                onChange={(e) =>
                  handleChange('secs_per_absent_check', Number(e.target.value))
                }
                required
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B7280] dark:text-zinc-400">
                <span>Measured value: 5.14 s</span>
                <button
                  type="button"
                  onClick={() => handleChange('secs_per_absent_check', 5.14)}
                  className="text-[#EA580C] dark:text-orange-400 hover:underline font-medium cursor-pointer"
                >
                  Reset to measured value
                </button>
              </div>
            </div>

            <div>
              <Input
                label="Seconds per Present Reply"
                type="number"
                step="0.01"
                min={0.1}
                max={5}
                value={formData.secs_per_present_reply}
                onChange={(e) =>
                  handleChange('secs_per_present_reply', Number(e.target.value))
                }
                required
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B7280] dark:text-zinc-400">
                <span>Measured value: 1.0 s</span>
                <button
                  type="button"
                  onClick={() => handleChange('secs_per_present_reply', 1.0)}
                  className="text-[#EA580C] dark:text-orange-400 hover:underline font-medium cursor-pointer"
                >
                  Reset to measured value
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Review */}
        <Card
          title="Attendance Review"
          description="Daily automated lockdown rules"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Review Deadline Time (IST)"
                type="time"
                value={formData.review_deadline_time}
                onChange={(e) => handleChange('review_deadline_time', e.target.value)}
                required
                hint="Default is 00:00 (midnight IST). Unreviewed warnings auto-resolve to Present."
              />
            </div>
          </div>
        </Card>

        {/* Permanent Form Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-[#6B7280] dark:text-zinc-400">
            {isDirty ? 'You have unsaved changes.' : 'All settings are up to date.'}
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleDiscard}
                disabled={saving}
                className="flex-1 sm:flex-initial"
              >
                Discard Changes
              </Button>
            )}
            <Button
              type="submit"
              size="md"
              loading={saving}
              disabled={!isDirty || saving}
              className="flex-1 sm:flex-initial shadow-edis"
            >
              Save Settings
            </Button>
          </div>
        </div>

        {/* Sticky Save Bar (appears when changes are made) */}
        {isDirty && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-[#FED7AA] dark:border-zinc-800 shadow-edis-lg py-3 px-4 animate-in slide-in-from-bottom-4 duration-200 transition-colors">
            <div className="max-w-[760px] mx-auto flex items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-medium text-[#EA580C] flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse shrink-0" />
                <span className="truncate">Unsaved changes</span>
                <span className="hidden sm:inline">detected</span>
              </span>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button type="submit" size="sm" loading={saving}>
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* 4. Administrator Credentials & Security */}
      <div className="mt-8">
        <Card
          title="Administrator Credentials"
          description="Manage your login username (email) and access password"
        >
          {/* Prominent Warning Banner */}
          <div className="mb-5 p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <div className="font-bold text-amber-950 dark:text-amber-100">Security Notice & Warning</div>
              <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                Updating your administrator username or password will immediately invalidate your
                current session. You will be logged out and required to sign in again using your new credentials.
              </p>
            </div>
          </div>

          {credError && (
            <Banner variant="error" className="mb-4">
              {credError}
            </Banner>
          )}

          {credSuccess && (
            <Banner variant="success" className="mb-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{credSuccess}</span>
              </span>
            </Banner>
          )}

          <form onSubmit={handleRequestCredUpdate} className="space-y-4">
            {/* Username / Email Field */}
            <div>
              <Input
                label="Administrator Username / Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@school.edu"
                required
                icon={<Mail className="w-4 h-4 text-[#6B7280] dark:text-zinc-400" />}
                hint={`Current login username: ${currentEmail}`}
              />
            </div>

            {/* Current Password Field (Required for authorization) */}
            <div className="relative">
              <Input
                label="Current Password *"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password to authorize changes"
                required
                icon={<Lock className="w-4 h-4 text-[#6B7280] dark:text-zinc-400" />}
                hint="Required to verify your identity before any changes are applied"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3.5 top-8 text-[#6B7280] hover:text-[#1F2937] dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* New Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  hint="At least 8 characters (optional)"
                  icon={<KeyRound className="w-4 h-4 text-[#6B7280] dark:text-zinc-400" />}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-8 text-[#6B7280] hover:text-[#1F2937] dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  hint="Must match new password above"
                  icon={<KeyRound className="w-4 h-4 text-[#6B7280] dark:text-zinc-400" />}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-8 text-[#6B7280] hover:text-[#1F2937] dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                loading={credUpdating}
                disabled={credUpdating}
                className="w-full sm:w-auto shadow-edis"
              >
                <Lock className="w-4 h-4 mr-1.5" />
                <span>Update Credentials</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Confirmation Dialog when timetable entries become infeasible */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeSave}
        isDestructive={true}
        title="Feasibility Warning"
        confirmLabel="Save anyway"
        cancelLabel="Review changes"
        loading={saving}
        description={
          <div className="space-y-3">
            <p>
              The updated roster limit or timing constants will cause{' '}
              <strong>{infeasibleEntries.length} scheduled period(s)</strong> to exceed their
              available time budget:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-[#B91C1C] dark:text-rose-400">
              {infeasibleEntries.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
            <p className="text-xs text-[#6B7280] dark:text-zinc-400">
              You can adjust their checking windows or durations in the timetable.
            </p>
          </div>
        }
      />

      {/* Confirmation Dialog for Credentials Change */}
      <ConfirmDialog
        open={credConfirmOpen}
        onClose={() => !credUpdating && setCredConfirmOpen(false)}
        onConfirm={executeCredUpdate}
        isDestructive={true}
        title="Confirm Credentials Update"
        confirmLabel={credUpdating ? 'Updating...' : 'Yes, Update & Sign Out'}
        cancelLabel="Cancel"
        loading={credUpdating}
        description={
          <div className="space-y-3">
            <p className="text-slate-800 dark:text-zinc-100 font-medium">
              Are you sure you want to update your administrator credentials?
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-semibold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Immediate Session Invalidation</span>
              </div>
              <p>
                You will be immediately signed out of this browser session. You must sign in using your updated credentials.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 rounded-xl p-3 space-y-1 text-xs">
              <div className="text-slate-500 dark:text-zinc-400 font-medium mb-1">Changes to be applied:</div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-zinc-700">
                <span className="text-slate-600 dark:text-zinc-400">Username / Email:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                  {newEmail.trim().toLowerCase() !== currentEmail.toLowerCase()
                    ? newEmail.trim().toLowerCase()
                    : `${currentEmail} (Unchanged)`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600 dark:text-zinc-400">Password:</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">
                  {newPassword.trim() ? 'Updated to new password' : 'Keep current password'}
                </span>
              </div>
            </div>
          </div>
        }
      />
    </>
  );
}
