import { LiveAudioCore } from '../../src/audio/live/core';
import { createLiveWorklet } from '../../src/audio/live/bridge';
import * as runtime from '../../src/services/audioRuntime';

const RATE = 48000;
const QUANTUM = 128;
const open = { cutoff: 12000, resonance: 0, room: 0, delay: 0 };
function instrument(data, gain = 1) {
  return { kind: 'sample-bank', instrumentId: 'fixture', zoneSelection: 'nearest-root',
    gain, attack: 0, decay: 0, sustain: 1, release: 0,
    zones: [{ id: 'fixture', rootMidi: 69, sampleRate: RATE, channels: [data] }] };
}
// The echo and room impulses play at half level. A unit impulse is over the
// worklet's output limiter's ceiling (BJS-590), so the limiter would scale it
// (by 0.9958), and these checks compare the room and echo's own levels: the
// echo sample for sample, the room per 100 ms window. At half level the
// limiter is idle and the effects are measured alone. Both are linear, so the
// frozen references compare at half scale (exactly so for the echo).
const IMPULSE_VELOCITY = .5;

/** The render core in the page, one quantum at a time, as the processor renders it. */
function corePcm(data, shape, velocity) {
  const core = new LiveAudioCore(RATE, () => {});
  core.command({ type: 'prepare', requestId: 1, instrument: instrument(data) }, 0);
  core.command({ type: 'effects', shaping: shape }, 0);
  core.command({ type: 'press', ownerId: 'note', notes: [{ pitch: 69, instrumentId: 'fixture', velocity }] }, 0);
  const pcm = [new Float32Array(data.length), new Float32Array(data.length)];
  const quantum = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
  for (let frame = 0; frame < data.length; frame += QUANTUM) {
    core.render(quantum, frame);
    for (let c = 0; c < 2; c++) pcm[c].set(quantum[c].subarray(0, Math.min(QUANTUM, data.length - frame)), frame);
  }
  return pcm.map(channel => Array.from(channel));
}

/** The app's graph in an offline context: the real processor and bridge into a master, into the destination. */
async function offlineWorklet(frames, callbacks = {}) {
  const context = new OfflineAudioContext(2, frames, RATE);
  const master = new GainNode(context, { channelCount: 2, channelCountMode: 'explicit' });
  master.connect(context.destination);
  const worklet = await createLiveWorklet(context, master, { onEvent() {}, onPlan() {},
    onError(error) { throw error; }, ...callbacks });
  return { context, master, worklet };
}

async function processorPcm(data, shape, velocity) {
  let planned;
  const planReady = new Promise(resolve => { planned = resolve; });
  const { context, master, worklet } = await offlineWorklet(data.length, { onPlan(events) { if (events.length) planned(); } });
  // prepare() transfers the PCM to the worklet (BJS-488); keep the fixture for the next render.
  await worklet.prepare(instrument(data.slice()));
  worklet.effects(shape);
  worklet.press('note', [{ pitch: 69, instrumentId: 'fixture', velocity }]);
  await planReady;
  const buffer = await context.startRendering();
  worklet.dispose(); master.disconnect();
  return Array.from({ length: 2 }, (_, c) => Array.from(buffer.getChannelData(c)));
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
const tone = () => {
  const data = new Float32Array(2 * RATE);
  for (let i = 0; i < data.length; i++) data[i] = Math.sin(2 * Math.PI * 440 * i / RATE);
  return data;
};

/**
 * Stop All (BJS-598) on the real worklet, with a note sounding into the room
 * and echo through it: a held member, stopped at 400 ms, plainly or with the
 * cut. A short live note at 700 ms then feeds the room and echo afresh.
 */
const STOP = { at: .4, again: .7, length: 1.2 };
async function renderStop(cut) {
  const frames = Math.round(STOP.length * RATE);
  const receipts = new Map();
  const answered = id => new Promise(resolve => receipts.set(id, resolve));
  const { context, master, worklet } = await offlineWorklet(frames,
    { onTransport(response) { if (response.type === 'transport-applied') receipts.get(response.requestId)?.(); } });
  await worklet.prepare(instrument(tone(), .5));
  worklet.effects({ ...open, room: .5, delay: .25 });
  const started = answered(2);
  worklet.transport({ type: 'transport-change', requestId: 1, boundary: 'immediate',
    change: { type: 'join', member: { table: heldMember(), offsetBars: 0, rate: 1, muted: false } } });
  worklet.transport({ type: 'transport-start', requestId: 2, run: 1, bpm: 120 });
  await started;
  context.suspend(STOP.at).then(() => {
    worklet.transport({ type: 'transport-stop', requestId: 3, ...(cut ? { cut: true } : {}) });
    return context.resume();
  });
  context.suspend(STOP.again).then(() => { worklet.press('again', [{ pitch: 69, instrumentId: 'fixture' }]); return context.resume(); });
  context.suspend(STOP.again + .05).then(() => { worklet.release('again'); return context.resume(); });
  const buffer = await context.startRendering();
  worklet.dispose(); master.disconnect();
  const pcm = buffer.getChannelData(0);
  const at = seconds => Math.round(seconds * RATE);
  const peak = (from, to) => { let loudest = 0; for (let i = at(from); i < at(to); i++) loudest = Math.max(loudest, Math.abs(pcm[i])); return loudest; };
  const move = (from, to) => { let largest = 0; for (let i = at(from) + 1; i < at(to); i++) largest = Math.max(largest, Math.abs(pcm[i] - pcm[i - 1])); return largest; };
  // Settled: the notes' 10 ms release and the cut's 10 ms fade, with two quanta for the message to arrive.
  const settled = STOP.at + .01 + 2 * QUANTUM / RATE;
  return {
    beforeStop: peak(STOP.at - .05, STOP.at),
    afterStop: peak(settled, STOP.again),
    // The held note's echo, still coming round for 250 ms after the stop.
    echoAfterStop: peak(STOP.at + .1, STOP.at + .25),
    // The short note at 700 ms has ended by 760 ms: what follows is its own room and echo.
    newTail: peak(STOP.again + .06, STOP.length),
    moveBefore: move(STOP.at - .05, STOP.at),
    moveAtStop: move(STOP.at - .001, settled),
  };
}

/**
 * The destination's peak with chords loud enough that the dry mix alone sits
 * just under the limiter's ceiling, at each room and delay setting.
 */
async function renderPeak(room, delay, feedback) {
  const frames = 5 * RATE;
  const chord = new Float32Array(2 * RATE);
  for (let i = 0; i < chord.length; i++) {
    let value = 0;
    for (let h = 1; h <= 8; h++) value += Math.sin(2 * Math.PI * 220 * h * i / RATE) / h;
    chord[i] = value * .135;
  }
  const { context, master, worklet } = await offlineWorklet(frames);
  await worklet.prepare({ ...instrument(chord), release: .3 });
  worklet.echo(.25, feedback);
  worklet.effects({ ...open, room, delay });
  for (let beat = 0; beat < 8; beat++) {
    const at = beat * .5;
    const press = () => { for (const pitch of [57, 61, 64, 69]) worklet.press(`${beat}-${pitch}`, [{ pitch, instrumentId: 'fixture' }]); };
    if (beat === 0) press();
    else context.suspend(at).then(() => { press(); return context.resume(); });
    context.suspend(at + .4).then(() => { for (const pitch of [57, 61, 64, 69]) worklet.release(`${beat}-${pitch}`); return context.resume(); });
  }
  const buffer = await context.startRendering();
  worklet.dispose(); master.disconnect();
  let peak = 0;
  for (let c = 0; c < 2; c++) for (const value of buffer.getChannelData(c)) peak = Math.max(peak, Math.abs(value));
  return { room, delay, feedback, peak };
}

window.runEngineEffects = async () => {
  const tails = { plain: await renderStop(false), cut: await renderStop(true) };
  const echo = new Float32Array(96000); echo[2400] = 1;
  const delay = corePcm(echo, { ...open, delay: .6 }, IMPULSE_VELOCITY);
  const processorDelay = await processorPcm(echo, { ...open, delay: .6 }, IMPULSE_VELOCITY);
  const impulse = new Float32Array(144000); impulse[0] = 1;
  const room = corePcm(impulse, { ...open, room: 1 }, IMPULSE_VELOCITY);
  const processorRoom = await processorPcm(impulse, { ...open, room: 1 }, IMPULSE_VELOCITY);
  const filter = await processorPcm(impulse, { ...open, cutoff: 1000, resonance: 10 });
  const peaks = [];
  for (const [r, d, f] of [[0, 0, .3], [1, 0, .3], [0, 1, .3], [1, 1, .3], [1, 1, .98]]) peaks.push(await renderPeak(r, d, f));

  // Exercise the production owner, never a mock: one app context and master
  // survive initialization, and preparation issues no resume.
  const ownedContext = runtime.getAudioContext();
  const master = runtime.getMasterGain();
  const before = ownedContext.state;
  let resumes = 0;
  const resume = ownedContext.resume.bind(ownedContext);
  ownedContext.resume = () => { resumes++; return resume(); };
  await Promise.all([runtime.initializeAudio(), runtime.initializeAudio()]);
  const ownership = { context: runtime.getAudioContext() === ownedContext,
    master: runtime.getMasterGain() === master && master.context === ownedContext,
    preparationResumes: resumes, before, after: ownedContext.state };
  await ownedContext.close();
  return { delay: delay[0], processorDelay: processorDelay[0], room, processorRoom, filter: filter[0], peaks, ownership, tails };
};
