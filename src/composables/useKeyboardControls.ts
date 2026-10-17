/**
 * QWERTY and number-row adapter for the performer.
 * Letter rows press scale degrees; the number row presses the chord row's
 * chords. Every physical key is one performer owner (`keyboard:<code>`).
 * The layout itself is data in `@/utils/qwertyLayout`. The performance
 * surface registers it (through `useKeyboardPerformance`), not the Keyboard
 * view, so it works whenever the instrument is on screen.
 */

import { onMounted, onUnmounted, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { usePerformer } from "@/composables/usePerformer";
import type { PerformerReleaseReason } from "@/services/performer";
import {
  CHORD_ROW_KEYS,
  qwertyNoteMapping,
  type QwertyNote,
} from "@/utils/qwertyLayout";

/** Letter keys by `KeyboardEvent.code`; see `qwertyNoteMapping`. */
type KeyboardMapping = Record<string, QwertyNote>;

/**
 * How long a held key may go without key-repeat evidence once Cmd is down.
 * macOS delivers no key-up for a key released while Cmd is held, and stops
 * repeating it, so after this window the key is treated as released.
 *
 * Known cost: a drone held on QWERTY is cut one window after a Cmd tap
 * (Cmd+Z, say), even once Cmd is up. There is no safe disarm on Cmd's key-up:
 * a key lifted while Cmd was down and a key still held look the same from
 * then on (no key-up, no repeat), and disarming would leave the lifted one
 * sounding forever. A cut drone is replayed by pressing again; a stuck note
 * has no recovery, so the watch stays armed.
 */
export const KEY_REPEAT_WINDOW_MS = 1000;

const KEYBOARD_OWNER_SCOPE = "keyboard";

/**
 * Releases the performer made on its own while the key may still be down.
 * Its key repeat must not revive the note; a fresh press always plays.
 */
const BLOCKING_RELEASES = new Set<PerformerReleaseReason>([
  "locked", "silent", "missing-key-up", "instrument-change",
]);

/**
 * Composable for handling keyboard controls for solfege notes
 */
export function useKeyboardControls(mainOctave: Ref<number>) {
  const musicStore = useMusicStore();
  const phrasesStore = usePhrasesStore();
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const performer = usePerformer();

  const chordKeyIndex = new Map<string, number>(
    CHORD_ROW_KEYS.map((key, index) => [key.code, index]),
  );

  // Ignored mapped keys must not start a note from OS key repeat after a lock
  // or modifier clears; a key-up or a fresh (non-repeat) keydown lifts it.
  const blockedKeys = new Set<string>();

  const getKeyboardMapping = (): KeyboardMapping => qwertyNoteMapping({
    degreeCount: musicStore.currentScale.degreeCount,
    mainOctave: mainOctave.value,
    visibleOctaves: keyboardDrawerStore.visibleOctaves,
  });

  /**
   * The chord row's harmony under the Joystick's alteration, read through the
   * performer from the one store that holds it.
   */
  const getCurrentChords = () => performer.chordsAt(mainOctave.value);

  const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      target.isContentEditable
    );
  };

  const ownerFor = (code: string) => `${KEYBOARD_OWNER_SCOPE}:${code}`;
  const codeFor = (owner: string) => owner.slice(KEYBOARD_OWNER_SCOPE.length + 1);

  /** While Cmd is down, every held key must prove it is still held. */
  const watchForMissingKeyUps = () => {
    for (const owner of performer.owners(KEYBOARD_OWNER_SCOPE)) {
      performer.expectRenewal(owner, KEY_REPEAT_WINDOW_MS);
    }
  };

  /** Resolves once the press this key started has settled. */
  const handleKeyDown = (event: KeyboardEvent): Promise<void> => {
    if (isEditableTarget(event.target)) return Promise.resolve();

    const key = event.code;
    const owner = ownerFor(key);
    const chordIndex = chordKeyIndex.get(key);

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      phrasesStore.undoLastNote();
      return Promise.resolve();
    }

    if (event.metaKey) watchForMissingKeyUps();

    const noteMapping = chordIndex === undefined ? getKeyboardMapping()[key] : undefined;
    if (chordIndex === undefined && !noteMapping) return Promise.resolve();

    if (performer.isHeld(owner)) {
      // Key repeat of a held key is evidence that it is still down.
      performer.renew(owner);
      return Promise.resolve();
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      blockedKeys.add(key);
      return Promise.resolve();
    }

    if (blockedKeys.has(key)) {
      // A block only stops key repeat. A fresh keydown proves the key was
      // lifted, even when the key-up was lost (macOS under Cmd), so it plays.
      if (event.repeat) {
        event.preventDefault();
        return Promise.resolve();
      }
      blockedKeys.delete(key);
    }

    if (performer.isLocked) {
      event.preventDefault();
      blockedKeys.add(key);
      return Promise.resolve();
    }

    event.preventDefault();

    if (chordIndex !== undefined) {
      const chord = getCurrentChords()[chordIndex];
      if (!chord) return Promise.resolve();
      return performer.press({
        owner,
        kind: "chord",
        voices: chord.voicing.pitches.map((pitch) => ({ kind: "pitch" as const, pitch: pitch.name })),
        touchKey: `chord:degree-${chordIndex + 1}`,
      }).then(() => undefined);
    }

    const { solfegeIndex, octave } = noteMapping!;
    return performer.press({
      owner,
      kind: "note",
      voices: [{ kind: "degree", scaleIndex: solfegeIndex, octave }],
      touchKey: `${solfegeIndex}_${octave}`,
    }).then(() => undefined);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.code;
    if (blockedKeys.delete(key)) return;
    performer.release(ownerFor(key));
  };

  // The performer releases held keys on blur; a blocked key's key-up may
  // never arrive while the window is away, so forget it too.
  const handleWindowBlur = () => blockedKeys.clear();

  let unsubscribe: (() => void) | undefined;

  const setupKeyboardListeners = () => {
    unsubscribe?.();
    unsubscribe = performer.subscribe((intent) => {
      if (intent.type !== "release" || !intent.owner.startsWith(`${KEYBOARD_OWNER_SCOPE}:`)) return;
      if (BLOCKING_RELEASES.has(intent.reason)) blockedKeys.add(codeFor(intent.owner));
    });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
  };

  const cleanupKeyboardListeners = () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", handleWindowBlur);
    unsubscribe?.();
    unsubscribe = undefined;
    performer.releaseAllFor(KEYBOARD_OWNER_SCOPE, "teardown");
    blockedKeys.clear();
  };

  onMounted(setupKeyboardListeners);
  onUnmounted(cleanupKeyboardListeners);

  return {
    getKeyboardMapping,
    handleKeyDown,
    handleKeyUp,
    setupKeyboardListeners,
    cleanupKeyboardListeners,
  };
}
