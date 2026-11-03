import type { SupabaseClient } from '@supabase/supabase-js';
import { TZ } from './utils';

/**
 * Automatically auto-resolves any "under review" (yellow/orange) attendance results
 * to "Present" (green) when the day has ended or class periods have concluded.
 */
export async function autoResolveEndedDayReviews(supabase: SupabaseClient) {
  try {
    const now = new Date();
    const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

    // Find all unreviewed or unlocked yellow/orange results
    const { data: results, error } = await supabase
      .from('attendance_results')
      .select('id, color, period_run_id, period_runs(id, date, end_at, status)')
      .in('color', ['yellow', 'orange'])
      .eq('reviewed', false);

    if (error || !results || results.length === 0) return { resolved: 0 };

    const toResolveIds: string[] = [];

    for (const res of results as any[]) {
      const run = res.period_runs;
      if (!run) continue;

      const isPastDate = run.date < todayISO;
      const isPastEndTime = run.end_at && new Date(run.end_at).getTime() <= now.getTime();
      const isConcludedPeriod = run.status === 'finished' || run.status === 'did_not_run';

      // If the period's date is in the past, or if today's period has concluded
      if (isPastDate || (run.date === todayISO && (isPastEndTime || isConcludedPeriod))) {
        toResolveIds.push(res.id);
      }
    }

    if (toResolveIds.length > 0) {
      await supabase
        .from('attendance_results')
        .update({
          color: 'green',
          final_status: 'present',
          reviewed: true,
          override_reason: 'Automatically marked Present at end of session/day',
          updated_at: new Date().toISOString(),
        })
        .in('id', toResolveIds);
    }

    return { resolved: toResolveIds.length };
  } catch (err) {
    console.warn('[autoResolveEndedDayReviews] notice:', err);
    return { resolved: 0 };
  }
}
