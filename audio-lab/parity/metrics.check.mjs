import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparePcm, parityChecks } from './metrics.mjs';
import { oscillatorParityChecks } from './oscillator-bounds.mjs';

const rate = 48000;
function fixture({ phase = 0, gain = 1, end = .6, frequency = 440, harmonic = 0 } = {}) {
  return Float32Array.from({ length: rate }, (_, i) => {
    const t = i / rate;
    if (t < .05 || t >= end) return 0;
    return gain * (Math.sin(2 * Math.PI * frequency * t + phase) + harmonic * Math.sin(2 * Math.PI * frequency * 2 * t));
  });
}
const compare = actual => comparePcm(fixture(), actual, { rate, frequency: 440, steadyStart: .15, steadyEnd: .45 });

test('quarter-cycle phase shift is not reported as timbre or envelope mismatch', () => {
  assert.deepEqual(parityChecks(compare(fixture({ phase: Math.PI / 2 }))), {
    onset: true, offset: true, rms: true, envelope: true, spectrum: true, pitch: true,
  });
});
test('changed harmonic balance is detected despite matching fundamental', () => {
  assert.equal(parityChecks(compare(fixture({ harmonic: .3 }))).spectrum, false);
});
test('sustain .6 changes RMS and envelope', () => {
  const checks = parityChecks(compare(fixture({ gain: .6 })));
  assert.equal(checks.rms, false);
  assert.equal(checks.envelope, false);
});
test('extra sample tail and detuning are detected independently', () => {
  assert.equal(parityChecks(compare(fixture({ end: .9 }))).offset, false);
  assert.equal(parityChecks(compare(fixture({ frequency: 442 }))).pitch, false);
});

for (const sound of ['square', 'sawtooth']) {
  test(`${sound} divergence bounds reject .7 fundamental ratio in rendered PCM`, () => {
    // Use the highest measured pitch, whose accepted brightness drift is largest.
    const frequency = 3520;
    const reference = fixture({ frequency });
    const actual = fixture({ frequency, gain: .7 });
    const metrics = comparePcm(reference, actual, { rate, frequency, steadyStart: .15, steadyEnd: .45 });
    for (const pitch of [36, 48, 105]) {
      const checks = oscillatorParityChecks(metrics, sound, pitch);
      assert.equal(checks.fundamental, false);
      assert.equal(checks.rms, false);
      assert.equal(checks.envelope, false);
    }
  });
  test(`${sound} divergence bounds still reject new harmonic drift`, () => {
    const checks = oscillatorParityChecks(compare(fixture({ harmonic: .3 })), sound, 105);
    assert.equal(checks.fundamental, true);
    assert.equal(checks.spectrum, false);
  });
  test(`${sound} unmeasured pitches require an explicit baseline`, () => {
    assert.equal(oscillatorParityChecks(compare(fixture()), sound, 117).measuredPitch, false);
  });
}
