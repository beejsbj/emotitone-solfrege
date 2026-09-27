import { computed, inject } from "vue";
import { CHROMATIC_NOTES } from "@/data";
import {
  noteColorResolverKey,
  staticNoteColorResolver,
} from "@/components/primatives/noteColorContext";
import type { LabNoteLabel, LabNoteProps } from "@/types/primitivesLab";

export const LAB_NOTE_DEFAULTS = {
  syllable: "Do",
  degree: "I",
  rawPitch: "C4",
  primary: "syllable" as LabNoteLabel,
  visibleLabels: () => ["syllable", "degree", "raw"] as LabNoteLabel[],
  proportion: "medium" as const,
  pitchClassIndex: 0,
  octave: 4,
  mode: "major" as const,
  musicKey: "C" as const,
  accidental: null,
  sounding: false,
};

const pretty = (value: string) => value.replace(/b/g, "♭").replace(/#/g, "♯");

/**
 * Identity, labels, and Music Color for a lab Note direction. Colour comes only
 * from the same injected resolver production Note uses, so every direction and
 * the production baseline show the identical numeric OKLCH result.
 */
export function useLabNote(props: Required<Omit<LabNoteProps, "accidental">> & { accidental: boolean | null }) {
  const resolver = inject(noteColorResolverKey, staticNoteColorResolver);

  const isAccidental = computed(() =>
    typeof props.accidental === "boolean" ? props.accidental : /[#b♯♭]/.test(props.rawPitch),
  );

  const color = computed(() => resolver.getKeyBackgroundByPitchClass(
    props.pitchClassIndex,
    props.mode,
    props.musicKey,
    props.octave,
    "colored",
    isAccidental.value,
  ));

  const labels = computed<Record<LabNoteLabel, string>>(() => ({
    syllable: props.syllable,
    degree: pretty(props.degree),
    raw: pretty(props.rawPitch),
  }));

  const visible = computed(() =>
    (["syllable", "degree", "raw"] as LabNoteLabel[]).filter((kind) => props.visibleLabels.includes(kind) && labels.value[kind]),
  );
  const primaryText = computed(() => (visible.value.includes(props.primary) ? labels.value[props.primary] : ""));
  const auxiliary = computed(() => visible.value.filter((kind) => kind !== props.primary).map((kind) => ({ kind, text: labels.value[kind] })));

  /** 0 at the tonic, 11 a semitone below the next tonic. */
  const heightInOctave = computed(() => {
    const tonic = CHROMATIC_NOTES.indexOf(props.musicKey);
    return (((props.pitchClassIndex - tonic) % 12) + 12) % 12;
  });

  const ariaLabel = computed(() => [props.syllable, props.degree, props.rawPitch].filter(Boolean).join(", "));

  // Production's piano-key contrast rule: naturals white text, accidentals black.
  const labelMain = computed(() => (isAccidental.value ? "rgba(0, 0, 0, .88)" : "rgba(255, 255, 255, .94)"));
  const labelSoft = computed(() => (isAccidental.value ? "rgba(0, 0, 0, .62)" : "rgba(255, 255, 255, .74)"));

  return { color, isAccidental, labels, primaryText, auxiliary, heightInOctave, ariaLabel, labelMain, labelSoft };
}
