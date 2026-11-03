import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

async function enrollMiddayStudent() {
  const testRegNo = 'CCE25CS099';
  const testMac = '7C:F0:E5:A1:99:99';

  // Check / clean up prior test student
  const { data: existing } = await supabase.from('students').select('id').eq('reg_no', testRegNo).maybeSingle();
  if (existing) {
    await supabase.from('attendance_results').delete().eq('student_id', existing.id);
    await supabase.from('students').delete().eq('id', existing.id);
  }

  // Create student
  const { data: student, error } = await supabase.from('students').insert({
    reg_no: testRegNo,
    reg_no_normalized: testRegNo.toLowerCase().replace(/[^a-z0-9]/g, ''),
    name: 'DEVRAJ NAIR',
    bluetooth_address: testMac,
    phone_type: 'ONE PLUS 11',
    active: true,
  }).select().single();

  if (error || !student) throw error || new Error('Insert failed');

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

  const { data: pastRuns } = await supabase
    .from('period_runs')
    .select('id, name, start_at, end_at, status')
    .eq('date', todayISO);

  if (pastRuns && pastRuns.length > 0) {
    const concludedRuns = pastRuns.filter(
      (r) =>
        r.status === 'finished' ||
        r.status === 'did_not_run' ||
        new Date(r.end_at).getTime() <= now.getTime() ||
        (r.status !== 'running' && new Date(r.start_at).getTime() < now.getTime())
    );

    if (concludedRuns.length > 0) {
      const unmarkedEntries = concludedRuns.map((r) => ({
        period_run_id: r.id,
        student_id: student.id,
        windows_ran: 0,
        windows_present: 0,
        color: 'grey' as const,
        final_status: 'not_recorded' as const,
        admin_override: false,
        override_reason: 'Enrolled mid-day after period ended (Unmarked)',
        reviewed: true,
        locked: false,
      }));

      await supabase.from('attendance_results').upsert(unmarkedEntries, { onConflict: 'period_run_id,student_id' });
    }
  }

  return { student, todayISO };
}

async function capture() {
  const { student, todayISO } = await enrollMiddayStudent();
  console.log('Enrolled student:', student.name, student.reg_no);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const debuggingPort = 9232;
  const uniqueDir = `C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c9e1c6cc-3dbb-4fc2-bcf7-cd9f95aeafa7\\scratch\\chrome_midday_${Date.now()}`;

  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${uniqueDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1600',
    'http://localhost:3000/admin/login',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  function getJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      http
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(JSON.parse(data)));
        })
        .on('error', reject);
    });
  }

  const targets = await getJson(`http://127.0.0.1:${debuggingPort}/json`);
  const pageTarget = targets.find((t: any) => t.type === 'page');
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map<number, (res: any) => void>();

  ws.addEventListener('open', () => {
    function send(method: string, params: any = {}) {
      return new Promise<any>((resolve) => {
        const msgId = id++;
        pending.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const res = pending.get(data.id)!;
        pending.delete(data.id);
        res(data.result);
      }
    });

    (async () => {
      await send('Page.enable');
      await send('Runtime.enable');
      await send('Page.navigate', { url: 'http://localhost:3000/admin/login' });
      await new Promise((r) => setTimeout(r, 2000));

      // Login
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const inputs = document.querySelectorAll('input');
            const setVal = (el, val) => {
              const proto = Object.getPrototypeOf(el);
              const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
              setter.call(el, val);
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            };
            if (inputs[0]) setVal(inputs[0], 'admin@edis.com');
            if (inputs[1]) setVal(inputs[1], 'Admin@EDIS2024');
            const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Sign in'));
            if (submitBtn) submitBtn.click();
          })()
        `,
      });
      await new Promise((r) => setTimeout(r, 2500));

      // Navigate to /admin/calendar/[date]
      await send('Page.navigate', { url: `http://localhost:3000/admin/calendar/${todayISO}` });
      await new Promise((r) => setTimeout(r, 3000));

      const ssCal = await send('Page.captureScreenshot', { format: 'png' });
      const calPath = path.resolve('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c9e1c6cc-3dbb-4fc2-bcf7-cd9f95aeafa7\\midday_enrollee_unmarked_calendar.png');
      fs.writeFileSync(calPath, Buffer.from(ssCal.data, 'base64'));
      console.log('Saved calendar day view screenshot to:', calPath);

      // Navigate to /admin/students
      await send('Page.navigate', { url: 'http://localhost:3000/admin/students' });
      await new Promise((r) => setTimeout(r, 2500));

      const ssStudents = await send('Page.captureScreenshot', { format: 'png' });
      const stuPath = path.resolve('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c9e1c6cc-3dbb-4fc2-bcf7-cd9f95aeafa7\\students_roster_10_enrolled.png');
      fs.writeFileSync(stuPath, Buffer.from(ssStudents.data, 'base64'));
      console.log('Saved students roster screenshot to:', stuPath);

      ws.close();
      chromeProc.kill();
      process.exit(0);
    })();
  });
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
