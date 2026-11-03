import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env: Record<string, string> = {};
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL']!, env['SUPABASE_SERVICE_ROLE_KEY']!);

async function main() {
  // Check if any old timetable entries exist that are not in the new 30
  // First, delete any period_runs pointing to old entries
  await supabase.from('period_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Now delete any old weekly_timetable entries where subject is IoT or Data Structures (old demo)
  const { data: all } = await supabase.from('weekly_timetable').select('id, weekday, period_name, subject, teacher_name, start_time, end_time');
  console.log(`Total rows in weekly_timetable before purge: ${all?.length}`);

  // We want only our 30 valid periods. Let's delete all and re-insert cleanly now that period_runs is empty!
  await supabase.from('weekly_timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('weekly_timetable fully purged.');

  // Re-run population
}

main().catch(console.error);
