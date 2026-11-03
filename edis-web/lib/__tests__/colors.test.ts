// ============================================================
// lib/__tests__/colors.test.ts — unit tests for color rules
// ============================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calcAttendanceColor, colorToStudentStatus } from '../colors';

describe('calcAttendanceColor', () => {
  it('0 windows ran → grey', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 0, windowsPresent: 0 }), 'grey'));
  it('3/3 present → green', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 3, windowsPresent: 3 }), 'green'));
  it('2/3 present → yellow', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 3, windowsPresent: 2 }), 'yellow'));
  it('1/3 present → orange', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 3, windowsPresent: 1 }), 'orange'));
  it('0/3 present → red', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 3, windowsPresent: 0 }), 'red'));
  it('2/2 present → green', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 2, windowsPresent: 2 }), 'green'));
  it('1/2 present → yellow', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 2, windowsPresent: 1 }), 'yellow'));
  it('1/1 present → green', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 1, windowsPresent: 1 }), 'green'));
  it('0/1 present → red', () => assert.strictEqual(calcAttendanceColor({ windowsRan: 1, windowsPresent: 0 }), 'red'));
});

describe('colorToStudentStatus — students never see yellow/orange', () => {
  it('green → Present', () => assert.strictEqual(colorToStudentStatus('green').label, 'Present'));
  it('yellow → Present (under review)', () => assert.strictEqual(colorToStudentStatus('yellow').label, 'Present (under review)'));
  it('orange → Present (under review)', () => assert.strictEqual(colorToStudentStatus('orange').label, 'Present (under review)'));
  it('red → Absent', () => assert.strictEqual(colorToStudentStatus('red').label, 'Absent'));
  it('yellow fill → green', () => assert.strictEqual(colorToStudentStatus('yellow').fill, 'green'));
  it('orange fill → green', () => assert.strictEqual(colorToStudentStatus('orange').fill, 'green'));
});
