import { EngineAudioGraph } from '../../src/audio/effects';
import { LiveAudioCore } from '../../src/audio/live/core';
import { createLiveWorklet } from '../../src/audio/live/bridge';
import { createLiveShapingChain } from '../../src/audio/liveShaping';
import * as runtime from '../../src/services/audioRuntime';
import * as dough from 'superdough';

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
function workletPcm(data, shape) {
  const core = new LiveAudioCore(RATE, () => {});
  core.command({ type: 'prepare', requestId: 1, instrument: instrument(data) }, 0);
  core.command({ type: 'effects', shaping: shape }, 0);
  core.command({ type: 'press', ownerId: 'note', notes: [{ pitch: 69, instrumentId: 'fixture' }] }, 0);
  const outputs = Array.from({ length: 3 }, () => [new Float32Array(data.length), new Float32Array(data.length)]);
  core.render(outputs[0], 0, outputs[1], outputs[2]);
  return outputs;
}
async function render(data, shape, realProcessor = false) {
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
    const prepared = worklet.prepare(instrument(data));
    await prepared;
    worklet.effects(shape);
    worklet.press('note', [{ pitch: 69, instrumentId: 'fixture' }]);
    await planReady;
    const buffer = await context.startRendering();
    await prepared;
    worklet.dispose(); chain.dispose(); graph.reset(); graph.master.disconnect();
    return Array.from({ length: 2 }, (_, c) => Array.from(buffer.getChannelData(c)));
  }
  const outputs = workletPcm(data, shape);
  // Capture only wet buses here, so delay and room match the frozen wet renders.
  if (shape.room) source(context, outputs[1][0]).connect(orbit.roomInput);
  if (shape.delay) source(context, outputs[2][0]).connect(orbit.delayInput);
  if (!shape.room && !shape.delay) source(context, outputs[0][0]).connect(graph.master);
  const buffer = await context.startRendering();
  graph.reset(); graph.master.disconnect();
  return Array.from({ length: 2 }, (_, c) => Array.from(buffer.getChannelData(c)));
}
window.runEngineEffects = async () => {
  const echo = new Float32Array(96000); echo[2400] = 1;
  const delay = await render(echo, { ...open, delay: .6 });
  const impulse = new Float32Array(144000); impulse[0] = 1;
  const room = await render(impulse, { ...open, room: 1 });
  const filter = await render(impulse, { ...open, cutoff: 1000, resonance: 10 }, true);
  const processorDelay = await render(echo, { ...open, delay: .6 }, true);

  // Exercise the production owner with the real installed fallback, never a mock.
  const ownedContext = runtime.getAudioContext();
  const master = runtime.getMasterGain();
  const before = ownedContext.state;
  let resumes = 0;
  const resume = ownedContext.resume.bind(ownedContext);
  ownedContext.resume = () => { resumes++; return resume(); };
  await Promise.all([runtime.initializeAudio(), runtime.initializeAudio()]);
  const ownership = { context: dough.getAudioContext() === ownedContext,
    master: dough.getSuperdoughAudioController().output.destinationGain === master,
    graph: dough.getSuperdoughAudioController() instanceof EngineAudioGraph,
    orbit: dough.getSuperdoughAudioController().getOrbit(2) === runtime.getLiveOrbit(),
    preparationResumes: resumes, before, after: ownedContext.state };
  await ownedContext.close();
  return { delay: delay[0], room, filter: filter[0], processorDelay: processorDelay[0], ownership };
};
