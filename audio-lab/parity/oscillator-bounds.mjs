import { parityChecks } from './metrics.mjs';

// BJS-487's 48 kHz Chrome receipt at bdd3b0cb. BJS-485 removed the fixed .85
// worklet scalar (patterns now render on the worklet too), so each RMS entry
// is the BJS-487 pinned value times .85: the unscaled polyBLEP level that
// receipt measured. Shape is unchanged by a scalar. These are pinned
// observations, never rebaselined from the render under test.
// Entries are MIDI pitch: [native/live RMS, shape].
const baseline = {
  square: {
    36: [0.848617, 0.000098],
    48: [0.849085, 0.000402],
    57: [0.849721, 0.001141],
    60: [0.850007, 0.001613],
    69: [0.851278, 0.004540],
    72: [0.851849, 0.006397],
    81: [0.854497, 0.017670],
    84: [0.855658, 0.024613],
    93: [0.861150, 0.055330],
    96: [0.863795, 0.064367],
    105: [0.881889, 0.084734],
  },
  sawtooth: {
    36: [0.844793, 0.000193],
    48: [0.848994, 0.000608],
    57: [0.850847, 0.001722],
    60: [0.856322, 0.002432],
    69: [0.853215, 0.006849],
    72: [0.851941, 0.009648],
    81: [0.858123, 0.026587],
    84: [0.860214, 0.036979],
    93: [0.868576, 0.080994],
    96: [0.873464, 0.087514],
    105: [0.892671, 0.112350],
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
    // One percentage point around each measured RMS; retain the
    // original onset, offset and pitch limits. Shape gets .005 room.
    rms: Math.abs(metrics.rmsRatio - rmsRatio) <= .01,
    envelope: metrics.envelopeError <= (sound === 'sawtooth' && sawEnvelopeError[pitch]
      ? sawEnvelopeError[pitch] + .01 : .06),
    spectrum: metrics.harmonicError <= shape + .005,
    // The original [.98, 1.03] native/live window, times .85 like the RMS.
    fundamental: fundamentalRatio >= .98 * .85 && fundamentalRatio <= 1.03 * .85,
  };
}
