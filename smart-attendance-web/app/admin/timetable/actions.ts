'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { runPlanner, validatePeriodTimes, timeToMin } from '@/lib/planner';

export async function saveTimetableEntry(formData: FormData, id?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const weekday = Number(formData.get('weekday'));
  const start_time = String(formData.get('start_time'));
  const end_time = String(formData.get('end_time'));
  const windows = Number(formData.get('windows'));
  const buffer_min = Number(formData.get('buffer_min'));

  const timesOk = validatePeriodTimes(timeToMin(start_time), timeToMin(end_time), buffer_min);
  if (!timesOk.valid) throw new Error(timesOk.error);

  const [settingsRes, studentsRes] = await Promise.all([
    supabase.from('class_settings').select('*').single(),
    supabase.from('students').select('id', { count: 'exact' }).eq('active', true),
  ]);
  const settings = settingsRes.data;
  const activeCount = studentsRes.count ?? 0;
  const rosterSize = activeCount > 0 ? activeCount : (settings?.roster_limit ?? 20);

  const periodLen = (timeToMin(end_time) - timeToMin(start_time));
  const plannerResult = runPlanner({
    rosterSize,
    periodLengthMin: periodLen,
    bufferMin: buffer_min,
    windows,
    secsPerAbsent: settings?.secs_per_absent_check ?? 5.14,
    secsPerPresent: settings?.secs_per_present_reply ?? 1,
    worstCasePct: settings?.worst_case_absence_pct ?? 95,
  });

  const overrideConfirmed = formData.get('override_confirmed') === 'true';
  if (!plannerResult.feasible && !overrideConfirmed) {
    return { needsOverride: true, plannerResult };
  }

  const entry = {
    weekday,
    period_name: String(formData.get('period_name')).trim(),
    subject: String(formData.get('subject')).trim(),
    teacher_name: String(formData.get('teacher_name')).trim(),
    start_time,
    end_time,
    windows,
    buffer_min,
    active: true,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    await supabase.from('weekly_timetable').update(entry).eq('id', id);
  } else {
    await supabase.from('weekly_timetable').insert(entry);
  }

  if (!plannerResult.feasible && overrideConfirmed) {
    await supabase.from('audit_log').insert({
      actor: user.email ?? 'admin',
      entity: 'weekly_timetable',
      entity_id: id ?? null,
      field: 'planner_override',
      new_value: JSON.stringify(plannerResult),
      reason: 'Admin confirmed override of infeasible planner',
    });
  }

  revalidatePath('/admin/timetable');
  return { success: true };
}

export async function deleteTimetableEntry(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  await supabase.from('weekly_timetable').update({ active: false }).eq('id', id);
  revalidatePath('/admin/timetable');
}
