import { defineStore } from "pinia";
import { ref } from "vue";
import type { HarmonyAlteration } from "@/domain/harmony";

/**
 * The Joystick's chord alteration (W3). The on-screen chord row and the
 * number row both build chords under `effective`, through the performer, so
 * they can never disagree.
 *
 * - `latched` is the detent the Joystick rests on.
 * - `effective` is what a new chord press uses now: the latch, or the
 *   direction the stick is pushed while it is held off its latch.
 *
 * A held chord keeps the voices it was pressed with; changing the alteration
 * never re-voices or strands it, because every release goes by owner.
 *
 * Not persisted: the Joystick starts at "auto" on every load, as it did when
 * this state lived in the Performance Deck.
 */
export const useHarmonyAlterationStore = defineStore("harmonyAlteration", () => {
  const latched = ref<HarmonyAlteration>("auto");
  const effective = ref<HarmonyAlteration>("auto");

  /** Rest the Joystick on a detent; new chords use it at once. */
  function latch(value: HarmonyAlteration) {
    latched.value = value;
    effective.value = value;
  }

  /** The stick's live direction while it is pushed away from its latch. */
  function setEffective(value: HarmonyAlteration) {
    effective.value = value;
  }

  return { latched, effective, latch, setEffective };
});
