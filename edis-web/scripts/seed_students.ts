import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
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

function normalizeRegNo(raw: string): string {
  return raw.trim().replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
}

interface StudentInput {
  reg_no: string;
  name: string;
  bluetooth_address: string;
  phone_type: string;
}

const studentsToSeed: StudentInput[] = [
  {
    reg_no: 'CCE25CS031',
    name: 'AJVAD KP',
    bluetooth_address: 'BC:98:29:8B:44:44',
    phone_type: 'IQOO NEO 10',
  },
  {
    reg_no: 'CEE25CS012',
    name: 'ACHU S',
    bluetooth_address: '7C:F0:E5:A1:81:E0',
    phone_type: 'ONE PLUS',
  },
  {
    reg_no: 'CCE25CS017',
    name: 'ADHARSH TS',
    bluetooth_address: '7C:F0:E5:EA:AA:E6',
    phone_type: 'ONE PLUS',
  },
  {
    reg_no: 'CCE25CS055',
    name: 'ANANTHITHA A S',
    bluetooth_address: '3C:CD:40:8C:50:CD',
    phone_type: 'IPHONE 16',
  },
  {
    reg_no: 'CCE25CS042',
    name: 'ALENZ JAISON',
    bluetooth_address: 'D4:98:B9:3D:E5:A6',
    phone_type: 'IQOO Z10',
  },
  {
    reg_no: 'CCE25CS014',
    name: 'ACHYUTH OAMKUMAR',
    bluetooth_address: 'CC:F9:F0:1B:FA:15',
    phone_type: 'Samsung Galaxy M34',
  },
  {
    reg_no: 'CCE25CS022',
    name: 'ADITHYA KB',
    bluetooth_address: 'B0:46:92:B0:9B:AA',
    phone_type: 'OPPO',
  },
  {
    reg_no: 'CCE25CS020',
    name: 'ADILAKSHMI',
    bluetooth_address: 'FC:41:16:C5:2E:58',
    phone_type: 'PIXEL 9a',
  },
  {
    reg_no: 'CCE25CS009',
    name: 'ABHINAV KRISHNA',
    bluetooth_address: 'AC:C0:48:A6:82:CA',
    phone_type: 'ONE PLUS 12R',
  },
];

async function seed() {
  console.log(`Starting insertion of ${studentsToSeed.length} students...`);

  const records = studentsToSeed.map((s) => ({
    reg_no: s.reg_no.trim(),
    reg_no_normalized: normalizeRegNo(s.reg_no),
    name: s.name.trim(),
    bluetooth_address: s.bluetooth_address.trim().toUpperCase(),
    phone_type: s.phone_type.trim(),
    active: true,
  }));

  const { data, error } = await supabase.from('students').insert(records).select();

  if (error) {
    console.error('Error inserting students:', error);
    process.exit(1);
  }

  console.log(`Successfully inserted ${data.length} students:`);
  data.forEach((s) => {
    console.log(`- ${s.reg_no} | ${s.name} | ${s.bluetooth_address} | ${s.phone_type}`);
  });
}

seed();
