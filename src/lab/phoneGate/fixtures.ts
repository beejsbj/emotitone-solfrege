/**
 * The phone gate's loop (BJS-494): four piano members at a typical tempo,
 * dense enough to load the render thread (about 32 onsets a bar, before live
 * notes on top), in C major so every pitch has a plain identity.
 */
import type { LooperMemberRequest } from "@/services/patternTransport";
import { buildPatternMember, patternNoteIdentity } from "@/services/patternMember";
import type { LogNote } from "@/types/patterns";
import type { GateMemberTable } from "./oracle";

export const GATE_INSTRUMENT = "piano";
export const GATE_BPM = 100;
export const GATE_BEAT_MS = 60000 / GATE_BPM;
export const GATE_BAR_MS = GATE_BEAT_MS * 4;

/** One note `beats` long, starting `beat` beats into its phrase. */
function gateNote(member: string, index: number, name: string, beat: number, beats: number): LogNote {
  const identity = patternNoteIdentity(name, "C", "major");
  if (!identity) throw new Error(`${name} has no identity in C major`);
  const pressTime = beat * GATE_BEAT_MS;
  const duration = beats * GATE_BEAT_MS;
  return {
    id: `gate-${member}-${index}`,
    note: name,
    key: "C",
    mode: "major",
    scaleDegree: identity.solfegeIndex + 1,
    scaleIndex: identity.solfegeIndex,
    pitchClassIndex: identity.pitchClassIndex,
    isBorrowed: false,
    solfege: identity.solfege,
    octave: identity.octave,
    frequency: identity.frequency,
    instrument: GATE_INSTRUMENT,
    bpm: GATE_BPM,
    velocity: .7,
    pressTime,
    releaseTime: pressTime + duration,
    duration,
    sessionId: "phone-gate",
  };
}

interface Voice { id: string; label: string; bars: number; notes: [name: string, beat: number, beats: number][] }

const VOICES: Voice[] = [
  { id: "gate-melody", label: "Melody", bars: 1, notes: ["C5", "D5", "E5", "G5", "E5", "D5", "C5", "G4"]
    .map((name, index) => [name, index / 2, .4]) },
  { id: "gate-bass", label: "Bass", bars: 2, notes: [["C3", 0, 1.8], ["G2", 2, 1.8], ["A2", 4, 1.8], ["F2", 6, 1.8]] },
  { id: "gate-chords", label: "Chords", bars: 2, notes: [["C4", "E4", "G4"], ["G3", "B3", "D4"], ["A3", "C4", "E4"], ["F3", "A3", "C4"]]
    .flatMap((chord, index) => chord.map(name => [name, index * 2, 1.5] as [string, number, number])) },
  { id: "gate-arp", label: "Arp", bars: 1, notes: ["C4", "E4", "G4", "C5", "E5", "C5", "G4", "E4"]
    .flatMap((name, index) => [[name, index / 2, .2], [name, index / 2 + .25, .2]] as [string, number, number][]) },
];

export const GATE_MEMBER_LABELS: Record<string, string> = Object.fromEntries(VOICES.map(voice => [voice.id, voice.label]));

/** The four Looper members, as the Play key would send them. */
export function gateMembers(): LooperMemberRequest[] {
  return VOICES.map(voice => ({
    id: voice.id,
    notes: voice.notes.map(([name, beat, beats], index) => gateNote(voice.id, index, name, beat, beats)),
    config: { sourceBpm: GATE_BPM, bpm: GATE_BPM, beatsPerBar: 4, patternDurationMs: voice.bars * GATE_BAR_MS },
    instrument: GATE_INSTRUMENT,
    key: "C",
    mode: "major",
    lengthBars: voice.bars,
  }));
}

/** The tables the transport plays for these members, built by the same pure plan (the oracle's input). */
export function gateTables(members: readonly LooperMemberRequest[], instrumentId = GATE_INSTRUMENT): GateMemberTable[] {
  return members.map((member, index) => {
    const { table } = buildPatternMember({ ...member, generation: index + 1, instrumentId });
    return { id: member.id, begin: Array.from(table.begin), lengthBars: member.lengthBars ?? table.lengthBars,
      offsetBars: member.offsetBars ?? 0, rate: member.rate ?? 1 };
  });
}
