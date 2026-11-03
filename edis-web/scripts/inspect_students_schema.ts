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
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    env[k] = v;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL']!, env['SUPABASE_SERVICE_ROLE_KEY']!);

async function main() {
  const { data, error } = await supabase
    .from('students')
    .select('reg_no, name, bluetooth_address, phone_type, active')
    .order('reg_no');

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`TOTAL STUDENTS IN DB: ${data.length}`);
  console.table(data);
}

main();
