import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DayViewClient } from './DayViewClient';
import { autoResolveEndedDayReviews } from '@/lib/autoResolveUnderReview';
import { TZ } from '@/lib/utils';

interface Props {
  params: Promise<{ date: string }>;
}

export default async function DayViewPage({ params }: Props) {
  const { date } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  // Automatically mark Present for any under review records whose day/session has ended
  await autoResolveEndedDayReviews(supabase);

  const [periodRunsRes, studentsRes, detectionsRes, windowsRes] = await Promise.all([
    supabase
      .from('period_runs')
      .select(`id, name, subject, status, windows, start_at, end_at, locked`)
      .eq('date', date)
      .order('start_at'),
    supabase
      .from('students')
      .select('id, name, reg_no, bluetooth_address')
      .eq('active', true)
      .order('name'),
    supabase
      .from('detections')
      .select('id, period_run_id, student_id, window_num, detected, detected_at, rssi')
      .order('detected_at', { ascending: true }),
    supabase
      .from('windows')
      .select('id, period_run_id, window_num, status')
      .order('window_num'),
  ]);

  const periodRuns = periodRunsRes.data ?? [];
  const periodRunIds = periodRuns.map((r) => r.id);

  // Get attendance results for all period runs on this date
  const { data: results } =
    periodRunIds.length > 0
      ? await supabase
          .from('attendance_results')
          .select('*')
          .in('period_run_id', periodRunIds)
      : { data: [] };

  return (
    <DayViewClient
      date={date}
      periodRuns={periodRuns}
      students={studentsRes.data ?? []}
      results={results ?? []}
      detections={detectionsRes.data ?? []}
      windowsList={windowsRes.data ?? []}
      adminEmail={user.email ?? ''}
    />
  );
}
