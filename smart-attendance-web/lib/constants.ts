// ============================================================
// lib/constants.ts  — single source of truth for all constants
// ============================================================

// ── ESP32 / Serial ──────────────────────────────────────────
export const SERIAL_BAUD_RATE = Number(process.env.NEXT_PUBLIC_SERIAL_BAUD_RATE ?? 115200);

/** Keys expected in the ESP32 JSON reply */
export const ESP32_REPLY_KEYS = {
  event: 'event',
  mac: 'mac',
  present: 'present',
  status: 'status',
  ms: 'ms',
  tries: 'tries',
  name: 'name',
} as const;

/** Timeout (ms) to wait for one serial reply before treating as no-reply */
export const SERIAL_REPLY_TIMEOUT_MS = 6500; // slightly above worst-case 5.14 s

// ── Planner ──────────────────────────────────────────────────
/** Seconds the ESP32 takes for a phone that is ABSENT */
export const SECS_PER_ABSENT_CHECK_DEFAULT = 5.14;
/** Seconds the ESP32 takes for a phone that is PRESENT */
export const SECS_PER_PRESENT_REPLY_DEFAULT = 1;
/** Worst-case absence percentage (0–100) */
export const WORST_CASE_ABSENCE_PCT_DEFAULT = 95;
/** Default buffer on each side of a period, in minutes */
export const DEFAULT_BUFFER_MIN = 2;
/** Maximum students in the roster */
export const ROSTER_LIMIT_DEFAULT = 65;
/** Guaranteed minimum number of checks per phone per window */
export const MIN_CHECKS_PER_WINDOW = 3;
/** Maximum number of checks per phone per window */
export const MAX_CHECKS_PER_WINDOW = 5;

// ── Window engine ────────────────────────────────────────────
/** Seconds of margin when deciding whether to run an extra round */
export const EXTRA_ROUND_MARGIN_SECS = 2;
/** Hard-stop gap before next window starts (seconds) */
export const HARD_STOP_GAP_SECS = 10;

// ── Review deadline ──────────────────────────────────────────
/** Midnight (00:00 IST) — results lock after this */
export const REVIEW_DEADLINE_TIME_DEFAULT = '00:00:00';

// ── Colours ──────────────────────────────────────────────────
export const ATTENDANCE_COLORS = {
  green: '#16A34A',
  yellow: '#EAB308',
  orange: '#C2410C',
  red: '#DC2626',
  grey: '#9CA3AF',
} as const;

export type AttendanceColor = keyof typeof ATTENDANCE_COLORS;

// ── Design system ────────────────────────────────────────────
export const BRAND = {
  orange: '#F97316',
  deepOrange: '#EA580C',
  softTint: '#FFF7ED',
  borderTint: '#FED7AA',
  white: '#FFFFFF',
  charcoal: '#1F2937',
  secondaryText: '#6B7280',
} as const;

// ── Time zone ────────────────────────────────────────────────
export const TZ = 'Asia/Kolkata';

// ── Rate limiting ────────────────────────────────────────────
export const STUDENT_LOOKUP_MAX_REQUESTS = 10;
export const STUDENT_LOOKUP_WINDOW_MS = 60_000; // per minute
