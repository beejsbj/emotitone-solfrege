/* Lab-only observation, installed before ui-instrumentation.js. Keeps PCM in the
 * browser for grid-window analysis; no renderer implementation is replaced. */
(() => {
  const NativeWorklet = window.AudioWorkletNode;
  let latestPcm = null;
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
    finish({ stepSeconds, anchor, duration = 2.95, tailAfter, tailAfterFinalInputReleaseMs } = {}) {
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
      return { input, lifecycle, operations, longTasks, endedOwners, createdNodes: created, peakRetainedNodes: peakNodes,
        retainedNodes: nodes.size, grid, tailStartAudioTime: tailAfter ?? null, tail: tailAfter === undefined ? null : windowStats(tailAfter, startFrame / sampleRate + pcm.length / sampleRate),
        sampleRate, pcmFrames: pcm.length, captureEndAudioTime: (startFrame + pcm.length) / sampleRate };
    },
  };
})();
