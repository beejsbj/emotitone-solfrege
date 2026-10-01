/*
 * Lab copy of the production Hilbert pair (`useHilbertScopeRenderer`'s private
 * HilbertProcessor), so direction scopes read the same analytic signal the
 * production scope draws. Adoption should export the production processor
 * instead of keeping this copy.
 */
export interface LabHilbertPair {
  read: () => { x: Float32Array; y: Float32Array };
  disconnect: () => void;
}

const BUFFER = 1024;

export function connectLabHilbert(source: AudioNode): LabHilbertPair {
  const context = source.context as AudioContext;
  const length = 767;
  const mid = (length - 1) / 2;
  const impulse = new Float32Array(length);
  for (let i = 0; i <= mid; i++) {
    const window = 0.53836 + 0.46164 * Math.cos((i * Math.PI) / (mid + 1));
    if (i % 2 === 1) {
      const value = 2 / Math.PI / i;
      impulse[mid + i] = window * value;
      impulse[mid - i] = window * -value;
    }
  }
  const buffer = context.createBuffer(1, length, context.sampleRate);
  buffer.copyToChannel(impulse, 0);
  const hilbert = context.createConvolver();
  hilbert.normalize = false;
  hilbert.buffer = buffer;
  const delay = context.createDelay(mid / context.sampleRate);
  delay.delayTime.value = mid / context.sampleRate;
  const time = context.createAnalyser();
  const quad = context.createAnalyser();
  time.fftSize = BUFFER * 2;
  quad.fftSize = BUFFER * 2;
  source.connect(hilbert);
  source.connect(delay);
  hilbert.connect(time);
  delay.connect(quad);
  const x = new Float32Array(BUFFER);
  const y = new Float32Array(BUFFER);

  return {
    read() {
      time.getFloatTimeDomainData(x);
      quad.getFloatTimeDomainData(y);
      return { x, y };
    },
    disconnect() {
      for (const [from, to] of [[source, hilbert], [source, delay]] as const) {
        try { from.disconnect(to); } catch { /* already gone */ }
      }
      hilbert.disconnect();
      delay.disconnect();
      time.disconnect();
      quad.disconnect();
    },
  };
}

/** The production scope's sigmoid mapping from sample to unit radius. */
const sigmoidBase = (t: number) => 1 / (1 + Math.exp(-7 * t)) - 0.5;
const sigmoidCorrection = 0.5 / sigmoidBase(1);
export function scopeScale(value: number) {
  const t = Math.max(0, Math.min(1, (value + 3) / 6));
  const s = sigmoidCorrection * sigmoidBase(2 * t - 1) + 0.5;
  return s * 2 - 1;
}
