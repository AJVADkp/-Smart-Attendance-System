import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get yesterday's date in IST
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterday);

  // Find all unlocked attendance results for that date
  const { data: periodRuns } = await supabase
    .from('period_runs')
    .select('id')
    .eq('date', dateStr);

  if (!periodRuns?.length) {
    return NextResponse.json({ message: 'No period runs for yesterday.' });
  }

  const periodRunIds = periodRuns.map((r) => r.id);

  // Lock all results: yellow/orange → present, keep red as absent
  const { data: results } = await supabase
    .from('attendance_results')
    .select('id, color')
    .in('period_run_id', periodRunIds)
    .eq('locked', false);

  let locked = 0;
  for (const result of results ?? []) {
    const finalStatus = result.color === 'red' ? 'absent' : 'present';
    const finalColor = result.color === 'yellow' || result.color === 'orange' ? 'green' : result.color;
    await supabase.from('attendance_results').update({
      final_status: finalStatus,
      color: finalColor,
      locked: true,
      reviewed: true,
      updated_at: new Date().toISOString(),
    }).eq('id', result.id);
    locked++;
  }

  // Lock period runs too
  await supabase.from('period_runs').update({ locked: true }).in('id', periodRunIds);

  return NextResponse.json({ message: `Locked ${locked} results for ${dateStr}.` });
}
