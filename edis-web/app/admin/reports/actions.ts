'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface OverrideAttendanceParams {
  periodRunId: string;
  studentId: string;
  status: 'present' | 'absent';
  reason: string;
  problemReportId?: string;
  resolveReport?: boolean;
}

/**
 * Allows administrators to manually edit / override a student's attendance
 * (e.g. when reviewing problem reports or fixing missed hardware scans).
 */
export async function overrideStudentAttendance(params: OverrideAttendanceParams) {
  let userEmail = 'admin@school.edu';
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (user.email) userEmail = user.email;
  } catch (authErr: any) {
    // If called outside Next request scope (e.g. in test script)
    if (authErr?.message?.includes('cookies')) {
      userEmail = 'admin@school.edu';
    } else {
      throw authErr;
    }
  }

  const { periodRunId, studentId, status, reason, problemReportId, resolveReport } = params;
  if (!periodRunId || !studentId) throw new Error('Missing periodRunId or studentId');
  if (!reason?.trim()) throw new Error('Reason is required for administrator attendance override');

  const supabase = createServiceClient();

  // 1. Fetch period run info
  const { data: periodRun, error: runErr } = await supabase
    .from('period_runs')
    .select('id, name, subject, date, windows, status')
    .eq('id', periodRunId)
    .single();

  if (runErr || !periodRun) throw new Error('Period run not found');

  // If period run was 'did_not_run' or 'scheduled', mark as finished now that attendance is manually recorded
  if (periodRun.status === 'did_not_run' || periodRun.status === 'scheduled') {
    await supabase
      .from('period_runs')
      .update({ status: 'finished', updated_at: new Date().toISOString() })
      .eq('id', periodRunId);
  }

  // 2. Fetch student info
  const { data: student, error: stErr } = await supabase
    .from('students')
    .select('id, name, reg_no')
    .eq('id', studentId)
    .single();

  if (stErr || !student) throw new Error('Student not found');

  // 3. Find existing attendance record
  const { data: existing } = await supabase
    .from('attendance_results')
    .select('*')
    .eq('period_run_id', periodRunId)
    .eq('student_id', studentId)
    .maybeSingle();

  const color = status === 'present' ? 'green' : 'red';
  const windowsRan = existing?.windows_ran ?? (periodRun.windows || 1);
  const windowsPresent = status === 'present' ? windowsRan : 0;
  const nowISO = new Date().toISOString();

  let resultId = existing?.id;

  if (existing) {
    const { data: updated, error: updErr } = await supabase
      .from('attendance_results')
      .update({
        color,
        final_status: status,
        admin_override: true,
        override_reason: reason.trim(),
        reviewed: true,
        windows_present: windowsPresent,
        updated_at: nowISO,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updErr) throw new Error(updErr.message);
    resultId = updated.id;
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('attendance_results')
      .insert({
        period_run_id: periodRunId,
        student_id: studentId,
        windows_ran: windowsRan,
        windows_present: windowsPresent,
        color,
        final_status: status,
        admin_override: true,
        override_reason: reason.trim(),
        reviewed: true,
        locked: false,
      })
      .select()
      .single();

    if (insErr) throw new Error(insErr.message);
    resultId = inserted.id;
  }

  // Format day in IST for comprehensive audit clarity
  let formattedDay = periodRun.date;
  try {
    const [y, m, d] = periodRun.date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    formattedDay = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(dateObj);
  } catch {
    formattedDay = periodRun.date;
  }

  const auditReason = `Day: ${formattedDay} (${periodRun.date}) | Subject: ${periodRun.subject} | Period: ${periodRun.name} | Student: ${student.name} (${student.reg_no}) | Reason: ${reason.trim()}`;

  // 4. Record in audit log with day, subject name, period, and student automatically included
  await supabase.from('audit_log').insert({
    actor: userEmail,
    entity: 'attendance_results',
    entity_id: resultId,
    field: 'override_status',
    old_value: existing ? `${existing.color} (${existing.final_status})` : 'unrecorded',
    new_value: `${color} (${status})`,
    reason: auditReason,
  });

  // 5. If linked problem report and resolveReport requested
  if (problemReportId && resolveReport) {
    const resolutionNote = `Attendance updated to ${status === 'present' ? 'Present' : 'Absent'} by admin. Reason: ${reason.trim()}`;
    await supabase
      .from('problem_reports')
      .update({
        status: 'resolved',
        resolved_note: resolutionNote,
        updated_at: nowISO,
      })
      .eq('id', problemReportId);

    await supabase.from('audit_log').insert({
      actor: userEmail,
      entity: 'problem_reports',
      entity_id: problemReportId,
      field: 'status',
      old_value: 'open',
      new_value: 'resolved',
      reason: `Day: ${formattedDay} (${periodRun.date}) | Subject: ${periodRun.subject} | Period: ${periodRun.name} | Student: ${student.name} (${student.reg_no}) | Reason: ${resolutionNote}`,
    });
  }

  // 6. Revalidate cache (safe inside Next.js request context)
  try {
    revalidatePath('/admin/reports');
    revalidatePath('/admin/calendar');
    revalidatePath(`/admin/calendar/${periodRun.date}`);
    revalidatePath('/admin');
    revalidatePath('/admin/audit');
  } catch {}

  return {
    success: true,
    resultId,
    color,
    finalStatus: status,
    windowsRan,
    windowsPresent,
    overrideReason: reason.trim(),
  };
}

/**
 * Resolves a problem report with an optional resolution note without editing attendance.
 */
export async function resolveProblemReport(reportId: string, note?: string) {
  let userEmail = 'admin@school.edu';
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (user.email) userEmail = user.email;
  } catch (authErr: any) {
    if (authErr?.message?.includes('cookies')) {
      userEmail = 'admin@school.edu';
    } else {
      throw authErr;
    }
  }

  const supabase = createServiceClient();
  const nowISO = new Date().toISOString();
  const resolvedNote = note?.trim() || 'Resolved by administrator';

  // Fetch report details to include day, subject, period in audit log
  const { data: report } = await supabase
    .from('problem_reports')
    .select(`
      id,
      message,
      students (name, reg_no),
      period_runs (date, name, subject)
    `)
    .eq('id', reportId)
    .single();

  let auditReason = resolvedNote;
  if (report) {
    const run = Array.isArray(report.period_runs) ? report.period_runs[0] : report.period_runs;
    const st = Array.isArray(report.students) ? report.students[0] : report.students;
    if (run) {
      let formattedDay = run.date;
      try {
        const [y, m, d] = run.date.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        formattedDay = new Intl.DateTimeFormat('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Kolkata',
        }).format(dateObj);
      } catch {
        formattedDay = run.date;
      }
      auditReason = `Day: ${formattedDay} (${run.date}) | Subject: ${run.subject} | Period: ${run.name}${st ? ` | Student: ${st.name} (${st.reg_no})` : ''} | Reason: ${resolvedNote}`;
    }
  }

  const { error } = await supabase
    .from('problem_reports')
    .update({
      status: 'resolved',
      resolved_note: resolvedNote,
      updated_at: nowISO,
    })
    .eq('id', reportId);

  if (error) throw new Error(error.message);

  await supabase.from('audit_log').insert({
    actor: userEmail,
    entity: 'problem_reports',
    entity_id: reportId,
    field: 'status',
    old_value: 'open',
    new_value: 'resolved',
    reason: auditReason,
  });

  try {
    revalidatePath('/admin/reports');
    revalidatePath('/admin');
    revalidatePath('/admin/audit');
  } catch {}

  return { success: true };
}
