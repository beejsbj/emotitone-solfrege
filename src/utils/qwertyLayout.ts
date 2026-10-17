/**
 * The QWERTY performance layout (W3), as data. The QWERTY adapter
 * (`useKeyboardControls`) plays it; the Keyboard container reads it to fill
 * each key's `aria-keyshortcuts`, so the two can never disagree.
 */

export interface QwertyKey {
  /** `KeyboardEvent.code`: the physical key, whatever the user's layout. */
  code: string;
  /** What the key prints on a US layout; also its `aria-keyshortcuts` name. */
  label: string;
}

export interface QwertyNote {
  solfegeIndex: number;
  octave: number;
  label: string;
}

/** The number row presses the chord row's chords, one per scale degree. */
export const CHORD_ROW_KEYS: readonly QwertyKey[] = [
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
];

/**
 * The letter rows, each starting on the tonic of its octave (relative to the
 * main octave). The physical bottom row has ten printable keys.
 */
export const NOTE_ROWS: readonly { octaveOffset: number; keys: readonly QwertyKey[] }[] = [
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
  {
    octaveOffset: -1,
    keys: [
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
    ],
  },
];

/**
 * Which note each letter key plays. Along a row, the keys climb the scale
 * and keep climbing: once the scale's degrees are used up, the next key is
 * the tonic an octave up (in a seven-note scale, K on the home row is the
 * next octave's do). A key plays only a note whose row is on screen.
 */
export function qwertyNoteMapping(options: {
  degreeCount: number;
  mainOctave: number;
  visibleOctaves: readonly number[];
}): Record<string, QwertyNote> {
  const { degreeCount, mainOctave, visibleOctaves } = options;
  const mapping: Record<string, QwertyNote> = {};
  if (degreeCount < 1) return mapping;

  for (const row of NOTE_ROWS) {
    row.keys.forEach((key, index) => {
      const octave = mainOctave + row.octaveOffset + Math.floor(index / degreeCount);
      if (octave < 1 || octave > 8 || !visibleOctaves.includes(octave)) return;
      mapping[key.code] = { solfegeIndex: index % degreeCount, octave, label: key.label };
    });
  }
  return mapping;
}

/**
 * Every shortcut for each on-screen key, by its `<scaleIndex>_<octave>` id,
 * in `aria-keyshortcuts` form (space-separated, in row order).
 */
export function qwertyShortcutsByKey(mapping: Record<string, QwertyNote>) {
  const shortcuts = new Map<string, string>();
  for (const note of Object.values(mapping)) {
    const id = `${note.solfegeIndex}_${note.octave}`;
    const existing = shortcuts.get(id);
    shortcuts.set(id, existing ? `${existing} ${note.label}` : note.label);
  }
  return shortcuts;
}
