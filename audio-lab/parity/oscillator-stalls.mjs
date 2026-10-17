import { createLiveWorklet } from '../../src/audio/live/bridge';
import { prepareLiveInstrument } from '../../src/services/preparedLiveInstrument';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Capture production worklet PCM while the browser main thread cannot send commands. */
export async function runOscillatorStalls() {
  const checks = [], evidence = [];
  for (const sound of ['square', 'sawtooth']) {
    const context = new AudioContext({ sampleRate: 48000 });
    let renderer, capture;
    const url = URL.createObjectURL(new Blob([`
      class Capture extends AudioWorkletProcessor {
        process(inputs, outputs) {
          const pcm = inputs[0]?.[0];
          if (pcm) this.port.postMessage({ frame: currentFrame, pcm: pcm.slice() });
          outputs[0]?.forEach(channel => channel.fill(0));
          return true;
        }
      }
      registerProcessor('oscillator-capture', Capture);
    `], { type: 'application/javascript' }));
    try {
      await context.audioWorklet.addModule(url);
      capture = new AudioWorkletNode(context, 'oscillator-capture');
      capture.connect(context.destination);
      const blocks = [], events = [];
      capture.port.onmessage = ({ data }) => blocks.push(data);
      renderer = await createLiveWorklet(context, capture, { onEvent: event => events.push(event) });
      const prepared = await prepareLiveInstrument(context, sound);
      if (prepared.kind !== 'oscillator') throw new Error(`Not a worklet oscillator: ${sound}`);
      await renderer.prepare(prepared);
      await context.resume();
      renderer.configure({ style: 'repeat', bpm: 120, rate: 16 });
      renderer.press('held', [{ pitch: 69, instrumentId: sound }]);
      await wait(200);
      const stallStart = context.currentTime, wallStart = performance.now();
      while (performance.now() - wallStart < 300) { /* deliberate UI-thread stall */ }
      const stallEnd = context.currentTime, wallStallMs = performance.now() - wallStart;
      await wait(550);
      const releasedAt = context.currentTime;
      renderer.release('held');
      await wait(150);
      const attacks = events.filter(event => event.phase === 'attack' && event.at + .075 <= releasedAt);
      const rate = context.sampleRate;
      const pulses = attacks.map(event => {
        const from = Math.round((event.at + .01) * rate), to = Math.round((event.at + .075) * rate);
        let energy = 0, frames = 0;
        for (const block of blocks) for (let i = Math.max(0, from - block.frame); i < Math.min(block.pcm.length, to - block.frame); i++) {
          energy += block.pcm[i] ** 2; frames++;
        }
        return { at: event.at, rms: Math.sqrt(energy / Math.max(1, frames)), frames, expectedFrames: to - from };
      });
      const maxGridErrorSeconds = Math.max(...attacks.map((event, i) => Math.abs(event.at - attacks[0].at - i * .125)));
      const stalledPulses = pulses.filter(pulse => pulse.at >= stallStart && pulse.at + .075 <= stallEnd);
      checks.push({ name: `${sound} repeats audibly across 300 ms main-thread stall`,
        passed: attacks.length >= 7 && stalledPulses.length >= 1 && maxGridErrorSeconds < 1 / rate
          && pulses.every(pulse => pulse.frames === pulse.expectedFrames && pulse.rms > .1) });
      evidence.push({ sound, sampleRate: rate, wallStallMs, stallStart, stallEnd, releasedAt,
        maxGridErrorSeconds, stalledPulseCount: stalledPulses.length, pulses });
    } finally {
      renderer?.dispose(); capture?.disconnect(); capture?.port.close();
      await context.close(); URL.revokeObjectURL(url);
    }
  }
  return { checks, evidence };
}
