import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']!;
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface TimetableSeed {
  weekday: number;
  period_name: string;
  subject: string;
  teacher_name?: string;
  start_time: string;
  end_time: string;
  windows: number;
  buffer_min: number;
  active: boolean;
}

const timetableData: TimetableSeed[] = [
  // Monday (weekday 1)
  {
    weekday: 1,
    period_name: 'Period 1',
    subject: 'Probability Distributions and Random Processes (Theory)',
    teacher_name: 'Ms. Petcy Annie M M',
    start_time: '08:00',
    end_time: '08:50',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 1,
    period_name: 'Period 2',
    subject: 'Data Structures Lab',
    teacher_name: 'Faculty',
    start_time: '09:20',
    end_time: '10:10',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 1,
    period_name: 'Period 3',
    subject: 'Data Structures Lab',
    teacher_name: 'Faculty',
    start_time: '10:10',
    end_time: '11:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 1,
    period_name: 'Period 4',
    subject: 'Data Structures Lab',
    teacher_name: 'Faculty',
    start_time: '11:10',
    end_time: '12:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 1,
    period_name: 'Period 5',
    subject: 'Digital Electronics (Theory)',
    teacher_name: 'Ms. Reshma K V',
    start_time: '12:50',
    end_time: '13:40',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 1,
    period_name: 'Period 6',
    subject: 'Library',
    teacher_name: 'Ms. Biya Bijoy',
    start_time: '13:40',
    end_time: '14:30',
    windows: 2,
    buffer_min: 1,
    active: true,
  },

  // Tuesday (weekday 2)
  {
    weekday: 2,
    period_name: 'Period 1',
    subject: 'Object Oriented Programming (Theory)',
    teacher_name: 'Ms. Iris Jose, Ms. Anupama Jayan',
    start_time: '08:00',
    end_time: '08:50',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 2,
    period_name: 'Period 2',
    subject: 'Data Structures and Algorithms (Theory)',
    teacher_name: 'Ms. Mariya Seby',
    start_time: '09:20',
    end_time: '10:10',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 2,
    period_name: 'Period 3',
    subject: 'Strategic Communication & Documentation in Engineering (Theory)',
    teacher_name: 'Ms. Mariya Seby, English Faculty',
    start_time: '10:10',
    end_time: '11:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 2,
    period_name: 'Period 4',
    subject: 'Probability Distributions and Random Processes (Theory)',
    teacher_name: 'Ms. Petcy Annie M M',
    start_time: '11:10',
    end_time: '12:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 2,
    period_name: 'Period 5',
    subject: 'Universal Human Values and Professional Ethics (Theory)',
    teacher_name: 'Ms. Hima Jose',
    start_time: '12:50',
    end_time: '13:40',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 2,
    period_name: 'Period 6',
    subject: 'Digital Electronics (Theory)',
    teacher_name: 'Ms. Reshma K V',
    start_time: '13:40',
    end_time: '14:30',
    windows: 2,
    buffer_min: 1,
    active: true,
  },

  // Wednesday (weekday 3)
  {
    weekday: 3,
    period_name: 'Period 1',
    subject: 'Digital Electronics (Theory)',
    teacher_name: 'Ms. Reshma K V',
    start_time: '08:00',
    end_time: '08:50',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 3,
    period_name: 'Period 2',
    subject: 'Data Structures and Algorithms (Theory)',
    teacher_name: 'Ms. Mariya Seby',
    start_time: '09:20',
    end_time: '10:10',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 3,
    period_name: 'Period 3',
    subject: 'Environmental Science (Theory)',
    teacher_name: 'Ms. Anu T S',
    start_time: '10:10',
    end_time: '11:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 3,
    period_name: 'Period 4',
    subject: 'Object Oriented Programming (Theory)',
    teacher_name: 'Ms. Iris Jose, Ms. Anupama Jayan',
    start_time: '11:10',
    end_time: '12:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 3,
    period_name: 'Period 5',
    subject: 'Probability Distributions and Random Processes (Theory)',
    teacher_name: 'Ms. Petcy Annie M M',
    start_time: '12:50',
    end_time: '13:40',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 3,
    period_name: 'Period 6',
    subject: 'Engineering Design and Innovation Studio',
    teacher_name: 'Ms. Reshma Kurian, Ms. Arya M A',
    start_time: '13:40',
    end_time: '14:30',
    windows: 2,
    buffer_min: 1,
    active: true,
  },

  // Thursday (weekday 4)
  {
    weekday: 4,
    period_name: 'Period 1',
    subject: 'Data Structures and Algorithms (Theory)',
    teacher_name: 'Ms. Mariya Seby',
    start_time: '08:00',
    end_time: '08:50',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 4,
    period_name: 'Period 2',
    subject: 'Probability Distributions and Random Processes (Theory)',
    teacher_name: 'Ms. Petcy Annie M M',
    start_time: '09:20',
    end_time: '10:10',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 4,
    period_name: 'Period 3',
    subject: 'Digital Electronics (Theory)',
    teacher_name: 'Ms. Reshma K V',
    start_time: '10:10',
    end_time: '11:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 4,
    period_name: 'Period 4',
    subject: 'Object Oriented Programming (Theory)',
    teacher_name: 'Ms. Iris Jose, Ms. Anupama Jayan',
    start_time: '11:10',
    end_time: '12:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 4,
    period_name: 'Period 5',
    subject: 'Data Structures Lab',
    teacher_name: 'Faculty',
    start_time: '12:50',
    end_time: '13:40',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 4,
    period_name: 'Period 6',
    subject: 'Data Structures Lab',
    teacher_name: 'Faculty',
    start_time: '13:40',
    end_time: '14:30',
    windows: 2,
    buffer_min: 1,
    active: true,
  },

  // Friday (weekday 5)
  {
    weekday: 5,
    period_name: 'Period 1',
    subject: 'Environmental Science (Theory)',
    teacher_name: 'Ms. Anu T S',
    start_time: '08:00',
    end_time: '08:50',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 5,
    period_name: 'Period 2',
    subject: 'Data Structures and Algorithms (Theory)',
    teacher_name: 'Ms. Mariya Seby',
    start_time: '09:20',
    end_time: '10:10',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 5,
    period_name: 'Period 3',
    subject: 'Engineering Design and Innovation Studio',
    teacher_name: 'Ms. Reshma Kurian, Ms. Arya M A',
    start_time: '10:10',
    end_time: '11:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 5,
    period_name: 'Period 4',
    subject: 'Free Period',
    teacher_name: 'Faculty',
    start_time: '11:10',
    end_time: '12:00',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 5,
    period_name: 'Period 5',
    subject: 'Strategic Communication & Documentation in Engineering (Theory)',
    teacher_name: 'Ms. Mariya Seby, English Faculty',
    start_time: '12:50',
    end_time: '13:40',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
  {
    weekday: 5,
    period_name: 'Period 6',
    subject: 'Object Oriented Programming (Theory)',
    teacher_name: 'Ms. Iris Jose, Ms. Anupama Jayan',
    start_time: '13:40',
    end_time: '14:30',
    windows: 2,
    buffer_min: 1,
    active: true,
  },
];

async function run() {
  console.log('--- PURGING OLD DATA FIRST ---');
  // 1. Delete dependent tables
  await supabase.from('problem_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('attendance_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('windows').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('period_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Dependent tables (reports, attendance_results, windows, period_runs) purged.');

  // 2. Delete all students
  const { error: stuErr } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (stuErr) console.error('Student delete error:', stuErr);
  else console.log('✓ All student records cleared from database.');

  // 3. Delete all weekly_timetable rows
  const { error: ttErr } = await supabase.from('weekly_timetable').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (ttErr) console.error('Timetable delete error:', ttErr);
  else console.log('✓ weekly_timetable completely purged.');

  console.log('--- SEEDING AUTHENTIC CHRIST COLLEGE TIMETABLE ---');
  // 4. Insert 30 authentic periods
  const { data: inserted, error: insErr } = await supabase.from('weekly_timetable').insert(timetableData).select();
  if (insErr) {
    console.error('Error inserting timetable entries:', insErr);
  } else {
    console.log(`✓ Inserted ${inserted?.length} authentic weekly timetable periods.`);
  }

  // 5. Generate fresh Wednesday period_runs for today
  const todayISO = '2026-10-28';
  const wednesdayPeriods = (inserted || timetableData).filter(t => t.weekday === 3);

  for (const entry of wednesdayPeriods) {
    const sTime = entry.start_time.length === 5 ? `${entry.start_time}:00` : entry.start_time;
    const eTime = entry.end_time.length === 5 ? `${entry.end_time}:00` : entry.end_time;
    const startAt = new Date(`${todayISO}T${sTime}+05:30`);
    const endAt = new Date(`${todayISO}T${eTime}+05:30`);
    
    await supabase.from('period_runs').insert({
      date: todayISO,
      timetable_entry_id: (entry as any).id || null,
      name: entry.period_name,
      subject: entry.subject,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      windows: entry.windows,
      buffer_min: entry.buffer_min,
      roster_size: 65,
      saved_settings: {},
      planner_status: 'safe',
      status: 'scheduled',
      locked: false,
    });
  }
  console.log(`✓ Generated ${wednesdayPeriods.length} fresh period runs for today (Wednesday).`);

  // 6. Update class name
  await supabase.from('class_settings').update({
    class_name: 'Christ College of Engineering (Autonomous)',
    roster_limit: 65,
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✓ Class settings updated to Christ College of Engineering (Autonomous).');

  console.log('=== DATABASE CLEANUP AND TIMETABLE SEEDING COMPLETE ===');
}

run().catch(console.error);
