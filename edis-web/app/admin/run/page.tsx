import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RunPageClient } from './RunPageClient';
import { createTodayPeriodRuns } from './actions';
import { PageHeader } from '@/components/ui/PageHeader';
import { TZ, formatDateIST } from '@/lib/utils';
import { LiveDashboardClock } from '@/components/admin/LiveDashboardClock';
import { autoResolveEndedDayReviews } from '@/lib/autoResolveUnderReview';

export default async function RunPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  await autoResolveEndedDayReviews(supabase);

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
  const fullDateDisplay = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now); // e.g. "Tuesday, 27 Oct 2026"

  // Idempotently build today's period runs from weekly timetable + day changes
  try {
    await createTodayPeriodRuns();
  } catch (err) {
    // Non-fatal if already created or offline
  }

  // Reconcile past periods for today:
  // If period end_at has passed and status is 'running', finalize it to 'finished'.
  // If period end_at has passed and status is 'scheduled', mark as 'did_not_run' so it doesn't linger.
  const nowIso = now.toISOString();
  await Promise.all([
    supabase
      .from('period_runs')
      .update({ status: 'finished' })
      .eq('date', todayISO)
      .eq('status', 'running')
      .lt('end_at', nowIso),
    supabase
      .from('period_runs')
      .update({ status: 'did_not_run' })
      .eq('date', todayISO)
      .eq('status', 'scheduled')
      .lt('end_at', nowIso),
  ]);

  // Load today's period runs, active students, and timetable entries
  const [periodRunsRes, studentsRes, settingsRes] = await Promise.all([
    supabase
      .from('period_runs')
      .select('*')
      .eq('date', todayISO)
      .order('start_at'),
    supabase
      .from('students')
      .select('id, name, reg_no, bluetooth_address, phone_type')
      .eq('active', true)
      .order('reg_no_normalized'),
    supabase.from('class_settings').select('*').single(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ESP32 Attendance Scanner"
        subtitle={<LiveDashboardClock initialDateStr={`Classroom session: ${fullDateDisplay} • Fully Automated Mode`} />}
      />
      <RunPageClient
        todayDateStr={todayISO}
        periodRuns={periodRunsRes.data ?? []}
        students={studentsRes.data ?? []}
        settings={settingsRes.data}
      />
    </div>
  );
}
