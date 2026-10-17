import { parityChecks } from './metrics.mjs';

// BJS-487's 48 kHz Chrome receipt at bdd3b0cb, with RMS divided by the
// fixed .85 worklet scalar. These are pinned observations, never rebaselined
// from the render under test. Entries are MIDI pitch: [native/live RMS, shape].
const baseline = {
  square: {
    36: [0.998373, 0.000098],
    48: [0.998924, 0.000402],
    57: [0.999672, 0.001141],
    60: [1.000008, 0.001613],
    69: [1.001503, 0.004540],
    72: [1.002175, 0.006397],
    81: [1.005291, 0.017670],
    84: [1.006657, 0.024613],
    93: [1.013118, 0.055330],
    96: [1.016229, 0.064367],
    105: [1.037517, 0.084734],
  },
  sawtooth: {
    36: [0.993874, 0.000193],
    48: [0.998817, 0.000608],
    57: [1.000996, 0.001722],
    60: [1.007438, 0.002432],
    69: [1.003782, 0.006849],
    72: [1.002284, 0.009648],
    81: [1.009557, 0.026587],
    84: [1.012017, 0.036979],
    93: [1.021854, 0.080994],
    96: [1.027605, 0.087514],
    105: [1.050201, 0.112350],
  },
};

// Corrected run: low saw notes retain a native/polyBLEP carrier-phase
// difference in the 20 ms energy windows (only ~1.3 cycles at C2).
// Bound those two observations + .01; every other envelope keeps .06.
const sawEnvelopeError = { 36: .186580, 48: .095785 };

export function oscillatorParityChecks(metrics, sound, pitch) {
  const checks = parityChecks(metrics);
  if (sound !== 'square' && sound !== 'sawtooth') return checks;
  const expected = baseline[sound][pitch];
  // An unmeasured pitch must not silently inherit a permissive exception.
  if (!expected) return { ...checks, measuredPitch: false };
  const [rmsRatio, shape] = expected;
  const fundamentalRatio = metrics.actualHarmonics[0] / metrics.referenceHarmonics[0];
  return {
    ...checks,
    // One percentage point around each corrected measured RMS; retain the
    // original onset, offset and pitch limits. Shape gets .005 room.
    rms: Math.abs(metrics.rmsRatio - rmsRatio) <= .01,
    envelope: metrics.envelopeError <= (sound === 'sawtooth' && sawEnvelopeError[pitch]
      ? sawEnvelopeError[pitch] + .01 : .06),
    spectrum: metrics.harmonicError <= shape + .005,
    fundamental: fundamentalRatio >= .98 && fundamentalRatio <= 1.03,
  };
}
