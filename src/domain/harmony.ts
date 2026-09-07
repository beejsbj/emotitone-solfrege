import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import type { ChromaticNote, MusicalMode, Scale } from "@/types/music";

/**
 * HiChord-inspired performance choices. `auto` is the scale-derived center;
 * every other value is an explicit chord alteration and may borrow pitches.
 */
export const HARMONY_ALTERATIONS = [
  "auto",
  "flip",
  "dominant7",
  "dark",
  "jazzy7",
  "augmented",
  "sweet",
  "sus4",
  "lush9",
] as const;

export type HarmonyAlteration = (typeof HARMONY_ALTERATIONS)[number];

export type HarmonyChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "sus2"
  | "sus4"
  | "major6"
  | "major7"
  | "minor7"
  | "dominant7"
  | "major9"
  | "minor9"
  | "dyad"
  | "octave";

export type HarmonyPolicy =
  | "diatonic-thirds"
  | "scale-contained-ranked"
  | "chromatic-major-bank";

export interface HarmonyPitch {
  midi: number;
  name: string;
  pitchClass: ChromaticNote;
  pitchClassIndex: number;
  octave: number;
  /** Null identifies an intentional pitch outside the active scale. */
  scaleIndex: number | null;
}

export interface HarmonyVoicing {
  kind: "close-position";
  rootMidi: number;
  pitches: HarmonyPitch[];
}

export interface HarmonyChord {
  id: string;
  degreeIndex: number;
  root: ChromaticNote;
  symbol: string;
  accessibleName: string;
  quality: HarmonyChordQuality;
  policy: HarmonyPolicy;
  /** Kept separate from voicing so later inversions do not become qualities. */
  alteration: HarmonyAlteration;
  voicing: HarmonyVoicing;
}

export interface HarmonyRequest {
  tonic: ChromaticNote;
  scaleType: MusicalMode;
  octave?: number;
  alteration?: HarmonyAlteration;
}

interface ChordTemplate {
  quality: HarmonyChordQuality;
  intervals: readonly number[];
  suffix: string;
  spoken: string;
}

/**
 * The deterministic vocabulary/ranking for non-heptatonic automatic harmony.
 * Conventional thirds lead, followed by symmetric triads and suspensions.
 */
export const SCALE_CONTAINED_TEMPLATE_RANKING: readonly ChordTemplate[] = [
  { quality: "major", intervals: [0, 4, 7], suffix: "", spoken: "major" },
  { quality: "minor", intervals: [0, 3, 7], suffix: "m", spoken: "minor" },
  { quality: "diminished", intervals: [0, 3, 6], suffix: "dim", spoken: "diminished" },
  { quality: "augmented", intervals: [0, 4, 8], suffix: "aug", spoken: "augmented" },
  { quality: "sus2", intervals: [0, 2, 7], suffix: "sus2", spoken: "suspended second" },
  { quality: "sus4", intervals: [0, 5, 7], suffix: "sus4", spoken: "suspended fourth" },
];

const ALTERATION_TEMPLATES: Record<
  Exclude<HarmonyAlteration, "auto" | "flip" | "dark" | "jazzy7" | "sweet" | "lush9">,
  ChordTemplate
> = {
  augmented: {
    quality: "augmented",
    intervals: [0, 4, 8],
    suffix: "aug",
    spoken: "augmented",
  },
  dominant7: {
    quality: "dominant7",
    intervals: [0, 4, 7, 10],
    suffix: "7",
    spoken: "dominant seventh",
  },
  sus4: {
    quality: "sus4",
    intervals: [0, 5, 7],
    suffix: "sus4",
    spoken: "suspended fourth",
  },
};

const DYAD_INTERVAL_RANKING = [7, 5, 4, 3, 2, 10, 9, 1, 6, 8, 11] as const;

function modulo(value: number, base: number) {
  return ((value % base) + base) % base;
}

function tonicMidi(tonic: ChromaticNote, octave: number) {
  return (octave + 1) * 12 + CHROMATIC_NOTES.indexOf(tonic);
}

function pitchFromMidi(midi: number, scale: Scale, tonic: ChromaticNote): HarmonyPitch {
  const pitchClassIndex = modulo(midi, 12);
  const pitchClass = CHROMATIC_NOTES[pitchClassIndex];
  const octave = Math.floor(midi / 12) - 1;
  const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);
  const relativePitchClass = modulo(pitchClassIndex - tonicIndex, 12);
  const scaleIndex = scale.intervals.indexOf(relativePitchClass);

  return {
    midi,
    name: `${pitchClass}${octave}`,
    pitchClass,
    pitchClassIndex,
    octave,
    scaleIndex: scaleIndex === -1 ? null : scaleIndex,
  };
}

function templateForQuality(quality: HarmonyChordQuality): ChordTemplate | null {
  return SCALE_CONTAINED_TEMPLATE_RANKING.find((template) => template.quality === quality)
    ?? null;
}

function qualityFromIntervals(intervals: readonly number[]): ChordTemplate | null {
  const signature = intervals.map((interval) => modulo(interval, 12)).join(",");
  return SCALE_CONTAINED_TEMPLATE_RANKING.find(
    (template) => template.intervals.join(",") === signature,
  ) ?? null;
}

function isMajorQuality(quality: HarmonyChordQuality) {
  return ["major", "major6", "major7", "major9", "augmented"].includes(quality);
}

function pitchesForIntervals(
  rootMidi: number,
  intervals: readonly number[],
  scale: Scale,
  tonic: ChromaticNote,
) {
  return intervals.map((interval) => pitchFromMidi(rootMidi + interval, scale, tonic));
}

function chordFromTemplate(
  degreeIndex: number,
  rootMidi: number,
  template: ChordTemplate,
  policy: HarmonyPolicy,
  alteration: HarmonyAlteration,
  scale: Scale,
  tonic: ChromaticNote,
): HarmonyChord {
  const root = CHROMATIC_NOTES[modulo(rootMidi, 12)];
  const symbol = `${root}${template.suffix}`;

  return {
    id: `degree-${degreeIndex + 1}`,
    degreeIndex,
    root,
    symbol,
    accessibleName: `${root} ${template.spoken} chord`,
    quality: template.quality,
    policy,
    alteration,
    voicing: {
      kind: "close-position",
      rootMidi,
      pitches: pitchesForIntervals(rootMidi, template.intervals, scale, tonic),
    },
  };
}

function diatonicChord(
  degreeIndex: number,
  scale: Scale,
  tonic: ChromaticNote,
  baseMidi: number,
): HarmonyChord {
  const memberOrdinals = [degreeIndex, degreeIndex + 2, degreeIndex + 4];
  const midi = memberOrdinals.map((ordinal) => {
    const wrappedIndex = ordinal % scale.degreeCount;
    const octaveOffset = Math.floor(ordinal / scale.degreeCount) * 12;
    return baseMidi + scale.intervals[wrappedIndex] + octaveOffset;
  });
  const rootMidi = midi[0];
  const intervals = midi.map((memberMidi) => memberMidi - rootMidi);
  const template = qualityFromIntervals(intervals) ?? {
    quality: "dyad" as const,
    intervals,
    suffix: "",
    spoken: "scale chord",
  };

  return chordFromTemplate(
    degreeIndex,
    rootMidi,
    template,
    "diatonic-thirds",
    "auto",
    scale,
    tonic,
  );
}

function scaleContainedChord(
  degreeIndex: number,
  scale: Scale,
  tonic: ChromaticNote,
  baseMidi: number,
): HarmonyChord {
  const rootOffset = scale.intervals[degreeIndex];
  const rootMidi = baseMidi + rootOffset;
  const scalePitchClasses = new Set(scale.intervals.map((interval) => modulo(interval, 12)));
  const template = SCALE_CONTAINED_TEMPLATE_RANKING.find((candidate) =>
    candidate.intervals.every((interval) =>
      scalePitchClasses.has(modulo(rootOffset + interval, 12)),
    ),
  );

  if (template) {
    return chordFromTemplate(
      degreeIndex,
      rootMidi,
      template,
      "scale-contained-ranked",
      "auto",
      scale,
      tonic,
    );
  }

  const relativeScaleIntervals = new Set(
    scale.intervals.map((interval) => modulo(interval - rootOffset, 12)),
  );
  const dyadInterval = DYAD_INTERVAL_RANKING.find((interval) =>
    relativeScaleIntervals.has(interval),
  );
  const root = CHROMATIC_NOTES[modulo(rootMidi, 12)];

  if (dyadInterval !== undefined) {
    const upper = CHROMATIC_NOTES[modulo(rootMidi + dyadInterval, 12)];
    return {
      id: `degree-${degreeIndex + 1}`,
      degreeIndex,
      root,
      symbol: `${root}–${upper}`,
      accessibleName: `${root} and ${upper} dyad`,
      quality: "dyad",
      policy: "scale-contained-ranked",
      alteration: "auto",
      voicing: {
        kind: "close-position",
        rootMidi,
        pitches: pitchesForIntervals(rootMidi, [0, dyadInterval], scale, tonic),
      },
    };
  }

  return {
    id: `degree-${degreeIndex + 1}`,
    degreeIndex,
    root,
    symbol: `${root} oct`,
    accessibleName: `${root} octave`,
    quality: "octave",
    policy: "scale-contained-ranked",
    alteration: "auto",
    voicing: {
      kind: "close-position",
      rootMidi,
      pitches: pitchesForIntervals(rootMidi, [0, 12], scale, tonic),
    },
  };
}

function explicitTemplate(
  alteration: Exclude<HarmonyAlteration, "auto">,
  baseQuality: HarmonyChordQuality,
): ChordTemplate {
  if (alteration in ALTERATION_TEMPLATES) {
    return ALTERATION_TEMPLATES[alteration as keyof typeof ALTERATION_TEMPLATES];
  }

  if (alteration === "flip") {
    return templateForQuality(isMajorQuality(baseQuality) ? "minor" : "major")!;
  }

  if (alteration === "dark") {
    return templateForQuality(isMajorQuality(baseQuality) ? "minor" : "diminished")!;
  }

  if (alteration === "jazzy7") {
    return isMajorQuality(baseQuality)
      ? { quality: "major7", intervals: [0, 4, 7, 11], suffix: "maj7", spoken: "major seventh" }
      : { quality: "minor7", intervals: [0, 3, 7, 10], suffix: "m7", spoken: "minor seventh" };
  }

  if (alteration === "sweet") {
    return isMajorQuality(baseQuality)
      ? { quality: "major6", intervals: [0, 4, 7, 9], suffix: "6", spoken: "major sixth" }
      : templateForQuality("sus2")!;
  }

  return isMajorQuality(baseQuality)
    ? { quality: "major9", intervals: [0, 4, 7, 11, 14], suffix: "maj9", spoken: "major ninth" }
    : { quality: "minor9", intervals: [0, 3, 7, 10, 14], suffix: "m9", spoken: "minor ninth" };
}

function alterChord(
  chord: HarmonyChord,
  alteration: Exclude<HarmonyAlteration, "auto">,
  scale: Scale,
  tonic: ChromaticNote,
): HarmonyChord {
  const template = explicitTemplate(alteration, chord.quality);
  return chordFromTemplate(
    chord.degreeIndex,
    chord.voicing.rootMidi,
    template,
    chord.policy,
    alteration,
    scale,
    tonic,
  );
}

export function buildHarmony({
  tonic,
  scaleType,
  octave = 4,
  alteration = "auto",
}: HarmonyRequest): HarmonyChord[] {
  const scale = getScaleForMode(scaleType);
  const baseMidi = tonicMidi(tonic, octave);
  const baseChords: HarmonyChord[] = scale.intervals.map((_, degreeIndex) => {
    if (scale.family === "chromatic") {
      return chordFromTemplate(
        degreeIndex,
        baseMidi + scale.intervals[degreeIndex],
        SCALE_CONTAINED_TEMPLATE_RANKING[0],
        "chromatic-major-bank",
        "auto",
        scale,
        tonic,
      );
    }

    return scale.degreeCount === 7
      ? diatonicChord(degreeIndex, scale, tonic, baseMidi)
      : scaleContainedChord(degreeIndex, scale, tonic, baseMidi);
  });

  return alteration === "auto"
    ? baseChords
    : baseChords.map((chord) => alterChord(chord, alteration, scale, tonic));
}
