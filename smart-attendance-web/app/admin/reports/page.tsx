import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportsClient } from './ReportsClient';

export default async function ReportsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/admin/login');
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from('problem_reports')
    .select(`
      id,
      student_id,
      period_run_id,
      message,
      status,
      resolved_note,
      created_at,
      updated_at,
      students (id, name, reg_no, phone_type),
      period_runs (id, name, subject, date, start_at, end_at, windows)
    `)
    .order('created_at', { ascending: false });

  // Query matching attendance_results for all reported student & period pairs
  let reportsWithAttendance = reports ?? [];
  if (reports && reports.length > 0) {
    const periodRunIds = Array.from(new Set(reports.map((r) => r.period_run_id).filter(Boolean)));
    const studentIds = Array.from(new Set(reports.map((r) => r.student_id).filter(Boolean)));

    const { data: attResults } = await supabase
      .from('attendance_results')
      .select('id, period_run_id, student_id, color, final_status, windows_ran, windows_present, admin_override, override_reason')
      .in('period_run_id', periodRunIds)
      .in('student_id', studentIds);

    const attMap = new Map<string, any>();
    attResults?.forEach((a) => {
      attMap.set(`${a.period_run_id}_${a.student_id}`, a);
    });

    reportsWithAttendance = reports.map((r) => ({
      ...r,
      attendance: attMap.get(`${r.period_run_id}_${r.student_id}`) || null,
    }));
  }

  return (
    <ReportsClient
      reports={reportsWithAttendance as any}
      adminEmail={user.email ?? ''}
    />
  );
}
