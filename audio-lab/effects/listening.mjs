import reference from './fixtures/reference.json';
import { EngineAudioGraph } from '../../src/audio/effects';
import { LiveAudioCore } from '../../src/audio/live/core';

const RATE = 48000, FRAMES = RATE * 3;
function decode(encoded) {
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  return new Float32Array(bytes.buffer);
}
function sample() {
  const data = new Float32Array(FRAMES);
  // Repeat a fixed A4 harmonic pluck three times. A common sample eliminates
  // oscillator/envelope differences from this effects A/B.
  for (const onset of [.05, .55, 1.05]) for (let i = 0; i < RATE * .25; i++) {
    const t = i / RATE;
    const envelope = Math.min(1, t / .005) * Math.exp(-18 * t) * Math.max(0, 1 - t / .25);
    data[Math.round(onset * RATE) + i] += .3 * envelope * (
      Math.sin(2 * Math.PI * 440 * t) + .35 * Math.sin(2 * Math.PI * 1320 * t) + .15 * Math.sin(2 * Math.PI * 2200 * t));
  }
  return data;
}
function bufferSource(context, data) {
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, data.length, RATE);
  source.buffer.getChannelData(0).set(data); source.start();
  return source;
}
function frozenConvolution(context, data, impulse) {
  const convolver = context.createConvolver(); convolver.normalize = false;
  const buffer = context.createBuffer(impulse.length, impulse[0].length, RATE);
  impulse.forEach((channel, i) => buffer.getChannelData(i).set(channel));
  convolver.buffer = buffer;
  bufferSource(context, data).connect(convolver);
  return convolver;
}
async function before(data, shape) {
  const context = new OfflineAudioContext(2, shape.delay ? RATE * 2 : FRAMES, RATE);
  bufferSource(context, data).connect(context.destination);
  // Baselines use the already frozen impulse responses. Their captured sends
  // are divided out, leaving precisely the effect transfer function.
  if (shape.cutoff < 12000) {
    // Replace the bypass source with the frozen filter response.
    const filtered = new OfflineAudioContext(1, FRAMES, RATE);
    const fixture = reference.filters.find(f => f.rate === RATE && f.cutoff === shape.cutoff && f.q === shape.resonance);
    frozenConvolution(filtered, data, [decode(fixture.pcm)]).connect(filtered.destination);
    return [Array.from((await filtered.startRendering()).getChannelData(0))];
  }
  if (shape.room) frozenConvolution(context, data, reference.room.map(decode)).connect(context.destination);
  if (shape.delay) {
    const ir = decode(reference.delay);
    // The capture impulse starts at .05s; remove that leading time offset.
    const response = ir.slice(2400).map(value => value / .6 * shape.delay);
    frozenConvolution(context, data, [response]).connect(context.destination);
  }
  const buffer = await context.startRendering();
  return Array.from({ length: 2 }, (_, c) => Array.from(buffer.getChannelData(c)));
}
async function after(data, shape) {
  const context = new OfflineAudioContext(2, shape.delay ? RATE * 2 : FRAMES, RATE);
  const graph = new EngineAudioGraph(context), orbit = graph.getOrbit(2);
  if (shape.room) await orbit.ready();
  if (shape.delay) orbit.getDelay(.25, .3, .05);
  const core = new LiveAudioCore(RATE, () => {});
  core.command({ type: 'prepare', requestId: 1, instrument: { kind: 'sample-bank', instrumentId: 'pluck',
    zoneSelection: 'nearest-root', gain: 1, attack: 0, decay: 0, sustain: 1, release: 0,
    zones: [{ id: 'pluck', rootMidi: 69, sampleRate: RATE, channels: [data] }] } }, 0);
  core.command({ type: 'effects', shaping: shape }, 0);
  core.command({ type: 'press', ownerId: 'pluck', notes: [{ pitch: 69, instrumentId: 'pluck' }] }, 0);
  const outputs = Array.from({ length: 3 }, () => [new Float32Array(FRAMES), new Float32Array(FRAMES)]);
  core.render(outputs[0], 0, outputs[1], outputs[2]);
  bufferSource(context, outputs[0][0]).connect(graph.master);
  if (shape.room) bufferSource(context, outputs[1][0]).connect(orbit.roomInput);
  if (shape.delay) bufferSource(context, outputs[2][0]).connect(orbit.delayInput);
  const buffer = await context.startRendering();
  graph.reset(); graph.master.disconnect();
  return Array.from({ length: shape.cutoff < 12000 ? 1 : 2 }, (_, c) => Array.from(buffer.getChannelData(c)));
}
window.renderEffectListening = async () => {
  const data = sample();
  const clips = [];
  for (const [name, shape] of [
    ['filter', { cutoff: 1000, resonance: 10, room: 0, delay: 0 }],
    ['delay', { cutoff: 12000, resonance: 0, room: 0, delay: .6 }],
    ['room', { cutoff: 12000, resonance: 0, room: 1, delay: 0 }],
  ]) clips.push({ name, shape, before: await before(data, shape), after: await after(data, shape) });
  return { clips };
};
