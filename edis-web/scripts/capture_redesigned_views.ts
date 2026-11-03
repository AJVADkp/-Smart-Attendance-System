import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const debuggingPort = 9240;
  const uniqueDir = `C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c9e1c6cc-3dbb-4fc2-bcf7-cd9f95aeafa7\\scratch\\chrome_redesign_${Date.now()}`;

  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${uniqueDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    'http://localhost:3000',
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

      // 1. Capture Student Public Portal
      await send('Page.navigate', { url: 'http://localhost:3000' });
      await new Promise((r) => setTimeout(r, 2500));

      const ssHome = await send('Page.captureScreenshot', { format: 'png' });
      const homePath = path.resolve(
        'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c9e1c6cc-3dbb-4fc2-bcf7-cd9f95aeafa7\\redesigned_student_portal.png'
      );
      fs.writeFileSync(homePath, Buffer.from(ssHome.data, 'base64'));
      console.log('Saved student portal screenshot to:', homePath);

      // 2. Login to Admin Console
      await send('Page.navigate', { url: 'http://localhost:3000/admin/login' });
      await new Promise((r) => setTimeout(r, 2000));

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

      // 3. Capture Redesigned Admin Dashboard
      await send('Page.navigate', { url: 'http://localhost:3000/admin' });
      await new Promise((r) => setTimeout(r, 3000));

      const ssDashboard = await send('Page.captureScreenshot', { format: 'png' });
      const dashPath = path.resolve(
        'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\c9e1c6cc-3dbb-4fc2-bcf7-cd9f95aeafa7\\redesigned_admin_dashboard.png'
      );
      fs.writeFileSync(dashPath, Buffer.from(ssDashboard.data, 'base64'));
      console.log('Saved admin dashboard screenshot to:', dashPath);

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
