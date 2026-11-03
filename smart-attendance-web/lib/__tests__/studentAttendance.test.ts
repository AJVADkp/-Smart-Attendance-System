import { describe, it } from 'node:test';
import assert from 'node:assert';

interface AttendanceRecord {
  date: string;
  startAt: string;
  color: string;
  finalStatus: string;
}

function calculateAttendanceMetrics(records: AttendanceRecord[]) {
  const attendedCount = records.filter(
    (r) => (r.color === 'green' || r.finalStatus === 'present') && r.finalStatus !== 'under_review'
  ).length;

  const absentCount = records.filter(
    (r) => r.color === 'red' || r.finalStatus === 'absent'
  ).length;

  const completedTotal = attendedCount + absentCount;
  const attendanceRate =
    completedTotal > 0 ? Math.round((attendedCount / completedTotal) * 100) : 100;

  return { attendedCount, absentCount, completedTotal, attendanceRate };
}

function sortAttendanceRecords<T extends { date: string; startAt: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const dDiff = b.date.localeCompare(a.date);
    if (dDiff !== 0) return dDiff;
    const tA = a.startAt ? new Date(a.startAt).getTime() : 0;
    const tB = b.startAt ? new Date(b.startAt).getTime() : 0;
    return tB - tA;
  });
}

describe('Student Attendance Directory & Drawer Calculations', () => {
  it('correctly calculates 100% attendance rate when all completed are present', () => {
    const records: AttendanceRecord[] = [
      { date: '2026-10-30', startAt: '2026-10-30T07:20:00Z', color: 'green', finalStatus: 'present' },
      { date: '2026-10-30', startAt: '2026-10-30T05:40:00Z', color: 'green', finalStatus: 'present' },
      { date: '2026-10-28', startAt: '2026-10-28T05:40:00Z', color: 'green', finalStatus: 'present' },
    ];
    const metrics = calculateAttendanceMetrics(records);
    assert.strictEqual(metrics.attendedCount, 3);
    assert.strictEqual(metrics.absentCount, 0);
    assert.strictEqual(metrics.attendanceRate, 100);
  });

  it('correctly calculates 75% rate when 3 present and 1 absent', () => {
    const records: AttendanceRecord[] = [
      { date: '2026-10-28', startAt: '2026-10-28T03:00:00Z', color: 'green', finalStatus: 'present' },
      { date: '2026-10-28', startAt: '2026-10-28T03:50:00Z', color: 'green', finalStatus: 'present' },
      { date: '2026-10-28', startAt: '2026-10-28T04:40:00Z', color: 'red', finalStatus: 'absent' },
      { date: '2026-10-28', startAt: '2026-10-28T05:40:00Z', color: 'green', finalStatus: 'present' },
    ];
    const metrics = calculateAttendanceMetrics(records);
    assert.strictEqual(metrics.attendedCount, 3);
    assert.strictEqual(metrics.absentCount, 1);
    assert.strictEqual(metrics.completedTotal, 4);
    assert.strictEqual(metrics.attendanceRate, 75);
  });

  it('sorts sessions chronologically with newest date and period first', () => {
    const records = [
      { date: '2026-10-28', startAt: '2026-10-28T03:00:00Z', name: 'P1' },
      { date: '2026-10-30', startAt: '2026-10-30T07:20:00Z', name: 'P5' },
      { date: '2026-10-28', startAt: '2026-10-28T05:40:00Z', name: 'P4' },
      { date: '2026-10-30', startAt: '2026-10-30T05:40:00Z', name: 'P4' },
    ];

    const sorted = sortAttendanceRecords(records);
    assert.strictEqual(sorted[0].name, 'P5');
    assert.strictEqual(sorted[0].date, '2026-10-30');
    assert.strictEqual(sorted[1].name, 'P4');
    assert.strictEqual(sorted[1].date, '2026-10-30');
    assert.strictEqual(sorted[2].name, 'P4');
    assert.strictEqual(sorted[2].date, '2026-10-28');
    assert.strictEqual(sorted[3].name, 'P1');
    assert.strictEqual(sorted[3].date, '2026-10-28');
  });

  it('formats audit log reasons with day, subject name, and period automatically', () => {
    function formatAttendanceAuditReason({
      date,
      subject,
      periodName,
      studentName,
      studentReg,
      reason,
    }: {
      date: string;
      subject: string;
      periodName: string;
      studentName: string;
      studentReg: string;
      reason: string;
    }) {
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const formattedDay = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(dateObj);

      return `Day: ${formattedDay} (${date}) | Subject: ${subject} | Period: ${periodName} | Student: ${studentName} (${studentReg}) | Reason: ${reason.trim()}`;
    }

    const formatted = formatAttendanceAuditReason({
      date: '2026-10-30',
      subject: 'Strategic Communication & Documentation in Engineering (Theory)',
      periodName: 'Period 5',
      studentName: 'AJVAD KP',
      studentReg: 'CCE25CS031',
      reason: 'Verified physically present in classroom',
    });

    assert.ok(formatted.includes('Day: Friday, 30 Oct 2026 (2026-10-30)'));
    assert.ok(formatted.includes('Subject: Strategic Communication & Documentation in Engineering (Theory)'));
    assert.ok(formatted.includes('Period: Period 5'));
    assert.ok(formatted.includes('Student: AJVAD KP (CCE25CS031)'));
    assert.ok(formatted.includes('Reason: Verified physically present in classroom'));
  });
});
