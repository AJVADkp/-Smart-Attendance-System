// ============================================================
// lib/serial/verification.ts — ESP32 hardware verification helpers
// ============================================================

export const ESP32_CONFIG = {
  baudRate: 115200,
  pingTimeoutMs: 2000,
  checkTimeoutMs: 8000,
  postOpenWaitMs: 2500,
  expectedAbsentDurationSecs: 5.14,
  absentToleranceSecs: 0.4, // Pass range: 4.74s - 5.54s
  presentFastThresholdMs: 2500, // Pass: < 2.5s
  presentWarningThresholdMs: 4000, // Warning: 2.5s - 4.0s
  testAbsentAddress: '00:11:22:33:44:55',
};

export type TestStatus = 'pending' | 'running' | 'pass' | 'warning' | 'fail';

export interface TestResult {
  id: number;
  name: string;
  status: TestStatus;
  measuredValue?: string;
  explanation: string;
  isRequired: boolean;
  rawData?: any;
}

/** Evaluate Test 1: Browser environment */
export function evaluateBrowserTest(hasSerial: boolean, isSecure: boolean): {
  status: TestStatus;
  measuredValue: string;
  explanation: string;
} {
  if (hasSerial && isSecure) {
    return {
      status: 'pass',
      measuredValue: 'Web Serial + Secure Context',
      explanation: 'Browser supports Web Serial API under a secure context (HTTPS/localhost).',
    };
  }
  return {
    status: 'fail',
    measuredValue: !hasSerial ? 'No Web Serial' : 'Insecure Context',
    explanation: 'Web Serial API requires Chrome/Edge on desktop under HTTPS or localhost.',
  };
}

/** Evaluate Test 4: PING reply */
export function evaluatePingTest(replyReceived: boolean, roundTripMs: number): {
  status: TestStatus;
  measuredValue: string;
  explanation: string;
} {
  if (replyReceived && roundTripMs <= ESP32_CONFIG.pingTimeoutMs) {
    return {
      status: 'pass',
      measuredValue: `${roundTripMs} ms`,
      explanation: `Valid PONG received within ${roundTripMs} ms (threshold: ${ESP32_CONFIG.pingTimeoutMs} ms).`,
    };
  }
  return {
    status: 'fail',
    measuredValue: replyReceived ? `${roundTripMs} ms` : 'No reply',
    explanation: 'ESP32 did not respond to PING command within 2000 ms.',
  };
}

/** Evaluate Test 5: Absent probe timing */
export function evaluateAbsentTimingTest(present: boolean, durationMs: number): {
  status: TestStatus;
  measuredValue: string;
  measuredSecs: number;
  explanation: string;
  needsSettingUpdate: boolean;
} {
  const durationSecs = Number((durationMs / 1000).toFixed(2));
  const minExpected = ESP32_CONFIG.expectedAbsentDurationSecs - ESP32_CONFIG.absentToleranceSecs;
  const maxExpected = ESP32_CONFIG.expectedAbsentDurationSecs + ESP32_CONFIG.absentToleranceSecs;

  if (present) {
    return {
      status: 'fail',
      measuredValue: 'Phone reported present',
      measuredSecs: durationSecs,
      explanation: 'Test address should never be reported as present.',
      needsSettingUpdate: false,
    };
  }

  if (durationSecs >= minExpected && durationSecs <= maxExpected) {
    return {
      status: 'pass',
      measuredValue: `${durationSecs} s`,
      measuredSecs: durationSecs,
      explanation: `Duration of ${durationSecs} s matches expected benchmark (5.14 ± 0.4 s).`,
      needsSettingUpdate: false,
    };
  }

  return {
    status: 'warning',
    measuredValue: `${durationSecs} s`,
    measuredSecs: durationSecs,
    explanation: `Duration ${durationSecs} s deviates from 5.14 s benchmark. You can update your class settings to use this measured value.`,
    needsSettingUpdate: true,
  };
}

/** Evaluate Test 6: Live phone check */
export function evaluateLivePhoneTest(present: boolean, durationMs: number, phoneName: string): {
  status: TestStatus;
  measuredValue: string;
  explanation: string;
} {
  if (!present) {
    return {
      status: 'fail',
      measuredValue: 'No reply (Absent)',
      explanation: 'Is Bluetooth enabled on the phone, is it nearby in the room, and is the MAC address exact?',
    };
  }

  const nameDisplay = phoneName ? ` ("${phoneName}")` : '';
  if (durationMs <= ESP32_CONFIG.presentFastThresholdMs) {
    return {
      status: 'pass',
      measuredValue: `${(durationMs / 1000).toFixed(2)} s${nameDisplay}`,
      explanation: `Phone verified present in ${durationMs} ms (< 2.5 s).`,
    };
  }

  if (durationMs <= ESP32_CONFIG.presentWarningThresholdMs) {
    return {
      status: 'warning',
      measuredValue: `${(durationMs / 1000).toFixed(2)} s${nameDisplay}`,
      explanation: `Phone present but took ${durationMs} ms (acceptable latency, but between 2.5s and 4.0s).`,
    };
  }

  return {
    status: 'warning',
    measuredValue: `${(durationMs / 1000).toFixed(2)} s${nameDisplay}`,
    explanation: `Slow probe response of ${durationMs} ms (> 4.0s).`,
  };
}

/** Evaluate Test 7: Repeat 5x reliability check */
export function evaluateRepeatTest(results: Array<{ present: boolean; durationMs: number }>): {
  status: TestStatus;
  measuredValue: string;
  explanation: string;
  falseAbsentDetected: boolean;
} {
  if (results.length === 0) {
    return {
      status: 'pending',
      measuredValue: '—',
      explanation: 'No checks executed yet.',
      falseAbsentDetected: false,
    };
  }

  const presents = results.filter((r) => r.present);
  const durations = presents.map((r) => r.durationMs);
  const falseAbsents = results.filter((r) => !r.present && r.durationMs < 1000);

  const min = durations.length > 0 ? Math.min(...durations) : 0;
  const max = durations.length > 0 ? Math.max(...durations) : 0;
  const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  if (presents.length === results.length) {
    return {
      status: 'pass',
      measuredValue: `${results.length}/${results.length} Present (avg ${avg}ms, min ${min}ms, max ${max}ms)`,
      explanation: `100% reliability over ${results.length} consecutive probe cycles.`,
      falseAbsentDetected: false,
    };
  }

  if (falseAbsents.length > 0) {
    return {
      status: 'fail',
      measuredValue: `${presents.length}/${results.length} Present`,
      explanation: `Detected fast absent response (< 1s) indicating possible Bluetooth GAP failure or packet collision.`,
      falseAbsentDetected: true,
    };
  }

  return {
    status: 'warning',
    measuredValue: `${presents.length}/${results.length} Present (avg ${avg}ms)`,
    explanation: `${results.length - presents.length} probe(s) were missed out of ${results.length} tries.`,
    falseAbsentDetected: false,
  };
}
