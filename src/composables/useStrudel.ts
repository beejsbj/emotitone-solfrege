/**
 * useStrudel — thin wrapper around @strudel/web for pattern playback.
 *
 * Usage:
 *   const { play, stop, isPlaying } = useStrudel()
 *   await play('`<C4@0.5 E4@0.5>`.as("note").sound("piano")')
 */

import { ref, readonly } from "vue";

// Legacy Tone.js alias → Strudel/superdough sound name.
// Only non-identity mappings; all other instrument keys pass through.
const LEGACY_ALIASES: Record<string, string> = {
  synth: "triangle",
  amSynth: "sawtooth",
  fmSynth: "square",
  membraneSynth: "sine",
  metalSynth: "square",
  organ: "organ_full",
  pipeorgan: "pipeorgan_quiet",
  recorder: "recorder_tenor_sus",
};

/** Resolve a Tone.js legacy alias to its Strudel/superdough sound name. */
export function toStrudelSound(instrument: string): string {
  return LEGACY_ALIASES[instrument] ?? instrument;
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

      // @ts-ignore
      const { registerSoundfonts } = await import("@strudel/soundfonts");

      const ctx = await initStrudel({
        prebake: async () => {
          await Promise.all([
            samples(`${DOUGH_SAMPLES}piano.json`),
            samples(`${DOUGH_SAMPLES}vcsl.json`),
            samples(`${DOUGH_SAMPLES}tidal-drum-machines.json`),
            samples(`${DOUGH_SAMPLES}EmuSP12.json`),
            samples(`${DOUGH_SAMPLES}Dirt-Samples.json`),
            samples(`${DOUGH_SAMPLES}mridangam.json`),
            registerSoundfonts(),
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
