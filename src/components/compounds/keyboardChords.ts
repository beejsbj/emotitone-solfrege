import type { ChordMember } from "@/components/compounds/Chord.vue";
import type { NoteLabel, NoteSurfaceStyle } from "@/components/primatives/Note.vue";
import type { HarmonyChord } from "@/domain/harmony";
import { spelledPitchSolfege } from "@/domain/musicalIdentity";
import type { ChromaticNote, MusicalMode } from "@/types/music";

/**
 * Pure chord-row view data for the Keyboard. The view builds it from props in
 * controlled usage; the production container builds it with held snapshots.
 */
export interface KeyboardChordView {
  /** Live settings used by a new owner attacking this degree. */
  attackHarmony: HarmonyChord;
  /** Snapshot shown while any existing owner holds this degree. */
  harmony: HarmonyChord;
  members: ChordMember[];
  pressed: boolean;
  /** Held snapshot whose degree no longer exists in the live harmony. */
  orphaned: boolean;
  /** `aria-keyshortcuts` for the chord key (its number-row key). */
  shortcut?: string;
}

const romanDegrees = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
];

export const degreeLabel = (number: number) => romanDegrees[number - 1] ?? String(number);

export function chordMembers(
  chord: HarmonyChord,
  mode: MusicalMode,
  key: ChromaticNote,
  surfaceStyle: NoteSurfaceStyle,
  primary: NoteLabel,
  keyBrightness = 1,
  keySaturation = 1,
  laBasedMinor = false,
): ChordMember[] {
  return chord.voicing.pitches.map((pitch, voicingOrder) => {
    const label = primary === "degree" && pitch.scaleIndex === null ? "raw" : primary;
    return {
      id: `${chord.id}:${pitch.name}:${voicingOrder}`,
      rawPitch: pitch.label,
      syllable: spelledPitchSolfege(pitch.label, { tonic: key, mode }, laBasedMinor),
      degree: pitch.scaleIndex === null ? undefined : degreeLabel(pitch.scaleIndex + 1),
      primary: label,
      visibleLabels: [label],
      scaleIndex: pitch.scaleIndex ?? chord.degreeIndex,
      pitchClassIndex: pitch.pitchClassIndex,
      octave: pitch.octave,
      mode,
      musicKey: key,
      surfaceStyle,
      accidental: pitch.pitchClass.includes("#"),
      keyBrightness,
      keySaturation,
      voicingOrder,
      // Playable keys retain musical identity at rest; CodeStrip owns temporal progress.
      progress: 1,
    };
  });
}
