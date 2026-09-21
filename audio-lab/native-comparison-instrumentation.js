/* Lab-only observation, installed before ui-instrumentation.js. Keeps PCM in the
 * browser for grid-window analysis; no renderer implementation is replaced. */
(() => {
  const NativeWorklet = window.AudioWorkletNode;
  let latestPcm = null;
  const preparedEnvelopes = new Map();
  const nodes = new Set();
  let peakNodes = 0, created = 0, tracking = false;
  const input = [], lifecycle = [], operations = [], longTasks = [], endedOwners = [];
  window.AudioWorkletNode = class extends NativeWorklet {
    constructor(context, name, options) {
      super(context, name, options);
      if (name === 'ui-audio-capture') {
        this.port.addEventListener('message', ({ data }) => { if (data.type === 'pcm') latestPcm = data; });
        this.port.start();
      }
      if (name === 'emotitone-live') {
        const post = this.port.postMessage.bind(this.port);
        this.port.postMessage = (...args) => {
          const command = args[0];
          if (command?.type === 'prepare') {
            const { instrumentId, attack, decay, sustain, release } = command.instrument;
            preparedEnvelopes.set(instrumentId, { instrumentId, attack, decay, sustain, release });
          }
          return post(...args);
        };
      }
    }
  };
  for (const method of ['createBufferSource', 'createOscillator', 'createGain']) {
    const original = BaseAudioContext.prototype[method];
    BaseAudioContext.prototype[method] = function(...args) {
      const node = original.apply(this, args);
      if (tracking) { created++; nodes.add(node); peakNodes = Math.max(peakNodes, nodes.size); }
      const disconnect = node.disconnect;
      node.disconnect = function(...values) { nodes.delete(node); return disconnect.apply(this, values); };
      return node;
    };
  }
  for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => {
    if (tracking && /^Key[ADFG]$/.test(event.code)) input.push({ type, code: event.code, trusted: event.isTrusted,
      time: performance.now(), audioTime: window.__uiAudio.getAudioContext().currentTime });
  }, true);
  new PerformanceObserver(list => { if (tracking) longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration }))); }).observe({ type: 'longtask' });
  window.__nativeComparison = {
    async install() {
      const module = await import('/src/services/livePlayback.ts');
      const renderer = module.getLivePlayback('piano');
      if (!renderer) throw new Error('Expected prepared piano renderer');
      for (const method of ['press', 'release', 'configure', 'clear']) {
        const original = renderer[method].bind(renderer);
        renderer[method] = (...args) => {
          const at = performance.now(); const audioTime = window.__uiAudio.getAudioContext().currentTime;
          try { return original(...args); }
          finally { if (tracking) operations.push({ method, args, audioTime, time: at, duration: performance.now() - at }); }
        };
      }
      module.subscribeLivePlayback({
        onEvent(event) { if (tracking) lifecycle.push({ ...event, deliveredAt: performance.now() }); },
        onOwnerEnded(ownerId) { if (tracking) endedOwners.push({ ownerId, deliveredAt: performance.now() }); },
      });
    },
    reset() { latestPcm = null; input.length = lifecycle.length = operations.length = longTasks.length = endedOwners.length = 0;
      nodes.clear(); peakNodes = created = 0; tracking = true; },
    finish({ stepSeconds, anchor, duration = 2.95, tailAfter, tailAfterFinalInputReleaseMs, inspectTogetherArticulation = false } = {}) {
      tracking = false;
      if (!latestPcm) throw new Error('PCM capture was not observed');
      const { pcm, right, startFrame } = latestPcm;
      const sampleRate = window.__uiAudio.getAudioContext().sampleRate;
      const windowStats = (start, end) => {
        let energy = 0, peak = 0, count = 0;
        for (let i = Math.max(0, Math.round(start * sampleRate - startFrame)); i < Math.min(pcm.length, Math.round(end * sampleRate - startFrame)); i++) {
          energy += pcm[i] ** 2 + right[i] ** 2; peak = Math.max(peak, Math.abs(pcm[i]), Math.abs(right[i])); count++;
        }
        return { rms: count ? Math.sqrt(energy / (2 * count)) : null, peak, samples: count };
      };
      const grid = [];
      if (stepSeconds && anchor !== undefined) for (let at = anchor, index = 0; at < anchor + duration; at += stepSeconds, index++) {
        // At max 220 BPM the prior pulse's 80% gate plus 30ms release ends
        // 16.4ms into this pulse. +25..45ms therefore cannot mistake that old
        // tail for a new beat. This tests rendered samples, not event counts.
        grid.push({ index, at, ...windowStats(at + .025, at + .045) });
      }
      if (tailAfterFinalInputReleaseMs !== undefined) {
        const releases = input.filter(event => event.type === 'keyup');
        if (!releases.length) throw new Error('Tail measurement requires a delivered trusted release');
        tailAfter = Math.max(...releases.map(event => event.audioTime)) + tailAfterFinalInputReleaseMs / 1000;
      }
      let articulation = null;
      if (inspectTogetherArticulation) {
        const prepared = preparedEnvelopes.get('piano');
        if (!prepared || !(prepared.release > 0)) throw new Error('Missing actual prepared piano release envelope');
        const finalInputAudioTime = Math.max(...input.filter(event => event.type === 'keyup').map(event => event.audioTime));
        const finalReleaseAudioTime = Math.max(...lifecycle.filter(event => event.phase === 'release').map(event => event.at));
        const renderQuantumFrames = 128;
        tailAfter = finalReleaseAudioTime + prepared.release + renderQuantumFrames / sampleRate;
        const captureEnd = (startFrame + pcm.length) / sampleRate;
        let lastNonzeroFrame = pcm.length - 1;
        while (lastNonzeroFrame >= 0 && pcm[lastNonzeroFrame] === 0 && right[lastNonzeroFrame] === 0) lastNonzeroFrame--;
        const firstRetained = Math.max(0, Math.floor((finalInputAudioTime - .025) * sampleRate - startFrame));
        const endRetained = Math.min(pcm.length, Math.ceil((tailAfter + .1) * sampleRate - startFrame));
        const encode = channel => {
          const samples = channel.slice(firstRetained, endRetained);
          const bytes = new Uint8Array(samples.buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
          return btoa(binary);
        };
        articulation = { prepared, renderQuantumFrames, finalInputAudioTime, finalReleaseAudioTime,
          expectedEnvelopeEndAudioTime: finalReleaseAudioTime + prepared.release,
          lastNonzeroAudioTime: (startFrame + lastNonzeroFrame) / sampleRate,
          informationalTailFromKeyup100ms: windowStats(finalInputAudioTime + .1, captureEnd),
          decayWindows: [0, .05, .1, .15, .2, .25].map(offset => ({ offsetSeconds: offset,
            ...windowStats(finalReleaseAudioTime + offset, finalReleaseAudioTime + offset + .025) })),
          retainedPcm: { encoding: 'base64-float32', startFrame: startFrame + firstRetained, sampleRate,
            frames: endRetained - firstRetained, left: encode(pcm), right: encode(right) } };
      }
      return { input, lifecycle, operations, longTasks, endedOwners, createdNodes: created, peakRetainedNodes: peakNodes,
        retainedNodes: nodes.size, grid, tailStartAudioTime: tailAfter ?? null, tail: tailAfter === undefined ? null : windowStats(tailAfter, startFrame / sampleRate + pcm.length / sampleRate),
        articulation, sampleRate, pcmFrames: pcm.length, captureEndAudioTime: (startFrame + pcm.length) / sampleRate };
    },
  };
})();
