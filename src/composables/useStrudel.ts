/**
 * useStrudel - shared playback state wrapper for Strudel pattern playback.
 *
 * The runtime itself is initialized in superdoughAudio so live key presses
 * and pattern playback share the same Strudel/superdough bootstrap path.
 */

import { ref, readonly } from "vue";
import { playStrudelCode, stopStrudelPlayback } from "@/services/superdoughAudio";

// Legacy Tone.js alias -> Strudel/superdough sound name.
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

const isPlaying = ref(false);
const isLoading = ref(false);
const currentCode = ref<string | null>(null);

export function useStrudel() {
  async function play(code: string) {
    if (!code.trim()) {
      isPlaying.value = false;
      return;
    }

    isLoading.value = true;
    try {
      await playStrudelCode(code);
      isPlaying.value = true;
      currentCode.value = code;
    } catch (error) {
      console.error("[useStrudel] play error:", error);
      isPlaying.value = false;
    } finally {
      isLoading.value = false;
    }
  }

  function stop() {
    stopStrudelPlayback();
    isPlaying.value = false;
    currentCode.value = null;
  }

  function toggle(code: string) {
    if (isPlaying.value && currentCode.value === code) {
      stop();
      return;
    }

    void play(code);
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
