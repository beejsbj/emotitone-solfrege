import { Chord, Note } from "@tonaljs/tonal";

/** Expressive prompts, not measured emotions. Describe sounding pitches, not controls. */
export function describeHarmonicEmotion(
  notes: readonly string[],
  chordLabel: string | null
): string {
  const chord = Chord.get(chordLabel?.split("/")[0] ?? "");
  const intervals = new Set(chord.intervals);
  const spacious = ["9M", "9m", "9A", "11P", "11A", "13M", "13m"]
    .some((interval) => intervals.has(interval));
  let description = "";

  if (chord.quality === "Diminished") {
    description = "Uneasy and searching";
  } else if (chord.quality === "Augmented") {
    description = "Dreamy and unsettled";
  } else if (chord.quality === "Minor") {
    description = intervals.has("7M") ? "Tender with an edge"
      : intervals.has("7m") ? "Mellow and reflective"
      : intervals.has("6M") ? "Bittersweet and warm"
      : "Tender and reflective";
  } else if (chord.quality === "Major") {
    description = intervals.has("7m") ? "Restless, reaching onward"
      : intervals.has("7M") ? "Warm and wistful"
      : intervals.has("6M") ? "Sweet and settled"
      : "Bright and settled";
  } else if (intervals.has("4P") && !intervals.has("3M") && !intervals.has("3m")) {
    description = "Open, waiting to settle";
  } else if (intervals.has("2M") && !intervals.has("3M") && !intervals.has("3m")) {
    description = "Airy and open";
  }

  if (description) return spacious ? `${description}, spacious` : description;

  // Unrecognized collections: describe interval texture without inventing a chord root.
  const pitches = [...new Set(notes.map((note) => Note.chroma(note))
    .filter((pitch): pitch is number => pitch !== undefined))];
  const distances = new Set<number>();
  pitches.forEach((pitch, index) => pitches.slice(index + 1).forEach((other) => {
    const distance = Math.abs(pitch - other);
    distances.add(Math.min(distance, 12 - distance));
  }));
  if (distances.has(1)) return "Close friction, restless energy";
  if (distances.has(6)) return "Tense and searching";
  if (distances.has(2)) return "Open with a gentle rub";
  if (distances.has(3) || distances.has(4)) return "Softly interwoven";
  return "Open and grounded";
}
