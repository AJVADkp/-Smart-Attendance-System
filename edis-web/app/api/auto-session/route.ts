import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TZ, findActiveOrUpcomingPeriod } from '@/lib/utils';

export async function GET() {
  const supabase = createServiceClient();
  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(now);
  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = dayMap[dayName] ?? 1;

  // 1. Fetch active students
  const { data: students } = await supabase
    .from('students')
    .select('id, name, reg_no')
    .eq('active', true)
    .order('reg_no_normalized');

  // 2. Fetch today's period runs
  let { data: periodRuns } = await supabase
    .from('period_runs')
    .select('id, name, subject, start_at, end_at, status, windows, buffer_min')
    .eq('date', todayISO)
    .order('start_at');

  // 3. If no runs yet today, automatically generate from weekly_timetable
  if (!periodRuns || periodRuns.length === 0) {
    const { data: entries } = await supabase
      .from('weekly_timetable')
      .select('*')
      .eq('weekday', weekday)
      .eq('active', true);

    if (entries && entries.length > 0) {
      const { count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('active', true);
      const dynamicRosterSize = studentCount && studentCount > 0 ? studentCount : 10;

      for (const entry of entries) {
        const startAt = new Date(`${todayISO}T${entry.start_time}+05:30`);
        const endAt = new Date(`${todayISO}T${entry.end_time}+05:30`);

        await supabase.from('period_runs').insert({
          date: todayISO,
          timetable_entry_id: entry.id,
          name: entry.period_name,
          subject: entry.subject,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          windows: entry.windows,
          buffer_min: entry.buffer_min,
          roster_size: dynamicRosterSize,
          saved_settings: {},
          planner_status: 'safe',
          status: 'scheduled',
          locked: false,
        });
      }

      // Re-fetch created runs
      const res = await supabase
        .from('period_runs')
        .select('id, name, subject, start_at, end_at, status, windows, buffer_min')
        .eq('date', todayISO)
        .order('start_at');
      periodRuns = res.data ?? [];
    }
  }

  // Find current running or next scheduled period based on current clock time
  const activePeriod = findActiveOrUpcomingPeriod(periodRuns || [], now);

  return NextResponse.json({
    todayISO,
    activePeriod,
    periodRuns: periodRuns ?? [],
    studentsCount: students?.length ?? 0,
    students: (students ?? []).map((s) => ({ id: s.id, name: s.name, regNo: s.reg_no })),
  });
}
