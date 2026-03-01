/**
 * useStrudel — thin wrapper around @strudel/web for pattern playback.
 *
 * Usage:
 *   const { play, stop, isPlaying } = useStrudel()
 *   await play('`<C4@0.5 E4@0.5>`.as("note").sound("piano")')
 */

import { ref, readonly } from "vue";

// Tone.js instrument name → Strudel-compatible sound name
const INSTRUMENT_SOUND_MAP: Record<string, string> = {
  synth: "triangle",
  amSynth: "sawtooth",
  fmSynth: "sawtooth",
  membraneSynth: "sine",
  metalSynth: "square",
  piano: "piano",
  sine: "sine",
  sawtooth: "sawtooth",
  square: "square",
  triangle: "triangle",
};

/** Map a Tone.js instrument name to a Strudel sound name. */
export function toStrudelSound(instrument: string): string {
  return INSTRUMENT_SOUND_MAP[instrument] ?? "triangle";
}

// @strudel/web exposes initStrudel + evaluate globally after init
let initialized = false;
let initPromise: Promise<void> | null = null;
let strudelEval: ((code: string) => Promise<void>) | null = null;
let strudelHush: (() => void) | null = null;

const isPlaying = ref(false);
const isLoading = ref(false);
const currentCode = ref<string | null>(null);

const DOUGH_SAMPLES =
  "https://raw.githubusercontent.com/felixroos/dough-samples/main/";

async function ensureInit() {
  if (initialized) return;
  // Prevent double-init on concurrent calls
  if (initPromise) return initPromise;

  initPromise = (async () => {
    isLoading.value = true;
    try {
      // @strudel/web has no bundled types — suppress TS7016
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const strudel = await import("@strudel/web");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { initStrudel, samples, registerSynthSounds } = strudel as any;

      const ctx = await initStrudel({
        prebake: async () => {
          await Promise.all([
            // Piano samples from dough-samples CDN
            samples(`${DOUGH_SAMPLES}piano.json`),
            // Register built-in WebAudio synth sounds (sine, sawtooth, etc.)
            registerSynthSounds(),
          ]);
        },
      });

      strudelEval = ctx.evaluate;
      strudelHush = ctx.hush;
      initialized = true;
    } finally {
      isLoading.value = false;
    }
  })();

  return initPromise;
}

export function useStrudel() {
  async function play(code: string) {
    await ensureInit();
    if (!strudelEval) return;

    isLoading.value = true;
    try {
      await strudelEval(code);
      isPlaying.value = true;
      currentCode.value = code;
    } catch (e) {
      console.warn("[useStrudel] eval error:", e);
      isPlaying.value = false;
    } finally {
      isLoading.value = false;
    }
  }

  function stop() {
    strudelHush?.();
    isPlaying.value = false;
    currentCode.value = null;
  }

  function toggle(code: string) {
    if (isPlaying.value && currentCode.value === code) {
      stop();
    } else {
      play(code);
    }
  }

  return {
    play,
    stop,
    toggle,
    isPlaying: readonly(isPlaying),
    isLoading: readonly(isLoading),
    currentCode: readonly(currentCode),
  };
}
