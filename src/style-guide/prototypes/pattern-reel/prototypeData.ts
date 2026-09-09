import { defaultPatterns } from "@/data/patterns";
import type { Pattern } from "@/types/patterns";
import type { PatternReelPrototypeItem } from "./types";

const SCALE_COLORS = [
  "var(--note-do)",
  "var(--note-re)",
  "var(--note-mi)",
  "var(--note-fa)",
  "var(--note-sol)",
  "var(--note-la)",
  "var(--note-ti)",
];

function displayInstrument(instrument: string) {
  const source = instrument.startsWith("gm_") ? instrument.slice(3) : instrument;
  return source.replace(/_/g, " ");
}

function displayNote(note: string) {
  return note.replace(/\d+$/, "");
}

function toPrototypeItem(pattern: Pattern, index: number): PatternReelPrototypeItem {
  const ordinal = String(index + 1).padStart(2, "0");
  const instrument = displayInstrument(pattern.instrument);
  const context = `${instrument} / ${pattern.key} ${pattern.mode}`;

  return {
    id: pattern.id,
    ordinal,
    name: pattern.name ?? "Untitled pattern",
    label: `Pattern ${ordinal} — ${context}`,
    metadata: `${pattern.notes.length} notes · library`,
    context,
    spine: SCALE_COLORS[pattern.notes[0]?.scaleIndex ?? 0] ?? "var(--ivory)",
    barTape: pattern.notes.map((note) => ({
      color: SCALE_COLORS[note.scaleIndex] ?? "var(--ivory-3)",
      durationMs: note.duration,
    })),
    codeTokens: pattern.notes.slice(0, 9).map((note) => displayNote(note.note)),
  };
}

const libraryPatterns = defaultPatterns.map(toPrototypeItem);

export const patternReelPrototypeItems: PatternReelPrototypeItem[] = [
  ...libraryPatterns,
  {
    id: "prototype-current-take",
    ordinal: String(libraryPatterns.length + 1).padStart(2, "0"),
    name: "Current take",
    label: `Pattern ${String(libraryPatterns.length + 1).padStart(2, "0")} — Rhodes / C major`,
    metadata: "1 note · recording",
    context: "Rhodes / C major",
    spine: "var(--note-do)",
    barTape: [{ color: "var(--note-do)", durationMs: 460 }],
    codeTokens: ["C4"],
    isLive: true,
  },
];
