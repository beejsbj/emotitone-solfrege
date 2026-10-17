/**
 * QWERTY and number-row adapter for the performer.
 * Letter rows press scale degrees; the number row presses the chord row's
 * chords. Every physical key is one performer owner (`keyboard:<code>`).
 */

import { onMounted, onUnmounted, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { usePerformer } from "@/composables/usePerformer";
import type { PerformerReleaseReason } from "@/services/performer";
import { buildHarmony, type HarmonyAlteration } from "@/domain/harmony";
import type { ChromaticNote } from "@/types/music";

/**
 * Keyboard mapping interface
 */
interface KeyboardMapping {
  [key: string]: {
    solfegeIndex: number;
    octave: number;
    label: string;
  };
}

/**
 * The number row triggers chords (one per scale degree) rather than
 * individual notes. The remaining letter rows keep single-note behaviour.
 */
const CHORD_ROW_KEYS = [
  { code: "Digit1", label: "1" },
  { code: "Digit2", label: "2" },
  { code: "Digit3", label: "3" },
  { code: "Digit4", label: "4" },
  { code: "Digit5", label: "5" },
  { code: "Digit6", label: "6" },
  { code: "Digit7", label: "7" },
  { code: "Digit8", label: "8" },
  { code: "Digit9", label: "9" },
  { code: "Digit0", label: "0" },
  { code: "Minus", label: "-" },
  { code: "Equal", label: "=" },
] as const;

const KEY_ROWS = [
  {
    octaveOffset: 1,
    keys: [
      { code: "KeyQ", label: "Q" },
      { code: "KeyW", label: "W" },
      { code: "KeyE", label: "E" },
      { code: "KeyR", label: "R" },
      { code: "KeyT", label: "T" },
      { code: "KeyY", label: "Y" },
      { code: "KeyU", label: "U" },
      { code: "KeyI", label: "I" },
      { code: "KeyO", label: "O" },
      { code: "KeyP", label: "P" },
      { code: "BracketLeft", label: "[" },
      { code: "BracketRight", label: "]" },
    ],
  },
  {
    octaveOffset: 0,
    keys: [
      { code: "KeyA", label: "A" },
      { code: "KeyS", label: "S" },
      { code: "KeyD", label: "D" },
      { code: "KeyF", label: "F" },
      { code: "KeyG", label: "G" },
      { code: "KeyH", label: "H" },
      { code: "KeyJ", label: "J" },
      { code: "KeyK", label: "K" },
      { code: "KeyL", label: "L" },
      { code: "Semicolon", label: ";" },
      { code: "Quote", label: "'" },
      { code: "Backslash", label: "\\" },
    ],
  },
] as const;

// The physical bottom row has ten printable keys, so it covers the first ten
// degrees below the main A row. The 12-key rows above it retain complete
// chromatic coverage.
const BOTTOM_KEY_ROW = [
  { code: "KeyZ", label: "Z" },
  { code: "KeyX", label: "X" },
  { code: "KeyC", label: "C" },
  { code: "KeyV", label: "V" },
  { code: "KeyB", label: "B" },
  { code: "KeyN", label: "N" },
  { code: "KeyM", label: "M" },
  { code: "Comma", label: "," },
  { code: "Period", label: "." },
  { code: "Slash", label: "/" },
] as const;

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
export function useKeyboardControls(
  mainOctave: Ref<number>,
  /**
   * The Joystick's effective alteration, as the on-screen chord keys receive
   * it. The number row builds the same harmony, so it must be given the same
   * value; omission means "auto".
   */
  harmonyAlteration?: Ref<HarmonyAlteration>,
) {
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

  const getKeyboardMapping = (): KeyboardMapping => {
    const degreeCount = musicStore.currentScale.degreeCount;
    const visibleOctaves = keyboardDrawerStore.visibleOctaves;
    const mapping: KeyboardMapping = {};

    const addKeyRow = (
      keys: readonly { code: string; label: string }[],
      octave: number,
    ) => {
      if (
        octave < 1
        || octave > 8
        || !visibleOctaves.includes(octave)
      ) {
        return;
      }

      keys.slice(0, degreeCount).forEach((key, index) => {
        mapping[key.code] = {
          solfegeIndex: index,
          octave,
          label: key.label,
        };
      });
    };

    KEY_ROWS.forEach((row) => {
      addKeyRow(row.keys, mainOctave.value + row.octaveOffset);
    });
    addKeyRow(BOTTOM_KEY_ROW, mainOctave.value - 1);

    return mapping;
  };

  /** The chord row's harmony, under the same Joystick alteration. */
  const getCurrentChords = () =>
    buildHarmony({
      tonic: musicStore.currentKey as ChromaticNote,
      scaleType: musicStore.currentMode,
      octave: mainOctave.value,
      alteration: harmonyAlteration?.value ?? "auto",
    });

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
