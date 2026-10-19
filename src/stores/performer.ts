import { defineStore } from "pinia";
import { computed, onScopeDispose, watch } from "vue";
import { useHarmonyAlterationStore } from "@/stores/harmonyAlteration";
import { useInstrumentStore } from "@/stores/instrument";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { createPerformer } from "@/services/performer";
import { buildHarmony } from "@/domain/harmony";
import type { ChromaticNote } from "@/types/music";

/**
 * The app's one performer (W3). Pointer, QWERTY, number row, MIDI and the
 * chord row press and release through it; it lights their touches, routes
 * their voices through the music store, and releases every owner when the
 * window blurs, the page hides, the instrument locks, or a new instrument is
 * selected.
 *
 * It reads the Joystick alteration from its store, so the chord row and the
 * number row build the same chords from one place (`chordsAt`).
 */
export const usePerformerStore = defineStore("performer", () => {
  const musicStore = useMusicStore();
  const instrumentStore = useInstrumentStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const harmonyAlterationStore = useHarmonyAlterationStore();

  const performer = createPerformer({
    attack(voice, isCancelled) {
      if (voice.kind === "degree") {
        return musicStore.attackNoteWithOctave(voice.scaleIndex, voice.octave, isCancelled);
      }
      if (voice.mirrorMidi === false) {
        return musicStore.attackExactPitch(voice.pitch, isCancelled, voice.velocity, { mirrorMidi: false });
      }
      return voice.velocity === undefined
        ? musicStore.attackExactPitch(voice.pitch, isCancelled)
        : musicStore.attackExactPitch(voice.pitch, isCancelled, voice.velocity);
    },
    releaseVoice: (voiceId) => musicStore.releaseNote(voiceId),
    setPitchBend(voiceId, cents, at) {
      if (at === undefined) musicStore.setNotePitchBend(voiceId, cents);
      else musicStore.setNotePitchBend(voiceId, cents, at);
    },
    setGain(voiceId, gain, at) {
      if (at === undefined) musicStore.setNoteGain(voiceId, gain);
      else musicStore.setNoteGain(voiceId, gain, at);
    },
    addTouch: (owner, touchKey) => keyboardDrawerStore.addTouch(owner, touchKey),
    removeTouch: (owner) => keyboardDrawerStore.removeTouch(owner),
    isLocked: () => instrumentStore.isInteractionLocked,
    setTimer: (callback, ms) => window.setTimeout(callback, ms),
    clearTimer: (handle) => window.clearTimeout(handle as number),
  });

  watch(() => instrumentStore.isInteractionLocked, (locked) => {
    if (locked) performer.releaseAllFor(undefined, "locked");
  }, { flush: "sync" });
  // Selecting an instrument (even one already prepared) silences every live
  // input in the music store; held state and lit keys must end with the sound.
  watch(() => instrumentStore.selectionEpoch, () => {
    performer.releaseAllFor(undefined, "instrument-change");
  }, { flush: "sync" });

  const onBlur = () => performer.releaseAllFor(undefined, "blur");
  const onPageHide = () => performer.releaseAllFor(undefined, "hidden");
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") onPageHide();
  };
  window.addEventListener("blur", onBlur);
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onVisibilityChange);
  onScopeDispose(() => {
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    performer.dispose();
  });

  /**
   * The chord row's chords rooted at `octave`, under the Joystick's current
   * alteration. Reactive when read inside a computed. A chord already held
   * keeps the voices it was pressed with: release goes by owner.
   */
  const chordsAt = (octave: number) => buildHarmony({
    tonic: musicStore.currentKey as ChromaticNote,
    scaleType: musicStore.currentMode,
    octave,
    alteration: harmonyAlterationStore.effective,
  });

  return {
    chordsAt,
    isLocked: computed(() => instrumentStore.isInteractionLocked),
    press: performer.press,
    release: performer.release,
    releaseAllFor: performer.releaseAllFor,
    pitchBend: performer.pitchBend,
    setGain: performer.setGain,
    expectRenewal: performer.expectRenewal,
    renew: performer.renew,
    isHeld: performer.isHeld,
    owners: performer.owners,
    subscribe: performer.subscribe,
  };
});
