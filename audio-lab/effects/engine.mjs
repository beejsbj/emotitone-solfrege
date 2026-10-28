import { EffectOrbit, EngineAudioGraph } from '../../src/audio/effects';
import { LiveAudioCore } from '../../src/audio/live/core';
import { createLiveWorklet } from '../../src/audio/live/bridge';
import { createLiveShapingChain } from '../../src/audio/liveShaping';
import * as runtime from '../../src/services/audioRuntime';
import { WET_CUT_DELAY_SECONDS } from '../../src/audio/voicePolicy';

const RATE = 48000;
const open = { cutoff: 12000, resonance: 0, room: 0, delay: 0 };
function source(context, pcm) {
  const node = context.createBufferSource();
  node.buffer = context.createBuffer(1, pcm.length, RATE);
  node.buffer.getChannelData(0).set(pcm);
  node.start();
  return node;
}
const seed = () => {
  let state = 486;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
};
function instrument(data) {
  return { kind: 'sample-bank', instrumentId: 'fixture', zoneSelection: 'nearest-root',
    gain: 1, attack: 0, decay: 0, sustain: 1, release: 0,
    zones: [{ id: 'fixture', rootMidi: 69, sampleRate: RATE, channels: [data] }] };
}
// The echo and room impulses play at half level. A unit impulse is over the
// worklet's output limiter's ceiling (BJS-590), so the limiter would scale it
// (by 0.9958), and these checks compare the buses' own levels: the delay
// sample for sample, the room within 1 dB per 100 ms window. At half level the
// limiter is idle and the buses are measured alone. Both buses are linear, so
// the frozen references compare at half scale (exactly so for the delay).
const IMPULSE_VELOCITY = .5;
function workletPcm(data, shape, velocity) {
  const core = new LiveAudioCore(RATE, () => {});
  core.command({ type: 'prepare', requestId: 1, instrument: instrument(data) }, 0);
  core.command({ type: 'effects', shaping: shape }, 0);
  core.command({ type: 'press', ownerId: 'note', notes: [{ pitch: 69, instrumentId: 'fixture', velocity }] }, 0);
  const outputs = Array.from({ length: 3 }, () => [new Float32Array(data.length), new Float32Array(data.length)]);
  core.render(outputs[0], 0, outputs[1], outputs[2]);
  return outputs;
}
async function render(data, shape, realProcessor = false, velocity = undefined) {
  const context = new OfflineAudioContext(2, data.length, RATE);
  const graph = new EngineAudioGraph(context), orbit = graph.getOrbit(2);
  if (shape.delay) {
    orbit.getDelay(.25, .3, .05);
    const input = orbit.delayInput;
    await graph.rebuildEffects();
    if (orbit.delayInput !== input) throw new Error('Rebuild replaced the connected send input');
  }
  if (shape.room) {
    const random = Math.random;
    Math.random = seed();
    try { await orbit.ready(); } finally { Math.random = random; }
  }
  let worklet, chain;
  if (realProcessor) {
    chain = createLiveShapingChain(context, graph.master, () => orbit);
    let planned;
    const planReady = new Promise(resolve => { planned = resolve; });
    worklet = await createLiveWorklet(context, chain.input, { onEvent() {},
      onPlan(events) { if (events.length) planned(); },
      onError(error) { throw error; },
    }, chain);
    // prepare() transfers the PCM to the worklet (BJS-488); keep the fixture for the next render.
    const prepared = worklet.prepare(instrument(data.slice()));
    await prepared;
    worklet.effects(shape);
    worklet.press('note', [{ pitch: 69, instrumentId: 'fixture', velocity }]);
    await planReady;
    const buffer = await context.startRendering();
    await prepared;
    worklet.dispose(); chain.dispose(); graph.reset(); graph.master.disconnect();
    return Array.from({ length: 2 }, (_, c) => Array.from(buffer.getChannelData(c)));
  }
  const outputs = workletPcm(data, shape, velocity);
  // Capture only wet buses here, so delay and room match the frozen wet renders.
  if (shape.room) source(context, outputs[1][0]).connect(orbit.roomInput);
  if (shape.delay) source(context, outputs[2][0]).connect(orbit.delayInput);
  if (!shape.room && !shape.delay) source(context, outputs[0][0]).connect(graph.master);
  const buffer = await context.startRendering();
  graph.reset(); graph.master.disconnect();
  return Array.from({ length: 2 }, (_, c) => Array.from(buffer.getChannelData(c)));
}
/**
 * Stop All's cut (BJS-598): what the shared room and delay hold is faded over
 * 10 ms when the cut lands mid-render, and rings on after a plain stop. A hit
 * at 50 ms feeds both buses (its first echo is at 300 ms, the next at 550 ms);
 * the stop is at 400 ms; a new hit at 600 ms feeds the room afterwards.
 */
const TAILS = { hit: .05, stop: .4, again: .6, length: .9 };
async function renderTails(cut) {
  const frames = Math.round(TAILS.length * RATE);
  const context = new OfflineAudioContext(2, frames, RATE);
  const graph = new EngineAudioGraph(context), orbit = graph.getOrbit(2);
  orbit.getDelay(.25, .3, 0);
  const random = Math.random;
  Math.random = seed();
  try { await orbit.ready(); } finally { Math.random = random; }
  const hit = new Float32Array(frames);
  hit[Math.round(TAILS.hit * RATE)] = .5;
  source(context, hit).connect(orbit.roomInput);
  source(context, hit).connect(orbit.delayInput);
  // New sound after the stop goes in where the app sends it: the same inputs.
  const later = context.createBufferSource();
  later.buffer = context.createBuffer(1, 1, RATE);
  later.buffer.getChannelData(0)[0] = .5;
  later.connect(orbit.roomInput);
  later.start(TAILS.again);
  const stopped = context.suspend(TAILS.stop).then(() => {
    if (cut) orbit.cutTails(.01, TAILS.stop);
    return context.resume();
  });
  const buffer = await context.startRendering();
  await stopped;
  graph.reset(); graph.master.disconnect();
  const pcm = buffer.getChannelData(0);
  const at = seconds => Math.round(seconds * RATE);
  const peak = (from, to) => { let loudest = 0; for (let i = at(from); i < at(to); i++) loudest = Math.max(loudest, Math.abs(pcm[i])); return loudest; };
  const move = (from, to) => { let largest = 0; for (let i = at(from) + 1; i < at(to); i++) largest = Math.max(largest, Math.abs(pcm[i] - pcm[i - 1])); return largest; };
  return {
    beforeStop: peak(TAILS.stop - .05, TAILS.stop),
    // From 11 ms after the stop until the new hit.
    afterStop: peak(TAILS.stop + .011, TAILS.again),
    echoAfterStop: peak(.55 - .005, .55 + .005),
    newHit: peak(TAILS.again, TAILS.again + .2),
    moveBefore: move(TAILS.stop - .05, TAILS.stop),
    moveAtStop: move(TAILS.stop - .001, TAILS.stop + .011),
  };
}
/** One held A4 for four bars as a transport member, at half level, with room and delay sends. */
function heldMember() {
  const one = (Type, value) => Type.from([value]);
  return { id: 'held', generation: 1, instrumentId: 'fixture', lengthBars: 4,
    shaping: { cutoff: 12000, resonance: 0, room: .5, delay: .25 },
    begin: one(Float64Array, 0), gate: one(Float64Array, 3.9), pitch: one(Float32Array, 69), velocity: one(Float32Array, .5),
    attack: one(Float32Array, .005), decay: one(Float32Array, 0), sustain: one(Float32Array, 1), release: one(Float32Array, .01),
    pitchStart: one(Uint32Array, 0), pitchCount: one(Uint32Array, 0), pitchTime: new Float32Array(0), pitchCents: new Float32Array(0),
    gainStart: one(Uint32Array, 0), gainCount: one(Uint32Array, 0), gainTime: new Float32Array(0), gainValue: new Float32Array(0) };
}
/**
 * Stop All's cut with a note sounding through it, on the real worklet and the
 * app's live room and delay. The cut lands at 400 ms; the buses are swapped
 * `swapAfter` seconds later. Once the cut has settled, nothing may sound: not
 * the note, not its room tail, not its echo at +250 ms.
 */
async function renderCutVoice(swapAfter) {
  const frames = Math.round(1.2 * RATE);
  const context = new OfflineAudioContext(2, frames, RATE);
  const graph = new EngineAudioGraph(context), orbit = graph.getOrbit(2);
  const random = Math.random;
  Math.random = seed();
  try { await orbit.ready(); } finally { Math.random = random; }
  const chain = createLiveShapingChain(context, graph.master, () => orbit);
  const receipts = new Map();
  const answered = id => new Promise(resolve => receipts.set(id, resolve));
  const worklet = await createLiveWorklet(context, chain.input, { onEvent() {}, onPlan() {},
    onTransport(response) { if (response.type === 'transport-applied') receipts.get(response.requestId)?.(); },
    onError(error) { throw error; } }, chain);
  const tone = new Float32Array(2 * RATE);
  for (let i = 0; i < tone.length; i++) tone[i] = Math.sin(2 * Math.PI * 440 * i / RATE);
  await worklet.prepare(instrument(tone));
  const started = answered(2);
  worklet.transport({ type: 'transport-change', requestId: 1, boundary: 'immediate',
    change: { type: 'join', member: { table: heldMember(), offsetBars: 0, rate: 1, muted: false } } });
  worklet.transport({ type: 'transport-start', requestId: 2, run: 1, bpm: 120 });
  await started;
  const cutAt = .4;
  const quantum = 128 / RATE;
  const swapAt = Math.ceil((cutAt + swapAfter) / quantum) * quantum;
  context.suspend(cutAt).then(() => {
    worklet.transport({ type: 'transport-stop', requestId: 3, cut: true });
    if (!swapAfter) orbit.cutTails(.01, cutAt);
    return context.resume();
  });
  if (swapAfter) context.suspend(swapAt).then(() => { orbit.cutTails(.01, swapAt); return context.resume(); });
  const buffer = await context.startRendering();
  worklet.dispose(); chain.dispose(); graph.reset(); graph.master.disconnect();
  const pcm = buffer.getChannelData(0);
  const peak = (from, to) => { let loudest = 0; for (let i = Math.round(from * RATE); i < Math.round(to * RATE); i++) loudest = Math.max(loudest, Math.abs(pcm[i])); return loudest; };
  // Settled: past the swap's own 10 ms fade (and the voices' 10 ms release), with a quantum to spare.
  const settled = Math.max(cutAt, swapAt) + .01 + 2 * quantum;
  return { beforeCut: peak(cutAt - .05, cutAt), afterSettled: peak(settled, 1.2), echoWindow: peak(cutAt + .24, cutAt + .27) };
}
window.runEngineEffects = async () => {
  const tails = { plain: await renderTails(false), cut: await renderTails(true),
    cutVoice: await renderCutVoice(WET_CUT_DELAY_SECONDS), cutVoiceSwappedAtOnce: await renderCutVoice(0) };
  const echo = new Float32Array(96000); echo[2400] = 1;
  const delay = await render(echo, { ...open, delay: .6 }, false, IMPULSE_VELOCITY);
  const impulse = new Float32Array(144000); impulse[0] = 1;
  const room = await render(impulse, { ...open, room: 1 }, false, IMPULSE_VELOCITY);
  const filter = await render(impulse, { ...open, cutoff: 1000, resonance: 10 }, true);
  const processorDelay = await render(echo, { ...open, delay: .6 }, true, IMPULSE_VELOCITY);

  // Exercise the production owner, never a mock: one app context, master and
  // live orbit survive initialization, and preparation issues no resume.
  const ownedContext = runtime.getAudioContext();
  const master = runtime.getMasterGain();
  const orbit = runtime.getLiveOrbit();
  const before = ownedContext.state;
  let resumes = 0;
  const resume = ownedContext.resume.bind(ownedContext);
  ownedContext.resume = () => { resumes++; return resume(); };
  await Promise.all([runtime.initializeAudio(), runtime.initializeAudio()]);
  const ownership = { context: runtime.getAudioContext() === ownedContext,
    master: runtime.getMasterGain() === master && master.context === ownedContext,
    graph: orbit instanceof EffectOrbit,
    orbit: runtime.getLiveOrbit() === orbit,
    preparationResumes: resumes, before, after: ownedContext.state };
  await ownedContext.close();
  // A rejected native IR render must leave initialization and dry/delay usable.
  const startRendering = OfflineAudioContext.prototype.startRendering;
  const warn = console.warn;
  let roomWarnings = 0, failedRenders = 0;
  OfflineAudioContext.prototype.startRendering = async () => { failedRenders++; throw new Error('IR render unavailable'); };
  console.warn = () => { roomWarnings++; };
  let degraded;
  try {
    await runtime.initializeAudio();
    await runtime.getLiveOrbit().ready();
    await runtime.getLiveOrbit().ready();
    const context = new OfflineAudioContext(2, echo.length, RATE);
    const graph = new EngineAudioGraph(context), orbit = graph.getOrbit(2);
    await orbit.ready(); await orbit.ready();
    source(context, echo).connect(graph.master);
    orbit.sendDelay(source(context, echo), .6); orbit.getDelay();
    orbit.sendReverb(source(context, echo), 1);
    OfflineAudioContext.prototype.startRendering = startRendering;
    const buffer = await context.startRendering();
    degraded = { pcm: Array.from(buffer.getChannelData(0)), roomWarnings, failedRenders };
    graph.reset(); graph.master.disconnect();
  } finally {
    OfflineAudioContext.prototype.startRendering = startRendering;
    console.warn = warn;
    await runtime.getAudioContext().close();
  }
  return { delay: delay[0], room, filter: filter[0], processorDelay: processorDelay[0], ownership, degraded, tails };
};
