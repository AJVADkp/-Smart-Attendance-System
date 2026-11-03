// ============================================================
// lib/__tests__/planner.test.ts — unit tests for the planner
// Run with: npx tsx --test lib/__tests__/planner.test.ts
// ============================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runPlanner, splitWorstCase, minSecsForWindow, validatePeriodTimes } from '../planner';

describe('splitWorstCase', () => {
  it('65 students at 95% → 62 absent, 3 present', () => {
    const { absent, present } = splitWorstCase(65, 95);
    assert.strictEqual(absent, 62);
    assert.strictEqual(present, 3);
  });
  it('10 students at 95% → 10 absent, 0 present', () => {
    const { absent, present } = splitWorstCase(10, 95);
    assert.strictEqual(absent, 10);
    assert.strictEqual(present, 0);
  });
});

describe('minSecsForWindow', () => {
  it('3 present + 62 absent = 3×1 + 62×5.14×3 = 959.04 s', () => {
    const secs = minSecsForWindow(3, 62, 1, 5.14);
    assert.ok(Math.abs(secs - 959.04) < 0.01, `got ${secs}`);
  });
});

describe('runPlanner reference table', () => {
  const cases = [
    { windows: 1, bufferMin: 2, minPeriodMin: 20 },
    { windows: 2, bufferMin: 2, minPeriodMin: 36 },
    { windows: 3, bufferMin: 2, minPeriodMin: 52 },
    { windows: 4, bufferMin: 2, minPeriodMin: 68 },
    { windows: 1, bufferMin: 0, minPeriodMin: 16 },
    { windows: 2, bufferMin: 0, minPeriodMin: 32 },
    { windows: 3, bufferMin: 0, minPeriodMin: 48 },
    { windows: 4, bufferMin: 0, minPeriodMin: 64 },
  ];

  for (const { windows, bufferMin, minPeriodMin } of cases) {
    it(`${windows} window(s), ${bufferMin}min buffer → needs ${minPeriodMin}min`, () => {
      // At exactly the minimum, should be feasible
      const feasible = runPlanner({ rosterSize: 65, periodLengthMin: minPeriodMin, bufferMin, windows });
      assert.ok(feasible.feasible, `expected feasible at ${minPeriodMin}min, got usable=${feasible.usableMin}min, budgetPerWindow=${feasible.budgetPerWindowMin.toFixed(2)}min, need=${feasible.minTimePerWindowMin.toFixed(2)}min`);

      // One minute short → not feasible
      const notFeasible = runPlanner({ rosterSize: 65, periodLengthMin: minPeriodMin - 1, bufferMin, windows });
      assert.ok(!notFeasible.feasible, `expected NOT feasible at ${minPeriodMin - 1}min`);
    });
  }
});

describe('validatePeriodTimes', () => {
  it('rejects end <= start', () => {
    const r = validatePeriodTimes(60, 60, 2);
    assert.strictEqual(r.valid, false);
  });
  it('rejects zero usable time', () => {
    const r = validatePeriodTimes(60, 64, 2); // 4 min period, 2+2 buffer = 0 usable
    assert.strictEqual(r.valid, false);
  });
  it('accepts valid period', () => {
    const r = validatePeriodTimes(60, 120, 2); // 60 min, 56 usable
    assert.strictEqual(r.valid, true);
  });
});
