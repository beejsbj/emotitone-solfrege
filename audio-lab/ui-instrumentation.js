/* Injected before the real application starts. This observes native audio and
 * trusted browser input; it does not replace any application audio module. */
(() => {
  const contexts = [];
  const captures = new Map();
  let recording = false;
  let trace = [];
  let hapticMs = 0;
  let busyMs = 0;
  let stall = null;
  let selectedContext = null;
  const nativeConnect = AudioNode.prototype.connect;
  const NativeContext = window.AudioContext;
  const NativeWorklet = window.AudioWorkletNode;
  const mark = (type, detail = {}) => {
    if (recording) trace.push({ type, performanceTime: performance.now(), audioTime: selectedContext?.currentTime ?? contexts[0]?.currentTime ?? null, ...detail });
  };
  const burn = (ms) => { const until = performance.now() + ms; while (performance.now() < until) {} };
  const processor = `
  class UiCapture extends AudioWorkletProcessor {
    constructor() {
      super(); this.pcm=new Float32Array(sampleRate*12); this.length=0; this.active=false; this.startFrame=0;
      this.port.onmessage=({data})=>{
        if(data==='start') { this.length=0; this.startFrame=currentFrame; this.active=true; this.port.postMessage({type:'started'}); }
        if(data==='stop') { this.active=false; const pcm=this.pcm.slice(0,this.length); this.port.postMessage({type:'pcm',pcm,startFrame:this.startFrame},[pcm.buffer]); }
      };
    }
    process(inputs,outputs) {
      const count=outputs[0][0].length;
      for(let c=0;c<outputs[0].length;c++) if(inputs[0][c]) outputs[0][c].set(inputs[0][c]);
      if(this.active && this.length+count<=this.pcm.length) { if(inputs[0][0]) this.pcm.set(inputs[0][0],this.length); this.length+=count; }
      return true;
    }
  }
  registerProcessor('ui-audio-capture',UiCapture);`;

  function register(context) {
    contexts.push(context);
    const state = { context, pending: [], node: null, ready: null, creationStack: new Error().stack };
    captures.set(context, state);
    state.ready = (async () => {
      const url = URL.createObjectURL(new Blob([processor], { type: 'text/javascript' }));
      await context.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new NativeWorklet(context, 'ui-audio-capture', { outputChannelCount: [2] });
      const mute = new GainNode(context, { gain: 0 });
      nativeConnect.call(node, mute);
      nativeConnect.call(mute, context.destination);
      state.node = node;
      for (const { source, args } of state.pending) {
        source.disconnect(context.destination);
        nativeConnect.call(source, node, ...args);
      }
      state.pending = [];
    })();
  }
  window.AudioContext = class extends NativeContext {
    constructor(options) { super(options); register(this); }
  };
  AudioNode.prototype.connect = function(destination, ...args) {
    const state = captures.get(this.context);
    if (state && destination === this.context.destination) {
      if (state.node) return nativeConnect.call(this, state.node, ...args);
      state.pending.push({ source: this, args });
    }
    return nativeConnect.call(this, destination, ...args);
  };
  const nativeStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function(at, ...args) {
    mark('buffer-source-start', { audioTime: this.context.currentTime, contextIndex: contexts.indexOf(this.context),
      scheduledAt: at ?? this.context.currentTime, duration: this.buffer?.duration ?? null });
    return nativeStart.call(this, at, ...args);
  };
  window.AudioWorkletNode = class extends NativeWorklet {
    constructor(context, name, options) {
      super(context, name, options);
      this.port.addEventListener('message', ({ data }) => {
        if (data.type === 'event') mark('worklet-event', data.event);
      });
      this.port.start();
      const post = this.port.postMessage.bind(this.port);
      this.port.postMessage = (...args) => {
        const payload = args[0];
        mark('worklet-message', { processor: name, messageType: payload?.type ?? null,
          keys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 8) : [] });
        return post(...args);
      };
    }
  };
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => {
    mark('haptic-start'); burn(hapticMs); mark('haptic-end'); return true;
  } });
  for (const type of ['pointerdown', 'pointerup', 'keydown', 'keyup']) {
    window.addEventListener(type, (event) => {
      if (type.startsWith('key') && event.code !== 'KeyA') return;
      if (type.startsWith('pointer') && !event.target.closest?.('.keyboard')) return;
      mark(type, { isTrusted: event.isTrusted, pointerType: event.pointerType ?? null,
        code: event.code ?? null, target: event.target.getAttribute?.('data-key-id') ?? null });
      if (recording && stall && (type === 'pointerdown' || type === 'keydown')) {
        const armed = stall; stall = null;
        setTimeout(() => { mark('rhythm-stall-start'); burn(armed.duration); mark('rhythm-stall-end'); }, armed.after);
      }
      if (recording && busyMs && (type === 'pointerdown' || type === 'keydown')) {
        // Chrome may checkpoint microtasks between trusted event listeners.
        // This is pre-handler UI load, not a bypassable audio-engine delay.
        queueMicrotask(() => { mark('ui-busy-start'); burn(busyMs); mark('ui-busy-end'); });
      }
    }, true);
  }
  for (const type of ['note-played', 'note-released', 'scheduled-live-midi-note']) {
    window.addEventListener(type, (event) => mark(type, { noteId: event.detail?.noteId,
      musicalTimestamp: event.detail?.timestamp, phase: event.detail?.phase, noteName: event.detail?.noteName }));
  }
  const request = (node, message, type) => new Promise((resolve) => {
    const listener = ({ data }) => { if (data.type === type) { node.port.removeEventListener('message', listener); resolve(data); } };
    node.port.addEventListener('message', listener); node.port.start(); node.port.postMessage(message);
  });
  window.__audioUiLab = {
    contexts,
    contextDetails() { return [...captures.values()].map((state) => ({ selected: state.context === selectedContext, creationStack: state.creationStack })); },
    useContext(context) {
      if (!captures.has(context)) throw new Error('Application context was not observed at creation');
      selectedContext = context;
    },
    async ready() { await Promise.all([...captures.values()].map((state) => state.ready)); return contexts.length; },
    configure(options) {
      hapticMs = options.hapticMs || 0; busyMs = options.busyMs || 0; stall = options.stall || null;
    },
    async begin() {
      trace = [];
      await this.ready();
      const state = captures.get(selectedContext ?? contexts[0]);
      if (!state?.node) throw new Error('Real application audio context has not initialized');
      await request(state.node, 'start', 'started'); recording = true;
    },
    async finish() {
      recording = false;
      const context = selectedContext ?? contexts[0];
      const { pcm, startFrame } = await request(captures.get(context).node, 'stop', 'pcm');
      const input = trace.find((item) => item.type === 'pointerdown' || item.type === 'keydown');
      const start = input ? Math.max(0, Math.ceil(input.audioTime * context.sampleRate - startFrame)) : 0;
      let first = -1, peak = 0, lastSignal = -Infinity;
      const onsets = [];
      for (let i = start; i < pcm.length; i++) {
        peak = Math.max(peak, Math.abs(pcm[i]));
        if (Math.abs(pcm[i]) > 0.001) {
          if (first < 0) first = i;
          if (i - lastSignal > context.sampleRate * 0.01) onsets.push((startFrame + i) / context.sampleRate);
          lastSignal = i;
        }
      }
      const onset = first < 0 ? null : (startFrame + first) / context.sampleRate;
      const source = trace.find((item) => item.type === 'buffer-source-start');
      const worklet = trace.find((item) => item.type === 'worklet-message' && item.messageType === 'press');
      return { input, trace, onsetAudioTime: onset, onsets, peak,
        finitePcm: pcm.every(Number.isFinite),
        final100msPeak: pcm.slice(-Math.round(context.sampleRate * 0.1)).reduce((max, value) => Math.max(max, Math.abs(value)), 0),
        inputToPcmMs: onset === null || !input ? null : (onset - input.audioTime) * 1000,
        inputToSourceCallMs: source && input ? source.performanceTime - input.performanceTime : null,
        inputToWorkletMessageMs: worklet && input ? worklet.performanceTime - input.performanceTime : null,
        sampleRate: context.sampleRate, capturedFrames: pcm.length,
        preInputPeak: pcm.slice(0, start).reduce((max, value) => Math.max(max, Math.abs(value)), 0) };
    },
  };
})();
