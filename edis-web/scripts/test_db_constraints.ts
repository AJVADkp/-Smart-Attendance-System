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

async function testInsert() {
  const test1 = {
    reg_no: 'TEST01',
    reg_no_normalized: 'TEST01',
    name: 'Test 1',
    bluetooth_address: 'AA:BB:CC:DD:EE:01',
    phone_type: 'Test',
    active: true
  };
  const test2 = {
    reg_no: 'TEST02',
    reg_no_normalized: 'TEST02',
    name: 'Test 2',
    bluetooth_address: 'AA:BB:CC:DD:EE:01', // same MAC address
    phone_type: 'Test',
    active: true
  };

  const res1 = await supabase.from('students').insert(test1).select();
  console.log('Insert 1 result:', res1);

  const res2 = await supabase.from('students').insert(test2).select();
  console.log('Insert 2 result (duplicate MAC):', res2);

  // Clean up test rows
  await supabase.from('students').delete().in('reg_no', ['TEST01', 'TEST02']);
}

testInsert();
