// ============================================================
// lib/serial/realAdapter.ts — Robust Web Serial API adapter
// Handles ESP32 USB DTR reset, boot settling, and JSON stream framing
// ============================================================
'use client';

import { SERIAL_BAUD_RATE, SERIAL_REPLY_TIMEOUT_MS } from '@/lib/constants';
import type { SerialAdapter, CheckResult, ESP32Reply } from './types';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class RealSerialAdapter implements SerialAdapter {
  private port: any = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private keepReading = false;
  private lineBuffer = '';
  private _connected = false;
  private responseWaiter: ((reply: any, rawLine: string) => boolean) | null = null;

  get connected() {
    return this._connected;
  }

  async connect(): Promise<void> {
    if (this._connected && this.port) {
      return; // Already connected and ready
    }

    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      throw new Error(
        'Web Serial API is not supported in this browser. Please open this page in Google Chrome or Microsoft Edge on your computer.'
      );
    }

    let port: any = null;

    // 1. Check for an already-authorized port first (no user popup needed if authorized)
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports && ports.length > 0) {
        port = ports[0];
      }
    } catch {}

    // 2. If no previously authorized port, request one (user clicks port once per origin)
    if (!port) {
      try {
        port = await (navigator as any).serial.requestPort();
      } catch (reqErr: any) {
        throw new Error(
          'No USB port selected. Select your ESP32 device from the browser popup.'
        );
      }
    }

    // 3. Open port at 115200 baud.
    // If the port is already open in this tab, proceed.
    // If locked by another tab/process, throw clear guidance without re-prompting picker!
    try {
      await port.open({ baudRate: SERIAL_BAUD_RATE });
    } catch (openErr: any) {
      const msg = String(openErr?.message || '');
      // If already open by our own session, proceed
      if (msg.includes('already open')) {
        // Port is already open in this context
      } else if (
        msg.includes('busy') ||
        msg.includes('Failed to open') ||
        msg.includes('denied') ||
        msg.includes('in use')
      ) {
        throw new Error(
          'COM port is busy! Please close other browser tabs running this site or Arduino IDE Serial Monitor, then click Connect.'
        );
      } else {
        throw new Error(`Failed to open serial port: ${msg}`);
      }
    }

    this.port = port;

    // 4. Assert DTR=false, RTS=false (ensures ESP32 EN/GPIO0 are in normal RUN mode, not flashing bootloader mode)
    try {
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    } catch {}

    // 5. Start background streaming reader loop
    this.startReading();

    // 6. Give the ESP32 1.5 seconds to settle its hardware boot and initialize Classic Bluetooth
    await sleep(1500);

    // 7. Drain any bootloader banners or initial setup() lines
    this.drainBuffer();

    this._connected = true;

    // Store reference on window for reuse across re-renders
    if (typeof window !== 'undefined') {
      (window as any).__esp32_active_adapter = this;
    }
  }

  async disconnect(): Promise<void> {
    this.keepReading = false;
    this.responseWaiter = null;
    this._connected = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      try {
        this.reader.releaseLock();
      } catch {}
      this.reader = null;
    }

    // Microtask settling delay so stream unlock finishes
    await sleep(60);

    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }

    this.lineBuffer = '';
    if (typeof window !== 'undefined') {
      delete (window as any).__esp32_active_adapter;
    }
  }

  async ping(): Promise<boolean> {
    // Try up to 3 attempts with brief pause
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const ok = await this.sendPingOnce(1500);
        if (ok) return true;
      } catch {}
      await sleep(250);
    }
    return false;
  }

  private sendPingOnce(timeoutMs: number): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.responseWaiter === waiter) this.responseWaiter = null;
        resolve(false);
      }, timeoutMs);

      const waiter = (reply: any) => {
        if (reply.event === 'pong' || reply.status === 'ok') {
          clearTimeout(timer);
          resolve(true);
          return true;
        }
        return false; // Skip boot / ready notifications
      };

      this.responseWaiter = waiter;

      try {
        await this.writeLine('PING');
      } catch (err) {
        clearTimeout(timer);
        this.responseWaiter = null;
        reject(err);
      }
    });
  }

  async check(bluetoothAddress: string): Promise<CheckResult> {
    return this.checkAddress(bluetoothAddress);
  }

  async checkAddress(bluetoothAddress: string): Promise<CheckResult> {
    const targetMac = bluetoothAddress.toUpperCase().trim();

    return new Promise(async (resolve) => {
      const timer = setTimeout(() => {
        if (this.responseWaiter === waiter) this.responseWaiter = null;
        resolve({
          present: false,
          responseMs: SERIAL_REPLY_TIMEOUT_MS,
          phoneName: '',
          tries: 0,
          rawJson: {
            event: 'timeout',
            mac: targetMac,
            present: false,
            status: -1,
            ms: SERIAL_REPLY_TIMEOUT_MS,
            tries: 0,
            name: '',
          },
          timedOut: true,
        });
      }, SERIAL_REPLY_TIMEOUT_MS);

      const waiter = (reply: any) => {
        // Ignore background boot, ready, or ping lines
        if (
          reply.event === 'boot' ||
          reply.event === 'ready' ||
          reply.event === 'pong'
        ) {
          return false;
        }

        // Must be a result event
        if (reply.event === 'result') {
          // If a MAC is provided, ensure it matches (or accept if single-probe)
          if (reply.mac && reply.mac.toUpperCase() !== targetMac) {
            return false;
          }

          clearTimeout(timer);
          resolve({
            present: Boolean(reply.present),
            responseMs: Number(reply.ms ?? 0),
            phoneName: String(reply.name ?? ''),
            tries: Number(reply.tries ?? 1),
            rawJson: {
              event: 'result',
              mac: targetMac,
              present: Boolean(reply.present),
              status: Number(reply.status ?? 0),
              ms: Number(reply.ms ?? 0),
              tries: Number(reply.tries ?? 1),
              name: String(reply.name ?? ''),
            },
            timedOut: false,
          });
          return true;
        }

        return false;
      };

      this.responseWaiter = waiter;

      try {
        await this.writeLine(`CHECK ${targetMac}`);
      } catch (err) {
        clearTimeout(timer);
        this.responseWaiter = null;
        resolve({
          present: false,
          responseMs: 0,
          phoneName: '',
          tries: 0,
          rawJson: {
            event: 'error',
            mac: targetMac,
            present: false,
            status: -1,
            ms: 0,
            tries: 0,
            name: '',
          },
          timedOut: true,
        });
      }
    });
  }

  // ── Internal Streaming Reader & Framing ────────────────────────
  private startReading() {
    this.keepReading = true;
    const readable = this.port?.readable;
    if (!readable) return;

    this.reader = readable.getReader();

    (async () => {
      const decoder = new TextDecoder();
      try {
        while (this.keepReading && this.reader) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            const text = decoder.decode(value, { stream: true });
            this.lineBuffer += text;
            this.processBufferedLines();
          }
        }
      } catch (err) {
        // Disconnected or reader cancelled
      } finally {
        try {
          this.reader?.releaseLock();
        } catch {}
      }
    })();
  }

  private processBufferedLines() {
    let nlIdx: number;
    while ((nlIdx = this.lineBuffer.indexOf('\n')) !== -1) {
      const rawLine = this.lineBuffer.slice(0, nlIdx).trim();
      this.lineBuffer = this.lineBuffer.slice(nlIdx + 1);
      if (!rawLine) continue;

      try {
        const json = JSON.parse(rawLine);
        if (this.responseWaiter) {
          const handled = this.responseWaiter(json, rawLine);
          if (handled) {
            this.responseWaiter = null;
          }
        }
      } catch {
        // Non-JSON line (ESP32 ROM bootloader message, etc.) — ignore safely
      }
    }
  }

  private async writeLine(command: string): Promise<void> {
    if (!this.port || !this.port.writable) {
      throw new Error('Serial port is not writable');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(command + '\r\n');
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  private drainBuffer() {
    this.lineBuffer = '';
  }
}
