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
  console.log('--- Step 1: Checking current active periods & students ---');
  const { data: studentsBefore } = await supabase.from('students').select('id, reg_no, name').eq('active', true);
  console.log(`Currently enrolled active students count: ${studentsBefore?.length}`);

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

  const { data: todayRuns } = await supabase
    .from('period_runs')
    .select('id, name, subject, start_at, end_at, status')
    .eq('date', todayISO)
    .order('start_at');

  console.log('Today periods:');
  console.table(todayRuns);

  // Step 2: Simulate enrolling a student mid-day during Period 3
  const testRegNo = 'CCE25CS099';
  const testMac = 'AA:BB:CC:DD:EE:99';

  // Clean any previous test residue if exists
  const { data: existing } = await supabase.from('students').select('id').eq('reg_no', testRegNo).maybeSingle();
  if (existing) {
    await supabase.from('attendance_results').delete().eq('student_id', existing.id);
    await supabase.from('students').delete().eq('id', existing.id);
  }

  console.log(`\n--- Step 2: Enrolling new student mid-day (${testRegNo} - TEST MIDDAY STUDENT) ---`);
  const { data: newStudent, error: insertErr } = await supabase.from('students').insert({
    reg_no: testRegNo,
    reg_no_normalized: testRegNo.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: 'TEST MIDDAY ENROLLEE',
    bluetooth_address: testMac,
    phone_type: 'GOOGLE PIXEL 8',
    active: true,
  }).select().single();

  if (insertErr || !newStudent) {
    console.error('Failed to create student:', insertErr);
    process.exit(1);
  }
  console.log(`Student created successfully: ${newStudent.id} (${newStudent.reg_no})`);

  // Step 3: Run past periods unmarking logic (identical to actions.ts)
  const concludedRuns = (todayRuns || []).filter(
    (r) =>
      r.status === 'finished' ||
      r.status === 'did_not_run' ||
      new Date(r.end_at).getTime() <= now.getTime() ||
      (r.status !== 'running' && new Date(r.start_at).getTime() < now.getTime())
  );

  console.log(`\n--- Step 3: Concluded past periods to mark Unmarked (${concludedRuns.length}) ---`);
  concludedRuns.forEach((r) => console.log(` - ${r.name} (${r.subject}) [status: ${r.status}]`));

  if (concludedRuns.length > 0) {
    const unmarkedEntries = concludedRuns.map((r) => ({
      period_run_id: r.id,
      student_id: newStudent.id,
      windows_ran: 0,
      windows_present: 0,
      color: 'grey' as const,
      final_status: 'not_recorded' as const,
      admin_override: false,
      override_reason: 'Enrolled mid-day after period ended (Unmarked)',
      reviewed: true,
      locked: false,
    }));

    const { error: upsertErr } = await supabase
      .from('attendance_results')
      .upsert(unmarkedEntries, { onConflict: 'period_run_id,student_id' });

    if (upsertErr) {
      console.error('Upsert unmarked error:', upsertErr);
      process.exit(1);
    }
  }

  // Step 4: Verify attendance_results in DB
  console.log('\n--- Step 4: Verifying attendance_results for newly enrolled student ---');
  const { data: results } = await supabase
    .from('attendance_results')
    .select('period_run_id, windows_ran, windows_present, color, final_status, override_reason')
    .eq('student_id', newStudent.id);

  console.table(
    results?.map((res) => {
      const run = todayRuns?.find((r) => r.id === res.period_run_id);
      return {
        period: run?.name,
        subject: run?.subject,
        windows_ran: res.windows_ran,
        windows_present: res.windows_present,
        color: res.color,
        final_status: res.final_status,
        override_reason: res.override_reason,
      };
    })
  );

  // Step 5: Check that Period 3 is NOT marked as unmarked (it is running and ready for scanning)
  const period3 = todayRuns?.find((r) => r.name === 'Period 3');
  const period3Result = results?.find((r) => r.period_run_id === period3?.id);
  console.log(`Period 3 (running) result exists? ${!!period3Result} (Expected: false until scanned)`);

  // Clean up test student
  await supabase.from('attendance_results').delete().eq('student_id', newStudent.id);
  await supabase.from('students').delete().eq('id', newStudent.id);
  console.log('\nTest completed successfully! Cleaned up test enrollee.');
}

main().catch(console.error);
