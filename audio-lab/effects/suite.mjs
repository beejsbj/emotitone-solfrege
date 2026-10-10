import * as dough from 'superdough';
import { createFilter } from '../../node_modules/superdough/helpers.mjs';

function impulse(context, at = 0, frames = 1) {
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, frames, context.sampleRate);
  source.buffer.getChannelData(0)[0] = 1;
  source.start(at);
  return source;
}
function pcm(buffer) { return Array.from(buffer.getChannelData(0)); }
window.runEffectReference = async () => {
  const filters = [];
  for (const rate of [44100, 48000]) for (const cutoff of [200, 1000, 5000]) for (const q of [1, 10]) {
    const context = new OfflineAudioContext(1, 4096, rate);
    const { filter } = createFilter(context, 0, 1, { type: 'lowpass', frequency: cutoff, q });
    impulse(context, 0, context.length).connect(filter).connect(context.destination);
    filters.push({ rate, cutoff, q, pcm: pcm(await context.startRendering()) });
  }
  const context = new OfflineAudioContext(2, 96000, 48000);
  dough.setAudioContext(context);
  dough.setSuperdoughAudioController(null);
  const orbit = dough.getSuperdoughAudioController().getOrbit(0, [0, 1]);
  orbit.getDelay(.25, .3, .05);
  orbit.sendDelay(impulse(context, .05), .6);
  const delay = pcm(await context.startRendering());
  const roomContext = new OfflineAudioContext(2, 144000, 48000);
  dough.setAudioContext(roomContext);
  dough.setSuperdoughAudioController(null);
  const roomOrbit = dough.getSuperdoughAudioController().getOrbit(0, [0, 1]);
  const reverb = roomOrbit.getReverb();
  while (!reverb.buffer) await new Promise(resolve => setTimeout(resolve, 5));
  roomOrbit.sendReverb(impulse(roomContext), 1);
  const room = await roomContext.startRendering();
  return { filters, delay, room: Array.from({ length: 2 }, (_, c) => Array.from(room.getChannelData(c))),
    browser: navigator.userAgent };
};
