export function rms(pcm, from = 0, to = pcm.length) {
  let power = 0;
  for (let i = from; i < to; i++) power += pcm[i] ** 2;
  return Math.sqrt(power / Math.max(1, to - from));
}

export function bounds(pcm, rate, threshold = 1e-5) {
  const first = pcm.findIndex(value => Math.abs(value) > threshold);
  let last = pcm.length - 1;
  while (last >= 0 && Math.abs(pcm[last]) <= threshold) last--;
  return { onset: first < 0 ? null : first / rate, offset: last < 0 ? null : (last + 1) / rate };
}

// Magnitudes retain harmonic balance but discard oscillator phase. A quarter-
// cycle shift must not turn a matching sine/triangle into a timbre failure.
export function harmonics(pcm, rate, frequency, from, to, count = 12) {
  const first = Math.round(from * rate), end = Math.round(to * rate);
  // Above-Nyquist projections alias onto unrelated audible frequencies; only
  // compare representable harmonics when extending the pitch matrix upward.
  return Array.from({ length: Math.min(count, Math.ceil(rate / 2 / frequency) - 1) }, (_, harmonic) => {
    let real = 0, imaginary = 0, weight = 0;
    for (let i = first; i < end; i++) {
      const window = .5 - .5 * Math.cos(2 * Math.PI * (i - first) / (end - first - 1));
      const phase = 2 * Math.PI * frequency * (harmonic + 1) * i / rate;
      real += pcm[i] * window * Math.cos(phase);
      imaginary += pcm[i] * window * Math.sin(phase);
      weight += window;
    }
    return 2 * Math.hypot(real, imaginary) / weight;
  });
}

function estimatePitch(pcm, rate, frequency, from, to) {
  let peak = -Infinity, pitch = frequency;
  for (let hz = frequency - 4; hz <= frequency + 4; hz += .25) {
    const magnitude = harmonics(pcm, rate, hz, from, to, 1)[0];
    if (magnitude > peak) { peak = magnitude; pitch = hz; }
  }
  return pitch;
}

export function comparePcm(reference, actual, { rate, frequency, steadyStart, steadyEnd }) {
  const first = Math.round(steadyStart * rate), end = Math.round(steadyEnd * rate);
  const referenceRms = rms(reference, first, end), actualRms = rms(actual, first, end);
  const referenceHarmonics = harmonics(reference, rate, frequency, steadyStart, steadyEnd);
  const actualHarmonics = harmonics(actual, rate, frequency, steadyStart, steadyEnd);
  const normalized = values => values.map(value => value / Math.max(1e-12, values[0]));
  const a = normalized(referenceHarmonics), b = normalized(actualHarmonics);
  const harmonicError = Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0));
  const referenceBounds = bounds(reference, rate), actualBounds = bounds(actual, rate);
  // Envelope comparison uses local energy, never pointwise carrier samples.
  const window = Math.round(rate * .02);
  let squaredEnvelopeError = 0, squaredEnvelopeReference = 0;
  for (let i = 0; i + window <= reference.length; i += window) {
    const x = rms(reference, i, i + window), y = rms(actual, i, i + window);
    squaredEnvelopeError += (x - y) ** 2;
    squaredEnvelopeReference += x * x;
  }
  return {
    referenceBounds, actualBounds, referenceRms, actualRms,
    rmsRatio: actualRms / Math.max(referenceRms, 1e-12),
    envelopeError: Math.sqrt(squaredEnvelopeError / Math.max(squaredEnvelopeReference, 1e-12)),
    harmonicError, referenceHarmonics, actualHarmonics,
    referencePitch: estimatePitch(reference, rate, frequency, steadyStart, steadyEnd),
    actualPitch: estimatePitch(actual, rate, frequency, steadyStart, steadyEnd),
  };
}

export function parityChecks(metrics) {
  const difference = key => metrics.actualBounds[key] === null || metrics.referenceBounds[key] === null
    ? Infinity : Math.abs(metrics.actualBounds[key] - metrics.referenceBounds[key]);
  return {
    onset: difference('onset') <= .003,
    offset: difference('offset') <= .003,
    rms: Math.abs(metrics.rmsRatio - 1) <= .05,
    envelope: metrics.envelopeError <= .06,
    spectrum: metrics.harmonicError <= .08,
    pitch: Math.abs(metrics.actualPitch - metrics.referencePitch) <= .5,
  };
}
