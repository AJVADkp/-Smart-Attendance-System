'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { normalizeRegNo, isValidBluetoothAddress } from '@/lib/utils';

function validate(data: Record<string, string>) {
  if (!data.reg_no?.trim()) return 'Registration number is required.';
  if (!data.name?.trim()) return 'Name is required.';
  if (!isValidBluetoothAddress(data.bluetooth_address))
    return 'Bluetooth address must be in format AA:BB:CC:DD:EE:FF.';
  return null;
}

export async function createStudent(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const err = validate(raw);
  if (err) throw new Error(err);

  const reg_no_normalized = normalizeRegNo(raw.reg_no);

  // Check duplicates
  const { data: dup } = await supabase.from('students')
    .select('id, reg_no, reg_no_normalized, bluetooth_address')
    .or(`reg_no_normalized.eq.${reg_no_normalized},bluetooth_address.eq.${raw.bluetooth_address}`)
    .maybeSingle();

  if (dup) {
    if (dup.reg_no_normalized === reg_no_normalized)
      throw new Error(`Registration number already used by another student.`);
    throw new Error(`Bluetooth address already registered to another student.`);
  }

  const { data: student, error } = await supabase.from('students').insert({
    reg_no: raw.reg_no.trim(),
    reg_no_normalized,
    name: raw.name.trim(),
    bluetooth_address: raw.bluetooth_address.trim().toUpperCase(),
    phone_type: raw.phone_type?.trim() ?? '',
    active: true,
  }).select().single();

  if (error) throw new Error(error.message);

  // When a student is added mid-day, mark all previous periods today as 'unmarked' (not_recorded)
  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

  const { data: pastRuns } = await supabase
    .from('period_runs')
    .select('id, name, start_at, end_at, status')
    .eq('date', todayISO);

  if (pastRuns && pastRuns.length > 0) {
    const concludedRuns = pastRuns.filter(
      (r) =>
        r.status === 'finished' ||
        r.status === 'did_not_run' ||
        new Date(r.end_at).getTime() <= now.getTime() ||
        (r.status !== 'running' && new Date(r.start_at).getTime() < now.getTime())
    );

    if (concludedRuns.length > 0) {
      const unmarkedEntries = concludedRuns.map((r) => ({
        period_run_id: r.id,
        student_id: student.id,
        windows_ran: 0,
        windows_present: 0,
        color: 'grey' as const,
        final_status: 'not_recorded' as const,
        admin_override: false,
        override_reason: 'Enrolled mid-day after period ended (Unmarked)',
        reviewed: true,
        locked: false,
      }));

      await supabase
        .from('attendance_results')
        .upsert(unmarkedEntries, { onConflict: 'period_run_id,student_id' });
    }
  }

  await supabase.from('audit_log').insert({
    actor: user.email ?? 'admin',
    entity: 'students',
    entity_id: student.id,
    field: 'created',
    new_value: student.reg_no,
    reason: 'Student enrolled mid-day (past periods marked unmarked, active for current/future windows)',
  });

  revalidatePath('/admin/students');
  revalidatePath('/admin');
  revalidatePath('/admin/run');
  revalidatePath(`/admin/calendar/${todayISO}`);
}

export async function updateStudent(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const err = validate(raw);
  if (err) throw new Error(err);

  const reg_no_normalized = normalizeRegNo(raw.reg_no);

  // Check duplicates excluding self
  const { data: dup } = await supabase.from('students')
    .select('id')
    .or(`reg_no_normalized.eq.${reg_no_normalized},bluetooth_address.eq.${raw.bluetooth_address}`)
    .neq('id', id)
    .maybeSingle();

  if (dup) throw new Error('Registration number or Bluetooth address already used by another student.');

  const { data: old } = await supabase.from('students').select('*').eq('id', id).single();

  await supabase.from('students').update({
    reg_no: raw.reg_no.trim(),
    reg_no_normalized,
    name: raw.name.trim(),
    bluetooth_address: raw.bluetooth_address.trim().toUpperCase(),
    phone_type: raw.phone_type?.trim() ?? '',
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  await supabase.from('audit_log').insert({
    actor: user.email ?? 'admin',
    entity: 'students',
    entity_id: id,
    field: 'updated',
    old_value: JSON.stringify(old),
    new_value: JSON.stringify(raw),
    reason: raw.reason || 'Student updated',
  });

  revalidatePath('/admin/students');
  revalidatePath('/admin');
  revalidatePath('/admin/run');
}

export async function deactivateStudent(id: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase.from('students').update({ active: false, updated_at: new Date().toISOString() }).eq('id', id);

  await supabase.from('audit_log').insert({
    actor: user.email ?? 'admin',
    entity: 'students',
    entity_id: id,
    field: 'active',
    old_value: 'true',
    new_value: 'false',
    reason,
  });

  revalidatePath('/admin/students');
  revalidatePath('/admin');
  revalidatePath('/admin/run');
}

export interface StudentAttendanceSession {
  id?: string;
  periodRunId: string;
  date: string;
  periodName: string;
  subject: string;
  startAt: string;
  endAt: string;
  periodStatus: string;
  windowsRan: number;
  windowsPresent: number;
  color: 'green' | 'red' | 'yellow' | 'orange' | 'grey';
  finalStatus: 'present' | 'absent' | 'under_review' | 'not_recorded';
  adminOverride: boolean;
  overrideReason: string | null;
  reviewed: boolean;
}

/**
 * Fetches comprehensive attendance history for a single student across all
 * conducted and active class sessions, including hardware scan probe counts
 * and administrator override metadata.
 */
export async function getStudentAttendanceHistory(
  studentId: string
): Promise<StudentAttendanceSession[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Fetch all finished or running period runs
  const { data: runs, error: runsErr } = await supabase
    .from('period_runs')
    .select('id, date, name, subject, start_at, end_at, status, windows')
    .in('status', ['finished', 'running']);

  if (runsErr) {
    console.error('Error fetching period runs for student attendance:', runsErr);
  }

  // 2. Fetch all attendance results for this student
  const { data: results, error: resErr } = await supabase
    .from('attendance_results')
    .select(`
      id,
      period_run_id,
      windows_ran,
      windows_present,
      color,
      final_status,
      admin_override,
      override_reason,
      reviewed,
      period_runs (
        id,
        date,
        name,
        subject,
        start_at,
        end_at,
        status,
        windows
      )
    `)
    .eq('student_id', studentId);

  if (resErr) {
    console.error('Error fetching attendance results for student:', resErr);
    throw new Error(resErr.message);
  }

  const resultMap = new Map<string, any>();
  const runMap = new Map<string, any>();

  if (runs) {
    for (const r of runs) runMap.set(r.id, r);
  }

  if (results) {
    for (const res of results) {
      resultMap.set(res.period_run_id, res);
      const run = Array.isArray(res.period_runs) ? res.period_runs[0] : res.period_runs;
      if (run && !runMap.has(run.id)) {
        runMap.set(run.id, run);
      }
    }
  }

  const list: StudentAttendanceSession[] = [];
  for (const [runId, run] of runMap.entries()) {
    const res = resultMap.get(runId);
    let finalStatus: 'present' | 'absent' | 'under_review' | 'not_recorded' = 'not_recorded';
    if (res?.final_status) {
      finalStatus = res.final_status as any;
    } else if (res?.color === 'green') {
      finalStatus = 'present';
    } else if (res?.color === 'red') {
      finalStatus = 'absent';
    }

    let color: 'green' | 'red' | 'yellow' | 'orange' | 'grey' = 'grey';
    if (res?.color) {
      color = res.color as any;
    } else if (finalStatus === 'present') {
      color = 'green';
    } else if (finalStatus === 'absent') {
      color = 'red';
    }

    list.push({
      id: res?.id,
      periodRunId: run.id,
      date: run.date,
      periodName: run.name,
      subject: run.subject,
      startAt: run.start_at,
      endAt: run.end_at,
      periodStatus: run.status,
      windowsRan: res?.windows_ran ?? run.windows ?? 1,
      windowsPresent: res?.windows_present ?? 0,
      color,
      finalStatus,
      adminOverride: !!res?.admin_override,
      overrideReason: res?.override_reason ?? null,
      reviewed: !!res?.reviewed,
    });
  }

  // Sort chronological descending: latest date first, latest time first
  list.sort((a, b) => {
    const dDiff = b.date.localeCompare(a.date);
    if (dDiff !== 0) return dDiff;
    const tA = a.startAt ? new Date(a.startAt).getTime() : 0;
    const tB = b.startAt ? new Date(b.startAt).getTime() : 0;
    return tB - tA;
  });

  return list;
}

