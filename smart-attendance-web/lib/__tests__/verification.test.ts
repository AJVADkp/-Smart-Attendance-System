import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBrowserTest,
  evaluatePingTest,
  evaluateAbsentTimingTest,
  evaluateLivePhoneTest,
  evaluateRepeatTest,
  ESP32_CONFIG,
} from '../serial/verification';

describe('ESP32 Connection Verification Unit Tests', () => {
  it('evaluateBrowserTest passes only when serial and secureContext are true', () => {
    assert.equal(evaluateBrowserTest(true, true).status, 'pass');
    assert.equal(evaluateBrowserTest(false, true).status, 'fail');
    assert.equal(evaluateBrowserTest(true, false).status, 'fail');
  });

  it('evaluatePingTest checks within 2000ms threshold', () => {
    assert.equal(evaluatePingTest(true, 120).status, 'pass');
    assert.equal(evaluatePingTest(true, 2000).status, 'pass');
    assert.equal(evaluatePingTest(true, 2500).status, 'fail');
    assert.equal(evaluatePingTest(false, 300).status, 'fail');
  });

  it('evaluateAbsentTimingTest validates 5.14s ± 0.4s benchmark', () => {
    // 5.14s - 0.4s = 4.74s, 5.14s + 0.4s = 5.54s
    const perfect = evaluateAbsentTimingTest(false, 5140);
    assert.equal(perfect.status, 'pass');
    assert.equal(perfect.needsSettingUpdate, false);

    const withinTolerance = evaluateAbsentTimingTest(false, 4900);
    assert.equal(withinTolerance.status, 'pass');

    const slowWarning = evaluateAbsentTimingTest(false, 6200);
    assert.equal(slowWarning.status, 'warning');
    assert.equal(slowWarning.needsSettingUpdate, true);

    const failPresent = evaluateAbsentTimingTest(true, 5140);
    assert.equal(failPresent.status, 'fail');
  });

  it('evaluateLivePhoneTest handles present latency buckets', () => {
    const fast = evaluateLivePhoneTest(true, 1100, 'Test Phone');
    assert.equal(fast.status, 'pass');

    const warning = evaluateLivePhoneTest(true, 3200, 'Test Phone');
    assert.equal(warning.status, 'warning');

    const absent = evaluateLivePhoneTest(false, 5140, '');
    assert.equal(absent.status, 'fail');
  });

  it('evaluateRepeatTest evaluates 5x checks and flags false-absent', () => {
    const perfect5 = [
      { present: true, durationMs: 1100 },
      { present: true, durationMs: 1200 },
      { present: true, durationMs: 1050 },
      { present: true, durationMs: 1150 },
      { present: true, durationMs: 1120 },
    ];
    const passRes = evaluateRepeatTest(perfect5);
    assert.equal(passRes.status, 'pass');
    assert.equal(passRes.falseAbsentDetected, false);

    const withFalseAbsent = [
      { present: true, durationMs: 1100 },
      { present: false, durationMs: 400 }, // fast absent (< 1s)
      { present: true, durationMs: 1050 },
    ];
    const failRes = evaluateRepeatTest(withFalseAbsent);
    assert.equal(failRes.status, 'fail');
    assert.equal(failRes.falseAbsentDetected, true);
  });
});
