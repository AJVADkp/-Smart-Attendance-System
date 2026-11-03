// ============================================================
// lib/serial/types.ts — Serial adapter interface & ESP32 types
// ============================================================

/** Parsed reply from ESP32 CHECK command */
export interface ESP32Reply {
  event: string;
  mac: string;
  present: boolean;
  status: number;
  ms: number;
  tries: number;
  name: string;
}

/** Result of a single CHECK operation returned to the engine */
export interface CheckResult {
  present: boolean;
  responseMs: number;
  phoneName: string;
  tries: number;
  rawJson: ESP32Reply;
  timedOut: boolean;
}

/** Abstract serial adapter — swap real ↔ mock with an env flag */
export interface SerialAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
  checkAddress(bluetoothAddress: string): Promise<CheckResult>;
  check(bluetoothAddress: string): Promise<CheckResult>;
  readonly connected: boolean;
}
