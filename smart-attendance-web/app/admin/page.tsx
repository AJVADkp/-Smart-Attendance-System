import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Users,
  CalendarDays,
  AlertCircle,
  FileQuestion,
  Radio,
  UserPlus,
  CalendarCheck,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { formatTime12IST, formatTimeRange12, TZ, getPeriodTemporalState, cn } from '@/lib/utils';
import { AutoAttendanceModal } from '@/components/auto/AutoAttendanceModal';
import { LiveDashboardClock } from '@/components/admin/LiveDashboardClock';
import { autoResolveEndedDayReviews } from '@/lib/autoResolveUnderReview';

export default async function AdminDashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/admin/login');
  const supabase = await createClient();

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
  const weekdayNum = (() => {
    const day = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(now);
    const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return map[day] ?? 1;
  })();

  const fullDateDisplay = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now); // e.g. "Wednesday, 28 Oct 2026"

  // Fetch dashboard stats & run auto-resolution concurrently in parallel
  const [
    _autoRes,
    studentsRes,
    settingsRes,
    openReportsRes,
    periodRunsRes,
    timetableRes,
    auditRes,
  ] = await Promise.all([
    autoResolveEndedDayReviews(supabase),
    supabase.from('students').select('id, active', { count: 'exact' }),
    supabase.from('class_settings').select('*').single(),
    supabase.from('problem_reports').select('id', { count: 'exact' }).eq('status', 'open'),
    supabase
      .from('period_runs')
      .select('id, name, subject, start_at, end_at, status, windows')
      .eq('date', todayISO)
      .order('start_at', { ascending: true }),
    supabase
      .from('weekly_timetable')
      .select('id, name, subject, start_time, end_time, windows')
      .eq('weekday', weekdayNum)
      .order('start_time', { ascending: true }),
    supabase
      .from('audit_log')
      .select('id, entity, field, new_value, old_value, reason, at, actor')
      .order('at', { ascending: false })
      .limit(6),
  ]);

  const totalStudents = studentsRes.count ?? 0;
  const activeStudents = studentsRes.data?.filter((s) => s.active).length ?? 0;
  const settings = settingsRes.data;

  const openReportsCount = openReportsRes.count ?? 0;
  const periodRuns = periodRunsRes.data ?? [];
  const timetableEntries = timetableRes.data ?? [];

  // Determine today's periods count
  const periodsTodayCount = Math.max(periodRuns.length, timetableEntries.length);

  // Fetch count of today's attendance results that need review
  let needsReviewCount = 0;
  if (periodRuns.length > 0) {
    const runIds = periodRuns.map((r) => r.id);
    const { count } = await supabase
      .from('attendance_results')
      .select('id', { count: 'exact', head: true })
      .in('period_run_id', runIds)
      .in('color', ['yellow', 'orange'])
      .eq('reviewed', false);
    needsReviewCount = count ?? 0;
  }

  // Format audit records in plain language
  const recentAudit = (auditRes.data ?? []).map((a) => {
    const timeStr = a.at ? formatTime12IST(a.at) : '';
    let desc = a.reason || 'System action recorded';

    if (a.entity === 'students' && a.field === 'created') {
      desc = `Added student ${a.new_value || ''}`;
    } else if (a.entity === 'class_settings') {
      desc = 'Updated class configuration settings';
    } else if (a.entity === 'weekly_timetable') {
      desc = `Added timetable period`;
    } else if (a.entity === 'attendance_results') {
      desc = a.reason || 'Updated student attendance status';
    } else if (a.entity === 'problem_reports') {
      desc = a.reason || 'Resolved student problem report';
    } else if (a.entity === 'esp32_verification') {
      desc = 'Completed hardware connection check';
    }

    return { id: a.id, description: desc, time: timeStr };
  });

  // Identify currently active live period
  const activeLiveRun = periodRuns.find((pr) => {
    const temporal = getPeriodTemporalState(pr.start_at, pr.end_at, pr.status, now);
    return temporal.isCurrent;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Background Auto-Attendance Modal */}
      <AutoAttendanceModal defaultOpen={false} hideTrigger={true} />

      {/* 1. Hero Welcome & Telemetry Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 p-6 sm:p-8 shadow-sm relative overflow-hidden transition-colors">
        {/* Ambient background glow orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-100/60 via-amber-100/40 to-transparent dark:from-orange-500/10 dark:via-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 text-orange-700 dark:text-orange-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                <span>Instructor Dashboard</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              {settings?.class_name || 'Classroom Dashboard'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold">
                <Users className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                <span>{activeStudents} {activeStudents === 1 ? 'Student' : 'Students'} Enrolled</span>
              </span>
            </div>
            <div className="pt-1">
              <LiveDashboardClock initialDateStr={fullDateDisplay} />
            </div>
          </div>

          {/* If there is a live class session right now */}
          {activeLiveRun ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-glow-orange flex items-center justify-between gap-4 max-w-md shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100">
                    Live Session Active
                  </span>
                </div>
                <div className="font-bold text-sm sm:text-base leading-tight line-clamp-1">
                  {activeLiveRun.subject}
                </div>
                <div className="text-xs text-orange-100">
                  {activeLiveRun.name} • {formatTimeRange12(activeLiveRun.start_at, activeLiveRun.end_at)}
                </div>
              </div>
              <Link href={`/admin/run?period=${activeLiveRun.id}`} prefetch={true} className="shrink-0">
                <Button variant="secondary" size="sm" className="bg-white text-orange-600 font-semibold shadow-xs hover:bg-orange-50">
                  <span>Monitor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/admin/run" prefetch={true} className="shrink-0">
              <Button size="md" className="shadow-sm">
                <Radio className="w-4 h-4" />
                <span>Launch Scanner Cockpit</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Key Actionable Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          label="Needs Verification"
          value={needsReviewCount}
          subtitle={
            needsReviewCount > 0
              ? `${needsReviewCount} student records flagged for review`
              : 'All daily attendance records reviewed'
          }
          href={`/admin/calendar/${todayISO}`}
          theme="rose"
          icon={<AlertCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Student Inquiries"
          value={openReportsCount}
          subtitle={
            openReportsCount > 0
              ? `${openReportsCount} dispute tickets open`
              : 'No pending student inquiries'
          }
          href="/admin/reports"
          theme="emerald"
          icon={<FileQuestion className="w-4 h-4" />}
        />
        <StatCard
          label="Daily Attendance Calendar"
          value={`${periodRuns.filter((r) => r.status === 'finished').length} / ${periodsTodayCount} Sessions`}
          subtitle="View full day matrix and export records"
          href={`/admin/calendar/${todayISO}`}
          theme="blue"
          icon={<CalendarCheck className="w-4 h-4" />}
        />
      </div>

      {/* 3 & 4. Schedule + Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Schedule (2 cols on lg) */}
        <Card
          title="Today's Timetable Schedule"
          description="Chronological classroom periods and automated scanning windows"
          className="lg:col-span-2"
          action={
            <Link href="/admin/run" prefetch={true}>
              <Button size="sm" variant="outline">
                <Radio className="w-3.5 h-3.5 text-orange-500" />
                <span>Open Scanner</span>
              </Button>
            </Link>
          }
        >
          {periodRuns.length > 0 ? (
            <div className="space-y-3">
              {periodRuns.map((pr) => {
                const timeRange = formatTimeRange12(pr.start_at, pr.end_at);
                const temporal = getPeriodTemporalState(pr.start_at, pr.end_at, pr.status, now);
                const st = temporal.displayStatus;

                return (
                  <div
                    key={pr.id}
                    className={cn(
                      'p-4.5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                      temporal.isCurrent
                        ? 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700/60 shadow-sm'
                        : 'bg-white dark:bg-zinc-800/90 border-slate-200/80 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-xs'
                    )}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-base text-slate-900 dark:text-zinc-100">
                          {pr.subject || pr.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md">
                          {pr.name}
                        </span>
                        {temporal.isCurrent && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-600 text-white uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Live Session
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                          <Clock className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                          <span>{timeRange}</span>
                        </div>
                        <span className="text-slate-300 dark:text-zinc-600">•</span>
                        <span>{pr.windows} scanning windows</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <Link href={`/admin/run?period=${pr.id}`} prefetch={true}>
                        <Button
                          variant={temporal.isCurrent ? 'primary' : 'secondary'}
                          size="sm"
                        >
                          {temporal.isCurrent ? 'Monitor Live' : 'Scanner'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : timetableEntries.length > 0 ? (
            <div className="space-y-3">
              {timetableEntries.map((te) => {
                const timeRange = `${te.start_time.slice(0, 5)} – ${te.end_time.slice(0, 5)}`;
                return (
                  <div
                    key={te.id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                          {te.subject}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">({te.name})</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                        <span>{timeRange}</span>
                        <span>•</span>
                        <span>{te.windows} windows</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Badge variant="neutral">Scheduled</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No periods scheduled for today"
              description="There are no classroom timetable periods configured for today. You can build your weekly schedule in the timetable planner."
              actionLabel="Go to timetable"
              actionHref="/admin/timetable"
            />
          )}
        </Card>

        {/* Quick Actions & Recent Activity (1 col on lg) */}
        <div className="space-y-6">
          <Card title="Quick Actions" description="Direct shortcuts for classroom tasks">
            <div className="space-y-3">
              <Link href="/admin/run" prefetch={true} className="block">
                <Button className="w-full justify-start text-xs font-semibold py-3" size="md">
                  <Radio className="w-4 h-4 text-white" />
                  <span>Launch ESP32 Scanner</span>
                </Button>
              </Link>
              <Link href="/admin/students" prefetch={true} className="block">
                <Button variant="secondary" className="w-full justify-start text-xs font-semibold py-3" size="md">
                  <UserPlus className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span>Enroll New Student</span>
                </Button>
              </Link>
              <Link href={`/admin/calendar/${todayISO}`} prefetch={true} className="block">
                <Button variant="outline" className="w-full justify-start text-xs font-semibold py-3" size="md">
                  <CalendarCheck className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                  <span>Inspect Today's Attendance</span>
                </Button>
              </Link>
            </div>
          </Card>

          {/* 5. Recent Activity */}
          <Card
            title="System Audit Trail"
            description="Recent compliance & enrollment events"
            action={
              <Link href="/admin/audit" prefetch={true} className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline">
                View all &rarr;
              </Link>
            }
          >
            {recentAudit.length > 0 ? (
              <div className="space-y-3.5">
                {recentAudit.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 text-xs border-b border-slate-100 dark:border-zinc-800 pb-3 last:border-none last:pb-0"
                  >
                    <div className="text-slate-800 dark:text-zinc-200 leading-snug font-medium">{a.description}</div>
                    <span className="text-slate-400 dark:text-zinc-500 font-mono text-[11px] shrink-0">
                      {a.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400">No system events logged today.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
