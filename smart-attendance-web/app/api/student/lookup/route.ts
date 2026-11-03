import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeRegNo, TZ } from '@/lib/utils';
import { STUDENT_LOOKUP_MAX_REQUESTS, STUDENT_LOOKUP_WINDOW_MS } from '@/lib/constants';

// Simple in-memory rate limiter (per-IP)
const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + STUDENT_LOOKUP_WINDOW_MS });
    return false;
  }
  if (entry.count >= STUDENT_LOOKUP_MAX_REQUESTS) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  const { regNo } = await req.json().catch(() => ({ regNo: '' }));
  if (!regNo || typeof regNo !== 'string') {
    return NextResponse.json({ error: 'Registration number not found.' }, { status: 404 });
  }

  const normalized = normalizeRegNo(regNo);
  const supabase = createServiceClient();

  // Find student by normalized reg no
  const { data: student } = await supabase
    .from('students')
    .select('id, name, reg_no')
    .eq('reg_no_normalized', normalized)
    .eq('active', true)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: 'Registration number not found.' }, { status: 404 });
  }

  // Fetch period runs, student results, and class settings concurrently
  const [allRunsRes, resultsRes, settingsRes] = await Promise.all([
    supabase
      .from('period_runs')
      .select('id, date, name, subject, start_at, end_at, status, windows, locked')
      .order('start_at', { ascending: true }),
    supabase
      .from('attendance_results')
      .select('id, period_run_id, windows_ran, windows_present, color, final_status, admin_override, override_reason, locked')
      .eq('student_id', student.id),
    supabase
      .from('class_settings')
      .select('class_name')
      .maybeSingle(),
  ]);

  const allRuns = allRunsRes.data;
  const results = resultsRes.data;
  const settings = settingsRes.data;

  const attMap = new Map<string, any>();
  (results ?? []).forEach((r) => attMap.set(r.period_run_id, r));

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

  const safeResults = (allRuns ?? []).map((run) => {
    const att = attMap.get(run.id);
    const isDayEnded = run.date < todayISO || (run.date === todayISO && run.status === 'finished');
    const isReview = att && (att.color === 'yellow' || att.color === 'orange');

    let studentColor = 'grey';
    let studentLabel = 'Pending';

    if (att) {
      // 1. Explicit admin override takes absolute precedence
      if (att.admin_override) {
        if (att.color === 'green' || att.final_status === 'present') {
          studentColor = 'green';
          studentLabel = 'Present';
        } else if (att.color === 'red' || att.final_status === 'absent') {
          studentColor = 'red';
          studentLabel = 'Absent';
        } else {
          studentColor = att.color || 'grey';
          studentLabel = att.final_status || 'Pending';
        }
      } else if (run.status === 'cancelled') {
        studentColor = 'grey';
        studentLabel = 'Cancelled';
      } else if (isReview) {
        if (isDayEnded) {
          studentColor = 'green';
          studentLabel = 'Present';
        } else {
          studentColor = 'green';
          studentLabel = 'Present (under review)';
        }
      } else if (att.color === 'green' || att.final_status === 'present') {
        studentColor = 'green';
        studentLabel = 'Present';
      } else if (att.color === 'red' || att.final_status === 'absent') {
        studentColor = 'red';
        studentLabel = 'Absent';
      } else if (att.final_status === 'not_recorded') {
        studentColor = 'grey';
        studentLabel = 'Not recorded';
      } else {
        studentColor = att.color || 'grey';
        studentLabel = 'Pending';
      }
    } else {
      // No explicit attendance row for this student in this period
      if (run.status === 'cancelled') {
        studentColor = 'grey';
        studentLabel = 'Cancelled';
      } else if (run.status === 'did_not_run') {
        studentColor = 'grey';
        studentLabel = 'Not recorded';
      } else if (run.date < todayISO || (run.date === todayISO && run.status === 'finished')) {
        studentColor = 'grey';
        studentLabel = 'Not recorded';
      } else if (run.status === 'running') {
        studentColor = 'grey';
        studentLabel = 'Live Scanning';
      } else {
        studentColor = 'grey';
        studentLabel = 'Scheduled';
      }
    }

    return {
      periodRunId: run.id,
      date: run.date,
      periodName: run.name,
      subject: run.subject,
      startAt: run.start_at,
      endAt: run.end_at,
      periodStatus: run.status,
      color: studentColor,
      label: studentLabel,
      isReview: !!isReview,
      locked: !!run.locked,
    };
  });

  // Only include periods where attendance was actually taken/recorded
  // (Do not show unrecorded / untaken periods as grey on the student page)
  const takenResults = safeResults.filter(
    (r) => r.color !== 'grey' && r.label !== 'Not recorded' && r.label !== 'Cancelled'
  );

  return NextResponse.json(
    {
      student: {
        name: student.name,
        regNo: student.reg_no,
        className: settings?.class_name || 'Classroom Section',
      },
      results: takenResults,
    },
    {
      headers: {
        // Edge and browser stale-while-revalidate for fast 0ms loads on slow internet
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
      },
    }
  );
}
