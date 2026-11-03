import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getAttendanceRateInfo } from '../utils';

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

  describe('4-Tier Attendance Percentage & Color System', () => {
    it('returns green (excellent) for rates >= 85%', () => {
      const r100 = getAttendanceRateInfo(100);
      assert.strictEqual(r100.tier, 'excellent');
      assert.ok(r100.textClass.includes('emerald'));
      assert.ok(r100.progressClass.includes('emerald'));

      const r85 = getAttendanceRateInfo(85);
      assert.strictEqual(r85.tier, 'excellent');
      assert.ok(r85.textClass.includes('emerald'));
    });

    it('returns blue (good) for rates 80% to 84%', () => {
      const r84 = getAttendanceRateInfo(84);
      assert.strictEqual(r84.tier, 'good');
      assert.ok(r84.textClass.includes('blue'));
      assert.ok(r84.progressClass.includes('blue'));

      const r80 = getAttendanceRateInfo(80);
      assert.strictEqual(r80.tier, 'good');
      assert.ok(r80.textClass.includes('blue'));
    });

    it('returns amber (warning) for rates 75% to 79%', () => {
      const r79 = getAttendanceRateInfo(79);
      assert.strictEqual(r79.tier, 'warning');
      assert.ok(r79.textClass.includes('amber'));
      assert.ok(r79.progressClass.includes('amber'));

      const r75 = getAttendanceRateInfo(75);
      assert.strictEqual(r75.tier, 'warning');
      assert.ok(r75.textClass.includes('amber'));
    });

    it('returns red (shortage) for rates under 75%', () => {
      const r74 = getAttendanceRateInfo(74);
      assert.strictEqual(r74.tier, 'shortage');
      assert.ok(r74.textClass.includes('rose'));
      assert.ok(r74.progressClass.includes('rose'));

      const r0 = getAttendanceRateInfo(0);
      assert.strictEqual(r0.tier, 'shortage');
      assert.ok(r0.textClass.includes('rose'));
    });

    it('handles null / NaN gracefully with neutral styling', () => {
      const rNull = getAttendanceRateInfo(null);
      assert.strictEqual(rNull.label, 'No Classes');
      assert.ok(rNull.textClass.includes('slate') || rNull.textClass.includes('zinc'));

      const rNaN = getAttendanceRateInfo(NaN);
      assert.strictEqual(rNaN.label, 'No Classes');
    });
  });

  describe('Subject-wise Attendance Breakdown Calculation', () => {
    it('groups attendance correctly by subject with attended, absent, and percentage', () => {
      const sessions = [
        { subject: 'Data Structures', color: 'green', finalStatus: 'present' },
        { subject: 'Data Structures', color: 'green', finalStatus: 'present' },
        { subject: 'Data Structures', color: 'red', finalStatus: 'absent' },
        { subject: 'Algorithms', color: 'green', finalStatus: 'present' },
        { subject: 'Algorithms', color: 'green', finalStatus: 'present' },
      ];

      const map = new Map<string, { subject: string; attended: number; absent: number; total: number; rate: number | null }>();
      sessions.forEach((r) => {
        const subj = r.subject || 'General';
        if (!map.has(subj)) {
          map.set(subj, { subject: subj, attended: 0, absent: 0, total: 0, rate: null });
        }
        const entry = map.get(subj)!;
        const isPresent = (r.color === 'green' || r.finalStatus === 'present') && r.finalStatus !== 'under_review';
        const isAbsent = r.color === 'red' || r.finalStatus === 'absent';
        if (isPresent) entry.attended++;
        if (isAbsent) entry.absent++;
        entry.total = entry.attended + entry.absent;
        entry.rate = entry.total > 0 ? Math.round((entry.attended / entry.total) * 100) : null;
      });

      const ds = map.get('Data Structures')!;
      assert.strictEqual(ds.attended, 2);
      assert.strictEqual(ds.absent, 1);
      assert.strictEqual(ds.total, 3);
      assert.strictEqual(ds.rate, 67); // 2/3 = 67%

      const algo = map.get('Algorithms')!;
      assert.strictEqual(algo.attended, 2);
      assert.strictEqual(algo.absent, 0);
      assert.strictEqual(algo.total, 2);
      assert.strictEqual(algo.rate, 100);
    });
  });
});
