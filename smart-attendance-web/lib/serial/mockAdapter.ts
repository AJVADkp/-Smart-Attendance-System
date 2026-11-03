// ============================================================
// lib/serial/mockAdapter.ts — Fake ESP32 for testing/dev
// ============================================================
'use client';

import { sleep } from '@/lib/utils';
import type { SerialAdapter, CheckResult } from './types';

export interface MockDevice {
  address: string;
  name: string;
  /** true = phone is "present" (will respond quickly) */
  present: boolean;
  /** Override response time in ms (optional) */
  responseMs?: number;
}

export interface MockAdapterConfig {
  devices: MockDevice[];
  presentDelayMs?: number;  // default 1000
  absentDelayMs?: number;   // default 5140
  pingDelayMs?: number;     // default 50
}

export class MockSerialAdapter implements SerialAdapter {
  private _connected = false;
  private devices: Map<string, MockDevice>;
  private cfg: Required<MockAdapterConfig>;

  constructor(config: MockAdapterConfig) {
    this.cfg = {
      presentDelayMs: 1000,
      absentDelayMs: 5140,
      pingDelayMs: 50,
      ...config,
    };
    this.devices = new Map(
      config.devices.map((d) => [d.address.toUpperCase(), d])
    );
  }

  get connected() { return this._connected; }

  async connect(): Promise<void> {
    await sleep(200);
    this._connected = true;
    console.log('[MockSerial] Connected');
  }

  async disconnect(): Promise<void> {
    await sleep(50);
    this._connected = false;
    console.log('[MockSerial] Disconnected');
  }

  async ping(): Promise<boolean> {
    await sleep(this.cfg.pingDelayMs);
    return true;
  }

  async check(bluetoothAddress: string): Promise<CheckResult> {
    return this.checkAddress(bluetoothAddress);
  }

  async checkAddress(bluetoothAddress: string): Promise<CheckResult> {
    const device = this.devices.get(bluetoothAddress.toUpperCase());
    const present = device?.present ?? false;
    const delay = device?.responseMs ?? (present ? this.cfg.presentDelayMs : this.cfg.absentDelayMs);

    await sleep(delay);

    const rawJson = {
      event: 'result',
      mac: bluetoothAddress,
      present,
      status: present ? 0 : 1,
      ms: delay,
      tries: 1,
      name: device?.name ?? '',
    };

    return {
      present,
      responseMs: delay,
      phoneName: device?.name ?? '',
      tries: 1,
      rawJson,
      timedOut: false,
    };
  }

  /** Add or update a device at runtime (for testing) */
  setDevice(device: MockDevice) {
    this.devices.set(device.address.toUpperCase(), device);
  }

  /** Toggle presence of a device */
  toggleDevice(address: string) {
    const key = address.toUpperCase();
    const d = this.devices.get(key);
    if (d) this.devices.set(key, { ...d, present: !d.present });
  }
}

/** Default mock with 5 present + 3 absent demo devices */
export function createDefaultMock(): MockSerialAdapter {
  return new MockSerialAdapter({
    devices: [
      { address: 'AA:BB:CC:DD:EE:01', name: 'Arjun Galaxy', present: true },
      { address: 'AA:BB:CC:DD:EE:02', name: 'Priya OnePlus', present: true },
      { address: 'AA:BB:CC:DD:EE:03', name: 'Ravi Pixel', present: true },
      { address: 'AA:BB:CC:DD:EE:04', name: 'Sneha iPhone', present: true },
      { address: 'AA:BB:CC:DD:EE:05', name: 'Kiran Realme', present: true },
      { address: 'AA:BB:CC:DD:EE:06', name: 'Meera Samsung', present: false },
      { address: 'AA:BB:CC:DD:EE:07', name: 'Dev Vivo', present: false },
      { address: 'AA:BB:CC:DD:EE:08', name: 'Asha Oppo', present: false },
    ],
  });
}
