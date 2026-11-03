// ============================================================
// lib/windowEngine.ts — pure window/check algorithm (no I/O)
// ============================================================

import {
  MIN_CHECKS_PER_WINDOW,
  MAX_CHECKS_PER_WINDOW,
  EXTRA_ROUND_MARGIN_SECS,
  SECS_PER_ABSENT_CHECK_DEFAULT,
  SECS_PER_PRESENT_REPLY_DEFAULT,
} from './constants';
import { calculateWorstCaseWindowDuration } from './planner';

export interface StudentCheck {
  studentId: string;
  bluetoothAddress: string;
  checksUsed: number;
  present: boolean;
  notChecked: boolean;
}

export interface WindowPlan {
  windowNumber: number;
  scheduledStart: Date;
  hardStop: Date;
}

export interface EngineSettings {
  secsPerAbsent: number;
  secsPerPresent: number;
  hardStopGapSecs: number;
}

/**
 * Calculates window scheduled start times and hard stops within a period.
 * When rosterSize is provided, plans the final window near the end of the period
 * so the last attendance scan verifies student presence before the period concludes.
 */
export function planWindows(params: {
  periodStart: Date;
  periodEnd: Date;
  bufferMin: number;
  numWindows: number;
  hardStopGapSecs: number;
  rosterSize?: number;
  secsPerAbsent?: number;
}): WindowPlan[] {
  const {
    periodStart,
    periodEnd,
    bufferMin,
    numWindows,
    hardStopGapSecs,
    rosterSize,
    secsPerAbsent = 5.14,
  } = params;
  const bufferMs = bufferMin * 60 * 1000;
  const usableStart = new Date(periodStart.getTime() + bufferMs);
  const usableEnd = new Date(periodEnd.getTime() - bufferMs);
  const usableMs = usableEnd.getTime() - usableStart.getTime();

  if (numWindows <= 1) {
    return [{ windowNumber: 1, scheduledStart: usableStart, hardStop: usableEnd }];
  }

  // If rosterSize is provided, calculate the realistic window duration needed
  // Dynamically adjusted to the exact number of students (e.g. 9 students = ~2m 49s).
  // The final scan is scheduled right before the period ends.
  if (rosterSize && rosterSize > 0) {
    const worstCase = calculateWorstCaseWindowDuration(rosterSize, secsPerAbsent);
    const estimatedScanSecs = worstCase.totalSeconds;
    const estimatedScanMs = estimatedScanSecs * 1000;

    // Window 1 starts at usableStart
    // Final Window is scheduled so that it completes right at usableEnd
    const finalStart = new Date(
      Math.max(usableStart.getTime() + estimatedScanMs, usableEnd.getTime() - estimatedScanMs)
    );

    if (numWindows === 2) {
      return [
        {
          windowNumber: 1,
          scheduledStart: usableStart,
          hardStop: new Date(usableStart.getTime() + estimatedScanMs),
        },
        {
          windowNumber: 2,
          scheduledStart: finalStart,
          hardStop: usableEnd,
        },
      ];
    }

    // For 3+ windows: Window 1 at start, final window at finalStart, intermediate windows evenly spaced
    const intermediateSpan = finalStart.getTime() - usableStart.getTime();
    const intermediateStep = intermediateSpan / (numWindows - 1);

    return Array.from({ length: numWindows }, (_, i) => {
      if (i === 0) {
        return {
          windowNumber: 1,
          scheduledStart: usableStart,
          hardStop: new Date(usableStart.getTime() + estimatedScanMs),
        };
      }
      if (i === numWindows - 1) {
        return {
          windowNumber: numWindows,
          scheduledStart: finalStart,
          hardStop: usableEnd,
        };
      }
      const midStart = new Date(usableStart.getTime() + i * intermediateStep);
      return {
        windowNumber: i + 1,
        scheduledStart: midStart,
        hardStop: new Date(midStart.getTime() + estimatedScanMs),
      };
    });
  }

  // Default equal split when rosterSize is omitted (preserves standard planner tests)
  const slotMs = usableMs / numWindows;
  return Array.from({ length: numWindows }, (_, i) => {
    const start = new Date(usableStart.getTime() + i * slotMs);
    let hardStopTime: Date;
    if (i < numWindows - 1) {
      hardStopTime = new Date(usableStart.getTime() + (i + 1) * slotMs - hardStopGapSecs * 1000);
    } else {
      hardStopTime = usableEnd;
    }
    return { windowNumber: i + 1, scheduledStart: start, hardStop: hardStopTime };
  });
}

/**
 * Determines whether another check round should run.
 * @param unconfirmedCount number of phones not yet present
 * @param checksUsedSoFar minimum checks any unconfirmed phone has had
 * @param timeLeftMs time remaining in window
 * @param secsPerAbsent from settings
 */
export function shouldRunExtraRound(
  unconfirmedCount: number,
  checksUsedSoFar: number,
  timeLeftMs: number,
  secsPerAbsent: number = SECS_PER_ABSENT_CHECK_DEFAULT
): boolean {
  if (unconfirmedCount === 0) return false;
  if (checksUsedSoFar >= MAX_CHECKS_PER_WINDOW) return false;
  const neededMs = (unconfirmedCount * secsPerAbsent + EXTRA_ROUND_MARGIN_SECS) * 1000;
  return timeLeftMs >= neededMs;
}

/** Initialize student check state for a window */
export function initWindowState(students: Array<{ id: string; bluetoothAddress: string }>): StudentCheck[] {
  return students.map((s) => ({
    studentId: s.id,
    bluetoothAddress: s.bluetoothAddress,
    checksUsed: 0,
    present: false,
    notChecked: true,
  }));
}
