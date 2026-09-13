import * as dough from 'superdough';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stall = (ms) => { const end = performance.now() + ms; while (performance.now() < end) {} };
const round = (value) => Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;

function sampleWav(rate) {
  const length = Math.floor(rate * 0.04);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const text = (at, value) => [...value].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const tail = Math.min(1, (length - i) / (rate * 0.005));
    view.setInt16(44 + i * 2, Math.round(Math.sin(i * 2 * Math.PI * 440 / rate) * 0.3 * tail * 32767), true);
  }
  return bytes;
}

function detect(pcm, start, rate) {
  // First threshold crossing after >=10ms silence; carrier zero crossings cannot
  // create duplicate attacks. Every experiment uses the same sample/envelope.
  const onsets = [];
  let lastSignal = -rate;
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    const amplitude = Math.abs(pcm[i]);
    peak = Math.max(peak, amplitude);
    if (amplitude > 0.005) {
      if (i - lastSignal > rate * 0.01) onsets.push((start + i) / rate);
      lastSignal = i;
    }
  }
  return { onsets, peak: round(peak) };
}

function timing(onsets, expected) {
  const errors = [];
  const used = new Set();
  for (const time of expected) {
    const index = onsets.findIndex((onset, i) => !used.has(i) && onset >= time - 0.005 && onset < time + 0.06);
    if (index >= 0) { used.add(index); errors.push((onsets[index] - time) * 1000); }
  }
  return {
    expected: expected.length, detected: onsets.length, missing: expected.length - used.size,
    duplicatesOrUnexpected: onsets.length - used.size,
    onsetErrorMs: { p50: round(percentile(errors, 0.5)), p95: round(percentile(errors, 0.95)), max: round(Math.max(...errors)) },
  };
}

window.runAudioLab = async function runAudioLab() {
  const context = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 });
  dough.setAudioContext(context);
  await dough.initAudio({ disableWorklets: true });
  await context.audioWorklet.addModule('/audio-lab/processors.js');
  await context.resume();
  const capture = new AudioWorkletNode(context, 'lab-capture');
  const silent = new GainNode(context, { gain: 0 });
  capture.connect(silent).connect(context.destination);
  const output = dough.getSuperdoughAudioController().output.destinationGain;
  output.disconnect(); output.connect(capture);
  const url = URL.createObjectURL(new Blob([sampleWav(context.sampleRate)], { type: 'audio/wav' }));
  await dough.samples({ lab_sample: [url] });
  const buffer = await dough.loadBuffer(url, context);
  const prototype = new AudioWorkletNode(context, 'lab-sample-instrument', { numberOfInputs: 0, outputChannelCount: [1] });
  prototype.connect(capture);
  prototype.port.postMessage({ type: 'sample', pcm: buffer.getChannelData(0) });
  const request = (node, message, type) => new Promise((resolve) => {
    const handler = ({ data }) => {
      if (data.type === type) { node.port.removeEventListener('message', handler); resolve(data); }
    };
    node.port.addEventListener('message', handler); node.port.start(); node.port.postMessage(message);
  });
  const begin = () => request(capture, 'start', 'started');
  const finish = async () => {
    const result = await request(capture, 'stop', 'pcm');
    return detect(result.pcm, result.startFrame, context.sampleRate);
  };
  let voiceNumber = 0;
  const voiceIds = [];
  const trigger = async (engine, at, attack = 0.001) => {
    if (engine === 'direct') {
      const source = new AudioBufferSourceNode(context, { buffer });
      const gain = new GainNode(context, { gain: 0 });
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.8, at + attack);
      source.connect(gain).connect(capture);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start(at);
      return true;
    } else {
      const voiceId = `lab-${++voiceNumber}`;
      voiceIds.push(voiceId);
      await dough.superdough({ s: 'lab_sample', gain: 0.8, attack, release: 0.01,
        voiceId, sustainUntilRelease: true }, at, 0.04, 1);
      return dough.hasVoice(voiceId);
    }
  };
  const results = {
    environment: { userAgent: navigator.userAgent, sampleRate: context.sampleRate,
      baseLatency: context.baseLatency, outputLatency: context.outputLatency,
      scope: 'Headless browser render graph PCM; no hardware, input delivery or acoustic latency measurement',
      sample: 'Identical preloaded 40ms 440Hz mono PCM; gain .8; linear attack 1ms unless labeled 10ms; no effects' },
    attacks: [], sequences: [],
  };
  // Avoid charging first-use node/JIT work to only the first engine/scenario.
  for (const engine of ['direct', 'superdough']) {
    for (let i = 0; i < 3; i++) { await trigger(engine, context.currentTime + 0.02); await sleep(60); }
  }
  for (const engine of ['direct', 'superdough']) {
    for (const stress of [false, true]) {
      for (const leadMs of [0, 5, 10]) {
        await begin();
        const expected = [], inputs = [], preparation = [];
        let registered = 0;
        for (let i = 0; i < 16; i++) {
          if (stress) stall(20);
          const input = context.currentTime;
          inputs.push(input); expected.push(input + leadMs / 1000);
          const before = performance.now();
          if (await trigger(engine, input + leadMs / 1000)) registered++;
          preparation.push(performance.now() - before);
          await sleep(65);
        }
        await sleep(80);
        const rendered = await finish();
        results.attacks.push({ engine, stress, leadMs, registered, ...timing(rendered.onsets, expected), peak: rendered.peak,
          inputToRenderedOnsetMs: timing(rendered.onsets, inputs).onsetErrorMs,
          preparationMs: { p50: round(percentile(preparation, 0.5)), p95: round(percentile(preparation, 0.95)) } });
      }
    }
  }
  // Separate articulation measurement with the original live adapter's 10ms fade.
  await begin();
  const envelopeExpected = [];
  for (let i = 0; i < 8; i++) { const at = context.currentTime + 0.01; envelopeExpected.push(at); await trigger('superdough', at, 0.01); await sleep(80); }
  results.originalAttackEnvelope = timing((await finish()).onsets, envelopeExpected);

  for (const engine of ['direct', 'superdough', 'worklet-repeat', 'worklet-arp']) {
    for (const stress of [false, true]) {
      await begin();
      const start = context.currentTime + 0.1;
      const expected = Array.from({ length: 12 }, (_, i) => start + i * 0.125);
      let next = 0;
      let skipped = 0;
      let timer;
      if (engine.startsWith('worklet')) {
        prototype.port.postMessage({ type: 'held', notes: engine === 'worklet-arp' ? [69, 72, 76] : [69],
          mode: engine === 'worklet-arp' ? 'arp' : 'repeat', at: start, interval: 0.125 });
      } else {
        const tick = () => {
          while (next < expected.length && expected[next] <= context.currentTime + 0.15) {
            const at = expected[next++];
            if (at < context.currentTime) skipped++;
            else void trigger(engine, at);
          }
        };
        tick(); timer = setInterval(tick, 10);
      }
      let stallObservedMs = 0;
      const blocker = stress ? setTimeout(() => { const now = performance.now(); stall(300); stallObservedMs = performance.now() - now; }, 450) : null;
      await sleep(1510);
      if (timer) clearInterval(timer);
      if (blocker) clearTimeout(blocker);
      prototype.port.postMessage({ type: 'held', notes: [] });
      await sleep(100);
      const rendered = await finish();
      results.sequences.push({ engine, stress, scheduledHorizonMs: engine.startsWith('worklet') ? null : 150,
        stallObservedMs: round(stallObservedMs), skippedByScheduler: skipped, ...timing(rendered.onsets, expected), peak: rendered.peak });
    }
  }
  // Held changes/cancellation and dense polyphony: messages, not main-thread ticks.
  await begin();
  const cancelAt = context.currentTime + 0.1;
  prototype.port.postMessage({ type: 'held', notes: [69], at: cancelAt });
  prototype.port.postMessage({ type: 'held', notes: [] });
  await sleep(200);
  const cancelled = await finish();
  // Release during a sounding voice, then verify the PCM actually becomes silent.
  await begin();
  prototype.port.postMessage({ type: 'held', notes: [69], interval: 0.125 });
  await sleep(12);
  const releasedAt = context.currentTime;
  prototype.port.postMessage({ type: 'held', notes: [] });
  await sleep(80);
  const releasePcm = await request(capture, 'stop', 'pcm');
  const silenceFrom = Math.max(0, Math.ceil((releasedAt + 0.015) * context.sampleRate - releasePcm.startFrame));
  const tailPeak = releasePcm.pcm.slice(silenceFrom).reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
  let biggestAdjacentStep = 0;
  for (let i = 1; i < releasePcm.pcm.length; i++) biggestAdjacentStep = Math.max(biggestAdjacentStep, Math.abs(releasePcm.pcm[i] - releasePcm.pcm[i - 1]));
  prototype.port.postMessage({ type: 'held', notes: Array.from({ length: 32 }, (_, i) => 48 + i), interval: 0.003, mode: 'repeat' });
  await sleep(200);
  const denseStats = await request(prototype, { type: 'stats' }, 'stats');
  prototype.port.postMessage({ type: 'held', notes: [] });
  await sleep(100);
  const releasedStats = await request(prototype, { type: 'stats' }, 'stats');
  results.prototypeLifecycle = { cancelledOnsets: cancelled.onsets.length, releaseTailPeakAfter15ms: round(tailPeak),
    releaseLargestAdjacentSampleStep: round(biggestAdjacentStep), denseStats, releasedStats };
  for (const id of voiceIds) dough.releaseVoice(id);
  await sleep(120);
  results.cleanup = { totalTriggered: voiceIds.length, voicesStillRegisteredAfterNaturalEndAndRelease: voiceIds.filter((id) => dough.hasVoice(id)).length,
    maxPolyphony: Number.isFinite(dough.maxPolyphony) ? dough.maxPolyphony : String(dough.maxPolyphony) };
  prototype.disconnect(); capture.disconnect(); silent.disconnect();
  URL.revokeObjectURL(url); await context.close();
  document.querySelector('#results').textContent = JSON.stringify(results, null, 2);
  return results;
};
document.querySelector('#run').onclick = () => window.runAudioLab();
