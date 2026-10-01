import type { KeyboardRowView } from "@/components/compounds/Keyboard.vue";
import { visibleKeyboardOctaves } from "@/components/compounds/keyboardEdition";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";

/*
 * Guide-only fixtures for the Key and Keyboard lab benches. Rows are built
 * the way the production wiring builds them (real major-scale solfège, real
 * pitch classes, scientific raw pitch), so the controlled Keyboard renders
 * exactly the Keys the phone shows in C major.
 */

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** Pitch state keyed by raw pitch, e.g. `{ pressed: ["E4"], sounding: ["E4", "A4"] }`. */
export interface KeyLabState {
  pressed?: readonly string[];
  sounding?: readonly string[];
}

export function cMajorRows(
  rowCount: number,
  state: KeyLabState = {},
  options: { mainOctave?: number; only?: readonly string[] } = {},
): KeyboardRowView[] {
  const mainOctave = options.mainOctave ?? 4;
  const scale = getScaleForMode("major");

  return visibleKeyboardOctaves(mainOctave, rowCount).map((octave) => {
    const keys = scale.solfege.map((solfege, scaleIndex) => {
      const pitchClassIndex = scale.intervals[scaleIndex] % 12;
      const rawPitch = `${CHROMATIC_NOTES[pitchClassIndex]}${octave}`;
      return {
        id: `${scaleIndex}_${octave}`,
        syllable: solfege.name,
        degree: ROMAN[solfege.number - 1] ?? String(solfege.number),
        rawPitch,
        scaleIndex,
        pitchClassIndex,
        colorOctave: octave,
        mode: "major" as const,
        musicKey: "C" as const,
        accidental: false,
        pressed: state.pressed?.includes(rawPitch) ?? false,
        sounding: state.sounding?.includes(rawPitch) ?? false,
      };
    });

    return {
      octave,
      keys: options.only
        ? options.only.flatMap((syllable) => keys.filter((key) => key.syllable === syllable))
        : keys,
    };
  });
}
