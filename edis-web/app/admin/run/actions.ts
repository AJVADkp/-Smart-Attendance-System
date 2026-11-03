'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Creates period_runs for today from the weekly timetable.
 * Call this once per day (e.g., via cron or manually from admin).
 */
export async function createTodayPeriodRuns() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date());
  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = dayMap[dayName] ?? 1;
  const dateStr = todayISO;

  // Get timetable entries for today
  const { data: entries } = await supabase
    .from('weekly_timetable')
    .select('*')
    .eq('weekday', weekday)
    .eq('active', true);

  if (!entries?.length) return { created: 0, date: dateStr };

  // Get class settings and active student count
  const [settingsRes, studentsRes] = await Promise.all([
    supabase.from('class_settings').select('*').single(),
    supabase.from('students').select('id', { count: 'exact' }).eq('active', true),
  ]);
  const settings = settingsRes.data;
  const activeCount = studentsRes.count ?? 0;
  const rosterSize = activeCount > 0 ? activeCount : (settings?.roster_limit ?? 20);

  // Check for day changes
  const { data: dayChanges } = await supabase
    .from('day_changes')
    .select('*')
    .eq('date', dateStr);

  // Get existing period runs for today to avoid duplicates
  const { data: existing } = await supabase
    .from('period_runs')
    .select('timetable_entry_id')
    .eq('date', dateStr);
  const existingIds = new Set(existing?.map((r) => r.timetable_entry_id));

  let created = 0;
  for (const entry of entries) {
    if (existingIds.has(entry.id)) continue;

    // Check if cancelled via day change
    const change = dayChanges?.find((dc) => dc.timetable_entry_id === entry.id);
    if (change?.action === 'cancel') continue;

    const startTime = change?.new_start ?? entry.start_time;
    const endTime = change?.new_end ?? entry.end_time;
    const windows = change?.new_windows ?? entry.windows;
    const bufferMin = change?.new_buffer_min ?? entry.buffer_min;

    const startAt = new Date(`${dateStr}T${startTime}+05:30`);
    const endAt = new Date(`${dateStr}T${endTime}+05:30`);

    await supabase.from('period_runs').insert({
      date: dateStr,
      timetable_entry_id: entry.id,
      name: entry.period_name,
      subject: entry.subject,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      windows,
      buffer_min: bufferMin,
      roster_size: rosterSize,
      saved_settings: settings ?? {},
      planner_status: 'safe',
      status: 'scheduled',
      locked: false,
    });
    created++;
  }

  // Also create any added periods from day changes
  const addedPeriods = dayChanges?.filter((dc) => dc.action === 'add') ?? [];
  for (const added of addedPeriods) {
    if (!added.new_start || !added.new_end) continue;
    const startAt = new Date(`${dateStr}T${added.new_start}+05:30`);
    const endAt = new Date(`${dateStr}T${added.new_end}+05:30`);
    await supabase.from('period_runs').insert({
      date: dateStr,
      timetable_entry_id: null,
      name: 'Extra Period',
      subject: 'Extra',
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      windows: added.new_windows ?? 1,
      buffer_min: added.new_buffer_min ?? 0,
      roster_size: rosterSize,
      saved_settings: settings ?? {},
      planner_status: 'safe',
      status: 'scheduled',
      locked: false,
    });
    created++;
  }

  revalidatePath('/admin/run');
  revalidatePath('/admin/calendar');
  return { created, date: dateStr };
}
