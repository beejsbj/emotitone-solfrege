/** App-owned context, master and native effect buses. Superdough temporarily
 * borrows this graph for patterns/fallback voices; lifecycle is shared. */
// @ts-ignore — superdough does not publish TypeScript declarations.
import { setAudioContext, setSuperdoughAudioController, initAudio } from "superdough";
import { manageAudioLifecycle, onAudioRunning } from "@/services/audioLifecycle";
import { MAX_AUDIO_VOICES } from "@/audio/voicePolicy";
import { EngineAudioGraph } from "@/audio/effects";

export const LIVE_ORBIT = 2;
let context: AudioContext | undefined;
let graph: EngineAudioGraph | undefined;
let initialization: Promise<void> | undefined;
let stopLifecycle: (() => void) | undefined;
let stopRecovery: (() => void) | undefined;

export function getAudioContext(): AudioContext {
  if (!context || context.state === "closed") {
    stopLifecycle?.(); stopRecovery?.(); graph?.reset();
    stopLifecycle = stopRecovery = undefined;
    initialization = undefined;
    context = new AudioContext();
    graph = new EngineAudioGraph(context);
    setAudioContext(context);
    setSuperdoughAudioController(graph);
    let rate = context.sampleRate;
    const owned = graph, ownedContext = context;
    stopRecovery = onAudioRunning(context, () => {
      if (rate === ownedContext.sampleRate) return;
      return owned.rebuildEffects().then(() => { rate = ownedContext.sampleRate; });
    });
  }
  return context;
}

export function getMasterGain(): GainNode | null {
  getAudioContext();
  return graph!.master;
}

export function getLiveOrbit() {
  getAudioContext();
  return graph!.getOrbit(LIVE_ORBIT);
}

/** Preparation never resumes: startup and interruption unlock belong to the
 * existing audioLifecycle gate and the user's Play/Start gesture. */
export async function initializeAudio(): Promise<void> {
  const ownedContext = getAudioContext(), owned = graph!;
  initialization ??= Promise.resolve().then(async () => {
    await initAudio({ maxPolyphony: MAX_AUDIO_VOICES });
    await owned.getOrbit(LIVE_ORBIT).ready();
  }).catch(error => { if (graph === owned) initialization = undefined; throw error; });
  await initialization;
  if (context !== ownedContext) return;
  if (!stopLifecycle) {
    const master = owned.master;
    const meter = ownedContext.createAnalyser();
    meter.fftSize = 2048;
    const samples = new Float32Array(meter.fftSize);
    master.connect(meter);
    const stop = manageAudioLifecycle(ownedContext, {
      isSounding() {
        meter.getFloatTimeDomainData(samples);
        return samples.some(sample => Math.abs(sample) > 0.0001);
      },
    });
    stopLifecycle = () => { stop(); master.disconnect(meter); meter.disconnect(); };
    ownedContext.addEventListener("statechange", () => {
      if (ownedContext.state === "closed") { stopLifecycle?.(); stopLifecycle = undefined; }
    });
  }
}
