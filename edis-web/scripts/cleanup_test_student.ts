import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
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
  const { data: s } = await supabase.from('students').select('id').eq('reg_no', 'CCE25CS099').maybeSingle();
  if (s) {
    await supabase.from('attendance_results').delete().eq('student_id', s.id);
    await supabase.from('students').delete().eq('id', s.id);
    console.log('Cleaned up test student CCE25CS099');
  } else {
    console.log('Test student CCE25CS099 not found (already clean).');
  }

  const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('active', true);
  console.log('Active enrolled students in DB:', count);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
