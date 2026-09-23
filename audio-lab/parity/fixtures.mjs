/** Deterministic mono PCM16 fixture, shared by the browser and local font server. */
export function createFixtureWav(rate = 48000) {
  const frames = rate * 2, bytes = new ArrayBuffer(44 + frames * 2), view = new DataView(bytes);
  const text = (at, value) => [...value].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * 2, true);
  for (let i = 0; i < frames; i++) {
    const phase = 2 * Math.PI * 440 * i / rate;
    const value = .35 * Math.sin(phase) + .08 * Math.sin(phase * 2 + .3) + .04 * Math.sin(phase * 3);
    view.setInt16(44 + i * 2, Math.round(value * 32767), true);
  }
  return bytes;
}

export function soundfontZone(encodedWav) {
  return { keyRangeLow: 0, keyRangeHigh: 127, originalPitch: 6900, coarseTune: 0, fineTune: 0,
    // .1s to .5s contains exactly 176 fundamental periods; there is no seam
    // discontinuity. Long gates exercise both renderers' real loop handling.
    loopStart: 4800, loopEnd: 24000, sampleRate: 48000, file: encodedWav };
}
