// ============================================================
// lib/utils.ts — shared utility helpers
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Registration number normalisation ─────────────────────────
export function normalizeRegNo(raw: string): string {
  return raw.trim().replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
}

// ── Bluetooth address validation ──────────────────────────────
const BT_ADDRESS_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
export function isValidBluetoothAddress(addr: string): boolean {
  return BT_ADDRESS_RE.test(addr);
}

// ── IST date/time helpers ─────────────────────────────────────
export const TZ = 'Asia/Kolkata';

export function nowIST(): Date {
  return new Date();
}

export function toIST(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

export function formatIST(date: Date | string, fmt = 'dd MMM yyyy, HH:mm'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatTimeIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatDateIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d); // e.g. "27 Oct 2026"
}

export function formatTime12IST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d); // e.g. "9:00 AM"
}

export function formatDateTimeIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const datePart = formatDateIST(d);
  const timePart = formatTime12IST(d);
  return `${datePart}, ${timePart}`; // e.g. "27 Oct 2026, 8:11 PM"
}

/** Converts "09:00" or "09:00:00" or minutes to 12-hour format e.g. "9:00 AM" */
export function pgTimeTo12(t: string): string {
  if (!t) return '';
  const parts = t.split(':');
  if (parts.length < 2) return t;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Attendance Percentage & Color Tiers ─────────────────────
export type AttendanceTier = 'excellent' | 'good' | 'warning' | 'shortage';

export interface AttendanceRateInfo {
  tier: AttendanceTier;
  label: string;
  textClass: string;
  progressClass: string;
  badgeClass: string;
  colorHex: string;
}

/**
 * Evaluates attendance percentage based on user's exact 4-tier scale:
 * - >= 85%: Green (Excellent)
 * - 80% to 84%: Blue (Good Standing)
 * - 75% to 79%: Amber (Warning - near 75% threshold)
 * - < 75%: Red (Attendance Shortage)
 */
export function getAttendanceRateInfo(rate: number | null): AttendanceRateInfo {
  if (rate === null || isNaN(rate)) {
    return {
      tier: 'good',
      label: 'No Classes',
      textClass: 'text-slate-600 dark:text-zinc-400',
      progressClass: 'bg-slate-300 dark:bg-zinc-700',
      badgeClass:
        'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
      colorHex: '#64748B',
    };
  }

  if (rate >= 85) {
    return {
      tier: 'excellent',
      label: 'Excellent',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      progressClass: 'bg-emerald-500 dark:bg-emerald-400',
      badgeClass:
        'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
      colorHex: '#10B981',
    };
  }

  if (rate >= 80) {
    return {
      tier: 'good',
      label: 'Good (80–85%)',
      textClass: 'text-blue-600 dark:text-blue-400',
      progressClass: 'bg-blue-500 dark:bg-blue-400',
      badgeClass:
        'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80',
      colorHex: '#3B82F6',
    };
  }

  if (rate >= 75) {
    return {
      tier: 'warning',
      label: 'Watch (75–80%)',
      textClass: 'text-amber-600 dark:text-amber-400',
      progressClass: 'bg-amber-500 dark:bg-amber-400',
      badgeClass:
        'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
      colorHex: '#F59E0B',
    };
  }

  return {
    tier: 'shortage',
    label: 'Shortage (<75%)',
    textClass: 'text-rose-600 dark:text-rose-400',
    progressClass: 'bg-rose-500 dark:bg-rose-400',
    badgeClass:
      'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80',
    colorHex: '#EF4444',
  };
}

export function formatTimeRange12(start: string, end: string): string {
  const s = start.includes('T') ? formatTime12IST(start) : pgTimeTo12(start);
  const e = end.includes('T') ? formatTime12IST(end) : pgTimeTo12(end);
  return `${s} – ${e}`;
}

/** Returns "HH:MM" from a "HH:MM:SS" or "HH:MM" postgres time string */
export function pgTimeToHHMM(t: string): string {
  return t ? t.slice(0, 5) : '';
}

/** Minutes since midnight from a "HH:MM" string */
export function hhmmToMin(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "HH:MM" from minutes since midnight */
export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Misc ──────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Weekday number (1=Mon … 6=Sat) → label */
export function weekdayLabel(n: number): string {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][n - 1] ?? '';
}

// ── Time Period Resolution Helpers ───────────────────────────
export interface TimePeriodLike {
  id?: string;
  name?: string;
  subject?: string;
  start_at: string;
  end_at: string;
  status?: string;
}

/**
 * Finds the currently active period (if now is between start_at and end_at or running),
 * or the next upcoming scheduled period today. Never returns an ended past period.
 */
export function findActiveOrUpcomingPeriod<T extends TimePeriodLike>(
  periods: T[],
  now = new Date()
): T | null {
  if (!periods || periods.length === 0) return null;

  const nowMs = now.getTime();

  // 1. Prioritize any explicitly 'running' period
  const running = periods.find((p) => p.status === 'running');
  if (running) return running;

  // 2. Check for period currently in progress (start_at <= now <= end_at)
  const current = periods.find((p) => {
    const s = new Date(p.start_at).getTime();
    const e = new Date(p.end_at).getTime();
    return nowMs >= s && nowMs <= e;
  });
  if (current) return current;

  // 3. Find earliest upcoming scheduled period (start_at > now)
  const upcoming = periods
    .filter((p) => {
      const s = new Date(p.start_at).getTime();
      return s > nowMs && p.status !== 'finished' && p.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
  if (upcoming) return upcoming;

  return null;
}

/**
 * Evaluates whether a period is currently live, ended, or upcoming relative to current clock time.
 */
export function getPeriodTemporalState(
  startAt: string,
  endAt: string,
  status?: string,
  now = new Date()
): {
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  displayStatus: { label: string; variant: 'orange' | 'success' | 'neutral' | 'danger' };
} {
  const nowMs = now.getTime();
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();

  if (status === 'running') {
    return {
      isCurrent: true,
      isPast: false,
      isFuture: false,
      displayStatus: { label: 'Scanning Now', variant: 'orange' },
    };
  }

  if (status === 'finished') {
    return {
      isCurrent: false,
      isPast: true,
      isFuture: false,
      displayStatus: { label: 'Finished', variant: 'success' },
    };
  }

  if (status === 'cancelled') {
    return {
      isCurrent: false,
      isPast: true,
      isFuture: false,
      displayStatus: { label: 'Cancelled', variant: 'danger' },
    };
  }

  if (nowMs >= s && nowMs <= e) {
    return {
      isCurrent: true,
      isPast: false,
      isFuture: false,
      displayStatus: { label: 'Live Now', variant: 'orange' },
    };
  }

  if (nowMs > e) {
    return {
      isCurrent: false,
      isPast: true,
      isFuture: false,
      displayStatus: { label: 'Ended', variant: 'neutral' },
    };
  }

  return {
    isCurrent: false,
    isPast: false,
    isFuture: true,
    displayStatus: { label: 'Upcoming', variant: 'neutral' },
  };
}

/**
 * Safely computes the previous and next calendar day strings (YYYY-MM-DD)
 * for a given YYYY-MM-DD input, without timezone drift or DST skew.
 */
export function getAdjacentDates(dateStr: string): { prevDate: string; nextDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prevDate = new Date(Date.UTC(y, m - 1, d - 1))
    .toISOString()
    .split('T')[0];
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1))
    .toISOString()
    .split('T')[0];
  return { prevDate, nextDate };
}


