import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarClient } from './CalendarClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { TZ } from '@/lib/utils';
import { autoResolveEndedDayReviews } from '@/lib/autoResolveUnderReview';

export default async function AdminCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  await autoResolveEndedDayReviews(supabase);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Start & end of calendar window (show current month plus edges)
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

  const [periodRunsRes, timetableRes, needsReviewRes, missedWindowsRes] =
    await Promise.all([
      supabase
        .from('period_runs')
        .select(`id, date, name, subject, status, windows, start_at, end_at`)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date')
        .order('start_at'),
      supabase
        .from('weekly_timetable')
        .select(`id, weekday, period_name, subject, start_time, end_time, windows`)
        .eq('active', true),
      supabase
        .from('attendance_results')
        .select('period_run_id, color')
        .in('color', ['yellow', 'orange'])
        .eq('reviewed', false),
      supabase
        .from('windows')
        .select('period_run_id, window_num, status')
        .eq('status', 'missed'),
    ]);

  const periodRuns = periodRunsRes.data ?? [];
  const timetable = timetableRes.data ?? [];
  const needsReview = needsReviewRes.data ?? [];
  const missedWindows = missedWindowsRes.data ?? [];

  // Group review counts by date
  const reviewCountByDate: Record<string, number> = {};
  (needsReview ?? []).forEach((r) => {
    const run = periodRuns.find((p) => p.id === r.period_run_id);
    if (run?.date) {
      reviewCountByDate[run.date] = (reviewCountByDate[run.date] || 0) + 1;
    }
  });

  // Group missed window runs by date
  const missedRunsByDate = new Set(
    missedWindows
      .map((w) => periodRuns.find((p) => p.id === w.period_run_id)?.date)
      .filter(Boolean) as string[]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Monthly classroom attendance schedule, review indicators, and missed window flags"
      />
      <CalendarClient
        periodRuns={periodRuns}
        timetable={timetable}
        reviewCountByDate={reviewCountByDate}
        missedDateSet={Array.from(missedRunsByDate)}
        year={year}
        month={month}
      />
    </div>
  );
}
