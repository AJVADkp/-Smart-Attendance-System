// ============================================================
// lib/planner.ts — pure feasibility-check functions (no I/O)
// ============================================================

import {
  SECS_PER_ABSENT_CHECK_DEFAULT,
  SECS_PER_PRESENT_REPLY_DEFAULT,
  WORST_CASE_ABSENCE_PCT_DEFAULT,
  MIN_CHECKS_PER_WINDOW,
} from './constants';

export interface PlannerParams {
  rosterSize: number;
  periodLengthMin: number; // total period length in minutes
  bufferMin: number;       // buffer on EACH end
  windows: number;
  secsPerAbsent?: number;
  secsPerPresent?: number;
  worstCasePct?: number;
}

export interface PlannerResult {
  feasible: boolean;
  usableMin: number;
  budgetPerWindowMin: number;
  minTimePerWindowMin: number;
  absent: number;
  present: number;
  maxWindowsThatFit: number;
  minPeriodLengthForWindowsMin: number;
  bufferSavingsMin: number;
}

/** Calculate worst-case absent/present split */
export function splitWorstCase(
  rosterSize: number,
  worstCasePct = WORST_CASE_ABSENCE_PCT_DEFAULT
): { absent: number; present: number } {
  const absent = Math.ceil((worstCasePct / 100) * rosterSize);
  const present = rosterSize - absent;
  return { absent, present };
}

/**
 * Minimum time (seconds) to run one window for the given present/absent counts.
 * Guarantees MIN_CHECKS_PER_WINDOW checks for every phone.
 */
export function minSecsForWindow(
  present: number,
  absent: number,
  secsPerPresent = SECS_PER_PRESENT_REPLY_DEFAULT,
  secsPerAbsent = SECS_PER_ABSENT_CHECK_DEFAULT
): number {
  // Present phones answer in round 1. Absent phones need MIN_CHECKS_PER_WINDOW checks each.
  return present * secsPerPresent + absent * secsPerAbsent * MIN_CHECKS_PER_WINDOW;
}

/**
 * Dynamically calculates the worst-case window duration adjusted to the exact number of students.
 * In the worst-case scenario (all students unconfirmed or absent), every student is probed
 * for MIN_CHECKS_PER_WINDOW rounds with a safety buffer.
 */
export function calculateWorstCaseWindowDuration(
  studentCount: number,
  secsPerAbsent = SECS_PER_ABSENT_CHECK_DEFAULT,
  minChecks = MIN_CHECKS_PER_WINDOW,
  safetyMarginSecs = 30
): {
  totalSeconds: number;
  totalMinutes: number;
  formatted: string;
  checksPerStudent: number;
  secsPerAbsent: number;
} {
  const count = Math.max(1, studentCount);
  const rawSecs = count * secsPerAbsent * minChecks;
  const totalSeconds = Math.ceil(rawSecs + safetyMarginSecs);
  const totalMinutes = Math.ceil(totalSeconds / 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return {
    totalSeconds,
    totalMinutes,
    formatted: m > 0 ? (s > 0 ? `${m}m ${s}s` : `${m}m`) : `${s}s`,
    checksPerStudent: minChecks,
    secsPerAbsent,
  };
}

/** Run the full planner check and return recommendations */
export function runPlanner(params: PlannerParams): PlannerResult {
  const {
    rosterSize,
    periodLengthMin,
    bufferMin,
    windows,
    secsPerAbsent = SECS_PER_ABSENT_CHECK_DEFAULT,
    secsPerPresent = SECS_PER_PRESENT_REPLY_DEFAULT,
    worstCasePct = WORST_CASE_ABSENCE_PCT_DEFAULT,
  } = params;

  const { absent, present } = splitWorstCase(rosterSize, worstCasePct);

  const usableMin = periodLengthMin - 2 * bufferMin;
  const budgetPerWindowMin = windows > 0 ? usableMin / windows : 0;
  const minSecsOneWindow = minSecsForWindow(present, absent, secsPerPresent, secsPerAbsent);
  const minTimePerWindowMin = minSecsOneWindow / 60;

  const feasible = minTimePerWindowMin <= budgetPerWindowMin && usableMin > 0;

  // Recommendation 1: max windows that fit
  let maxWindowsThatFit = 0;
  if (usableMin > 0) {
    for (let w = 1; w <= 20; w++) {
      const budget = usableMin / w;
      if (minTimePerWindowMin <= budget) {
        maxWindowsThatFit = w;
      } else {
        break;
      }
    }
  }

  // Recommendation 2: minimum period length for the chosen number of windows (with current buffer)
  const minUsableNeeded = minTimePerWindowMin * windows;
  const minPeriodLengthForWindowsMin = minUsableNeeded + 2 * bufferMin;

  // Recommendation 3: savings from reducing buffer to 0
  const bufferSavingsMin = 2 * bufferMin;

  return {
    feasible,
    usableMin,
    budgetPerWindowMin,
    minTimePerWindowMin,
    absent,
    present,
    maxWindowsThatFit,
    minPeriodLengthForWindowsMin,
    bufferSavingsMin,
  };
}

/** Validate that end is after start and buffer leaves usable time */
export function validatePeriodTimes(
  startMin: number, // minutes since midnight
  endMin: number,
  bufferMin: number
): { valid: boolean; error?: string } {
  if (endMin <= startMin) {
    return { valid: false, error: 'End time must be after start time.' };
  }
  const periodLen = endMin - startMin;
  if (periodLen <= 2 * bufferMin) {
    return {
      valid: false,
      error: `Buffer (${bufferMin} min each end) leaves no usable time. Shorten the buffer or lengthen the period.`,
    };
  }
  return { valid: true };
}

/** Convert "HH:MM" string to minutes since midnight */
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to "HH:MM" string */
export function minToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
