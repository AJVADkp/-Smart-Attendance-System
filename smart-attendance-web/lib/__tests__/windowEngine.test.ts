// ============================================================
// lib/__tests__/windowEngine.test.ts
// ============================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { planWindows, shouldRunExtraRound } from '../windowEngine';
import { getAdjacentDates } from '../utils';

describe('planWindows', () => {
  it('3 windows in a 60-min period with 2min buffer', () => {
    const start = new Date('2024-01-15T09:00:00Z');
    const end = new Date('2024-01-15T10:00:00Z');
    const plans = planWindows({ periodStart: start, periodEnd: end, bufferMin: 2, numWindows: 3, hardStopGapSecs: 10 });
    assert.strictEqual(plans.length, 3);
    assert.strictEqual(plans[0].windowNumber, 1);
    assert.strictEqual(plans[2].windowNumber, 3);
    // First window starts after 2-min buffer
    assert.strictEqual(plans[0].scheduledStart.toISOString(), '2024-01-15T09:02:00.000Z');
    // Last window hard stop is at end minus buffer
    assert.strictEqual(plans[2].hardStop.toISOString(), '2024-01-15T09:58:00.000Z');
  });

  it('1 window — scheduled start after buffer, hard stop at end minus buffer', () => {
    const start = new Date('2024-01-15T10:00:00Z');
    const end = new Date('2024-01-15T11:00:00Z');
    const [plan] = planWindows({ periodStart: start, periodEnd: end, bufferMin: 0, numWindows: 1, hardStopGapSecs: 10 });
    assert.strictEqual(plan.scheduledStart.getTime(), start.getTime());
    assert.strictEqual(plan.hardStop.getTime(), end.getTime());
  });

  it('2 windows with 9 students anchors final window right before period ends', () => {
    const start = new Date('2024-01-15T10:10:00Z');
    const end = new Date('2024-01-15T11:00:00Z');
    const plans = planWindows({
      periodStart: start,
      periodEnd: end,
      bufferMin: 1,
      numWindows: 2,
      hardStopGapSecs: 10,
      rosterSize: 9,
      secsPerAbsent: 5.14,
    });
    assert.strictEqual(plans.length, 2);
    // Window 1 starts at 10:11 (usableStart after 1m buffer)
    assert.strictEqual(plans[0].scheduledStart.toISOString(), '2024-01-15T10:11:00.000Z');
    // Window 2 starts 169s (2m 49s) before 10:59 (usableEnd) -> 10:56:11
    assert.strictEqual(plans[1].scheduledStart.toISOString(), '2024-01-15T10:56:11.000Z');
    assert.strictEqual(plans[1].hardStop.toISOString(), '2024-01-15T10:59:00.000Z');
  });
});

describe('shouldRunExtraRound', () => {
  it('returns false when no unconfirmed phones', () => {
    assert.strictEqual(shouldRunExtraRound(0, 3, 30000, 5.14), false);
  });
  it('returns false when max checks reached', () => {
    assert.strictEqual(shouldRunExtraRound(5, 5, 60000, 5.14), false);
  });
  it('returns false when not enough time', () => {
    // Need 5 × 5.14 + 2 = 27.7s, only have 10s
    assert.strictEqual(shouldRunExtraRound(5, 3, 10000, 5.14), false);
  });
  it('returns true when enough time', () => {
    // Need 5 × 5.14 + 2 = 27.7s, have 30s
    assert.strictEqual(shouldRunExtraRound(5, 3, 30000, 5.14), true);
  });
});

describe('getAdjacentDates — single day navigation without timezone drift', () => {
  it('moves back and forward by exactly 1 calendar day', () => {
    const { prevDate, nextDate } = getAdjacentDates('2026-10-30');
    assert.strictEqual(prevDate, '2026-10-29');
    assert.strictEqual(nextDate, '2026-10-31');
  });

  it('handles month start and end boundaries cleanly', () => {
    const start = getAdjacentDates('2026-11-01');
    assert.strictEqual(start.prevDate, '2026-10-31');
    assert.strictEqual(start.nextDate, '2026-11-02');

    const end = getAdjacentDates('2026-10-31');
    assert.strictEqual(end.prevDate, '2026-10-30');
    assert.strictEqual(end.nextDate, '2026-11-01');
  });

  it('handles year boundary rollover', () => {
    const { prevDate, nextDate } = getAdjacentDates('2026-01-01');
    assert.strictEqual(prevDate, '2025-12-31');
    assert.strictEqual(nextDate, '2026-01-02');
  });

  it('handles leap year leap day correctly', () => {
    const { prevDate, nextDate } = getAdjacentDates('2024-03-01');
    assert.strictEqual(prevDate, '2024-02-29');
    assert.strictEqual(nextDate, '2024-03-02');
  });
});
