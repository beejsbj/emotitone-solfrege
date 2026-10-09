import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import {
  nameChord,
  spellPitch,
  spellPitchClass,
  spokenPitchName,
  withOctave,
  type ChordQuality,
  type MusicalContext,
} from "@/domain/musicalIdentity";
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
  /** Sharps-only scientific pitch: the internal attack and lookup key. */
  name: string;
  /** Spelled scientific pitch for labels, from the chord root (e.g. "Bb4"). */
  label: string;
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
  /** Sharps-only internal root. */
  root: ChromaticNote;
  /** Root spelled in the key, e.g. "Bb". */
  rootSpelling: string;
  /** Lead-sheet symbol from the musical-identity formatter. */
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

type NamedChordQuality = Exclude<HarmonyChordQuality, "dyad" | "octave">;

interface ChordTemplate {
  quality: NamedChordQuality;
  intervals: readonly number[];
}

/**
 * The deterministic vocabulary/ranking for non-heptatonic automatic harmony.
 * Conventional thirds lead, followed by symmetric triads and suspensions.
 */
export const SCALE_CONTAINED_TEMPLATE_RANKING: readonly ChordTemplate[] = [
  { quality: "major", intervals: [0, 4, 7] },
  { quality: "minor", intervals: [0, 3, 7] },
  { quality: "diminished", intervals: [0, 3, 6] },
  { quality: "augmented", intervals: [0, 4, 8] },
  { quality: "sus2", intervals: [0, 2, 7] },
  { quality: "sus4", intervals: [0, 5, 7] },
];

const ALTERATION_TEMPLATES: Record<
  Exclude<HarmonyAlteration, "auto" | "flip" | "dark" | "jazzy7" | "sweet" | "lush9">,
  ChordTemplate
> = {
  augmented: { quality: "augmented", intervals: [0, 4, 8] },
  dominant7: { quality: "dominant7", intervals: [0, 4, 7, 10] },
  sus4: { quality: "sus4", intervals: [0, 5, 7] },
};

const DYAD_INTERVAL_RANKING = [7, 5, 4, 3, 2, 10, 9, 1, 6, 8, 11] as const;

function modulo(value: number, base: number) {
  return ((value % base) + base) % base;
}

function tonicMidi(tonic: ChromaticNote, octave: number) {
  return (octave + 1) * 12 + CHROMATIC_NOTES.indexOf(tonic);
}

function pitchFromMidi(
  midi: number,
  scale: Scale,
  tonic: ChromaticNote,
  spelling: string | null,
): HarmonyPitch {
  const pitchClassIndex = modulo(midi, 12);
  const pitchClass = CHROMATIC_NOTES[pitchClassIndex];
  const octave = Math.floor(midi / 12) - 1;
  const tonicIndex = CHROMATIC_NOTES.indexOf(tonic);
  const relativePitchClass = modulo(pitchClassIndex - tonicIndex, 12);
  const scaleIndex = scale.intervals.indexOf(relativePitchClass);
  const context = { tonic, mode: scale.mode };

  return {
    midi,
    name: `${pitchClass}${octave}`,
    label: spelling ? withOctave(spelling, midi) : spellPitch(midi, context)!,
    pitchClass,
    pitchClassIndex,
    octave,
    scaleIndex: scaleIndex === -1 ? null : scaleIndex,
  };
}

function templateForQuality(quality: NamedChordQuality): ChordTemplate | null {
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

/**
 * `spellings` are the members' spelled pitch classes in interval order (from
 * the chord root); without them each pitch is spelled in the key.
 */
function voicingForIntervals(
  rootMidi: number,
  intervals: readonly number[],
  scale: Scale,
  tonic: ChromaticNote,
  spellings: readonly string[] = [],
) {
  let playableRootMidi = rootMidi;
  const lowestInterval = Math.min(...intervals);
  const highestInterval = Math.max(...intervals);

  while (playableRootMidi + highestInterval > 127) {
    playableRootMidi -= 12;
  }
  while (playableRootMidi + lowestInterval < 0) {
    playableRootMidi += 12;
  }

  return {
    kind: "close-position" as const,
    rootMidi: playableRootMidi,
    pitches: intervals.map((interval, index) =>
      pitchFromMidi(playableRootMidi + interval, scale, tonic, spellings[index] ?? null)
    ),
  };
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
  const identity = nameChord(rootMidi, template.quality satisfies ChordQuality, {
    tonic,
    mode: scale.mode,
  });

  return {
    id: `degree-${degreeIndex + 1}`,
    degreeIndex,
    root,
    rootSpelling: identity.root,
    symbol: identity.symbol,
    accessibleName: `${identity.spoken} chord`,
    quality: template.quality,
    policy,
    alteration,
    voicing: voicingForIntervals(
      rootMidi,
      template.intervals,
      scale,
      tonic,
      identity.members,
    ),
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
  const template = qualityFromIntervals(intervals);

  if (!template) {
    // Unreachable for stacked thirds in today's modes; kept truthful anyway.
    const context = { tonic, mode: scale.mode };
    const rootSpelling = spellPitchClass(rootMidi, context)!;
    return {
      id: `degree-${degreeIndex + 1}`,
      degreeIndex,
      root: CHROMATIC_NOTES[modulo(rootMidi, 12)],
      rootSpelling,
      symbol: rootSpelling,
      accessibleName: `${spokenPitchName(rootSpelling)} scale chord`,
      quality: "dyad",
      policy: "diatonic-thirds",
      alteration: "auto",
      voicing: voicingForIntervals(rootMidi, intervals, scale, tonic),
    };
  }

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
  // Both members of a fallback dyad or octave are scale tones: key spelling.
  const context: MusicalContext = { tonic, mode: scale.mode };
  const rootSpelling = spellPitchClass(rootMidi, context)!;

  if (dyadInterval !== undefined) {
    const upper = spellPitchClass(rootMidi + dyadInterval, context)!;
    return {
      id: `degree-${degreeIndex + 1}`,
      degreeIndex,
      root,
      rootSpelling,
      symbol: `${rootSpelling}–${upper}`,
      accessibleName: `${spokenPitchName(rootSpelling)} and ${spokenPitchName(upper)} dyad`,
      quality: "dyad",
      policy: "scale-contained-ranked",
      alteration: "auto",
      voicing: voicingForIntervals(rootMidi, [0, dyadInterval], scale, tonic),
    };
  }

  return {
    id: `degree-${degreeIndex + 1}`,
    degreeIndex,
    root,
    rootSpelling,
    symbol: `${rootSpelling} oct`,
    accessibleName: `${spokenPitchName(rootSpelling)} octave`,
    quality: "octave",
    policy: "scale-contained-ranked",
    alteration: "auto",
    voicing: voicingForIntervals(rootMidi, [0, 12], scale, tonic),
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
      ? { quality: "major7", intervals: [0, 4, 7, 11] }
      : { quality: "minor7", intervals: [0, 3, 7, 10] };
  }

  if (alteration === "sweet") {
    return isMajorQuality(baseQuality)
      ? { quality: "major6", intervals: [0, 4, 7, 9] }
      : templateForQuality("sus2")!;
  }

  return isMajorQuality(baseQuality)
    ? { quality: "major9", intervals: [0, 4, 7, 11, 14] }
    : { quality: "minor9", intervals: [0, 3, 7, 10, 14] };
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
