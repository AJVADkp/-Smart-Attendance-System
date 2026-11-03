// ============================================================
// lib/colors.ts — pure attendance colour calculation
// ============================================================

import type { AttendanceColor } from './constants';

export interface ColorInput {
  windowsRan: number;
  windowsPresent: number;
}

/**
 * Calculate attendance color from windows ran vs windows present.
 * Pure function — no I/O.
 *
 * Rules:
 *  - windowsRan === 0          → grey (no data)
 *  - windowsPresent === windowsRan → green
 *  - missed exactly 1          → yellow
 *  - missed 2+ but present ≥ 1 → orange
 *  - present in none           → red
 */
export function calcAttendanceColor(input: ColorInput): AttendanceColor {
  const { windowsRan, windowsPresent } = input;

  if (windowsRan === 0) return 'grey';
  if (windowsPresent === 0) return 'red';

  const missed = windowsRan - windowsPresent;

  if (missed === 0) return 'green';
  if (missed === 1) return 'yellow';
  return 'orange';
}

/**
 * Convert admin colour to the student-facing status label and fill colour.
 * Students NEVER see yellow or orange — both show as "Present (under review)".
 */
export function colorToStudentStatus(color: AttendanceColor): {
  label: string;
  fill: AttendanceColor;
} {
  switch (color) {
    case 'green':
      return { label: 'Present', fill: 'green' };
    case 'yellow':
    case 'orange':
      return { label: 'Present (under review)', fill: 'green' };
    case 'red':
      return { label: 'Absent', fill: 'red' };
    case 'grey':
    default:
      return { label: 'Pending', fill: 'grey' };
  }
}

/**
 * Return the final student-facing status after the review deadline has passed.
 * Yellow and orange default to present; red stays absent.
 */
export function finalizeColor(color: AttendanceColor): 'present' | 'absent' {
  return color === 'red' ? 'absent' : 'present';
}
