import { getSuperdoughAudioController } from 'superdough';
import { defaultPatterns } from '@/data/patterns';
import { getAudioContext } from '@/services/superdoughAudio';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, mean: values.reduce((a, b) => a + b, 0) / (values.length || 1),
    max: sorted.at(-1) ?? 0, p95: sorted[Math.floor((sorted.length - 1) * .95)] ?? 0 };
};
export function match(expected, actual, tolerance) {
  const remaining = [...actual], errors = [], missing = [];
  for (const wanted of expected) {
    const i = remaining.findIndex(value => Math.abs(value - wanted) <= tolerance);
    if (i < 0) missing.push(wanted);
    else errors.push(Math.abs(remaining.splice(i, 1)[0] - wanted) * 1000);
  }
  return { expected: expected.length, actual: actual.length, missing, unexpected: remaining, errorMs: stats(errors) };
}
export async function until(test, label, timeoutMs = 25000) {
  const end = performance.now() + timeoutMs;
  while (!test()) {
    if (performance.now() > end) throw Error(`Timed out: ${label}`);
    await sleep(8);
  }
}

// Same source melodies and independent 1/2/3/4-bar timing as the passing spike cells.
export function phrases() {
  return [1, 2, 3, 4].map((bars, i) => {
    const source = defaultPatterns[i];
    return { id: `p${i}`, shelf: 'library', createdAt: 0, name: `${source.name} (${bars} bars)`,
      context: { key: source.key, mode: source.mode, octave: 4, bpm: 120, instrument: 'sine',
        shape: { cutoff: 20000, resonance: 0, room: 0, delay: 0, attack: null, release: null } },
      duration: bars * 2000,
      notes: Array.from({ length: bars * 8 }, (_, j) => ({ ...source.notes[j % source.notes.length],
        id: `lab-${i}-${j}`, pressTime: j * 250, releaseTime: j * 250 + 100, duration: 100,
        articulation: { attack: .001, decay: .01, sustain: .5, release: .01 } })) };
  });
}

// Arithmetic oracle uses raw notes, never Pattern.queryArc or the builder's plan.
export function expectedNotes(phrase, settings, begin, end) {
  const { rate = 1, offsetBars = 0 } = settings;
  const barMs = 240000 / phrase.context.bpm;
  const origin = Math.min(...phrase.notes.map(n => n.pressTime));
  const bars = Math.max(1, Math.ceil(Math.max(phrase.duration,
    ...phrase.notes.map(n => n.pressTime - origin + n.duration)) / barMs));
  const period = bars / rate, events = [];
  for (let loop = Math.floor((begin - offsetBars) / period) - 1; loop <= Math.ceil((end - offsetBars) / period); loop++) {
    for (const note of phrase.notes) {
      const cycle = offsetBars + loop * period + (note.pressTime - origin) / barMs / rate;
      if (cycle >= begin - 1e-8 && cycle < end - 1e-8) events.push({ cycle, note });
    }
  }
  return events.sort((a, b) => a.cycle - b.cycle);
}

export async function captureOrbits() {
  const context = getAudioContext();
  await context.audioWorklet.addModule('/audio-lab/processors.js');
  const captures = Array.from({ length: 4 }, (_, i) => {
    const node = new AudioWorkletNode(context, 'lab-capture');
    const mute = context.createGain(); mute.gain.value = 0;
    node.connect(mute).connect(context.destination);
    const orbit = getSuperdoughAudioController().getOrbit(i + 10, [0, 1]);
    orbit.output.connect(node);
    return { node, mute, orbit };
  });
  function request(node, message, type) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { node.port.removeEventListener('message', listener); reject(Error(`Capture ${type} timeout`)); }, 5000);
      const listener = ({ data }) => {
        if (data.type !== type) return;
        clearTimeout(timeout); node.port.removeEventListener('message', listener); resolve(data);
      };
      node.port.addEventListener('message', listener); node.port.start(); node.port.postMessage(message);
    });
  }
  return {
    async begin() { await Promise.all(captures.map(c => request(c.node, 'start', 'started'))); },
    async end() {
      return Promise.all(captures.map(async (c, i) => {
        const { pcm, startFrame } = await request(c.node, 'stop', 'pcm');
        const onsets = [], silentRuns = []; let silent = Infinity;
        for (let frame = 0; frame < pcm.length; frame++) {
          if (Math.abs(pcm[frame]) < .0005) silent++;
          else {
            if (silent >= context.sampleRate * .01) {
              onsets.push((startFrame + frame) / context.sampleRate);
              if (Number.isFinite(silent)) silentRuns.push([(startFrame + frame - silent) / context.sampleRate, (startFrame + frame) / context.sampleRate]);
            }
            silent = 0;
          }
        }
        // Include terminal silence so a held voice that dies cannot escape detection.
        if (Number.isFinite(silent) && silent >= context.sampleRate * .01)
          silentRuns.push([(startFrame + pcm.length - silent) / context.sampleRate, (startFrame + pcm.length) / context.sampleRate]);
        return { phraseId: `p${i}`, orbit: i + 10, startFrame, frames: pcm.length, onsets, silentRuns };
      }));
    },
    close() { for (const c of captures) { c.orbit.output.disconnect(c.node); c.node.disconnect(); c.mute.disconnect(); } },
  };
}
