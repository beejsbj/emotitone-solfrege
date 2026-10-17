/**
 * Build a pattern transport member from a phrase's note data (BJS-485).
 *
 * Timing, gates and per-note controls come from the same walk that writes the
 * exported Strudel text (`planRecordedPattern`), so the sound and the code
 * cannot disagree. The worklet gets flat columns; the main thread keeps each
 * note's immutable identity (key, mode, solfège, spelling) under the table's
 * generation, because a queued key change can leave the store ahead of the
 * sound.
 */
import { Note as TonalNote } from "@tonaljs/tonal";
import type { TransportMemberTable } from "@/audio/live/transport";
import { OPEN_CUTOFF_HZ, type LiveShaping } from "@/audio/liveShaping";
import { identifyPitch, pitchClassOf, pitchSolfegeData } from "@/domain/musicalIdentity";
import { CHROMATIC_NOTES } from "@/services/music";
import { planRecordedPattern, type StrudelConfig } from "@/services/StrudelNotation";
import type { LiveArticulation } from "@/services/liveArticulation";
import type { LogNote } from "@/types/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

/** The note-event payload a transport note carries, fixed when its table is built. */
export interface PatternNoteContext {
  /** The phrase note's id (`sourceNoteId` on events). */
  sourceNoteId: string;
  solfege: SolfegeData;
  noteName: string;
  frequency: number;
  octave: number;
  keyboardOctave: number;
  solfegeIndex: number;
  pitchClassIndex: number;
  isBorrowed: boolean;
  mode: MusicalMode;
  key: ChromaticNote;
  instrument: string;
  velocity?: number;
  articulation: LiveArticulation;
}

export interface PatternMember {
  table: TransportMemberTable;
  /** Indexed like the table's columns. */
  notes: readonly PatternNoteContext[];
}

export interface PatternMemberRequest {
  /** The phrase id: the member id and every event's `phraseId`. */
  id: string;
  generation: number;
  notes: readonly LogNote[];
  /** The export configuration the Code Strip renders the same phrase with. */
  config: Partial<StrudelConfig>;
  /** The worklet instrument id the member plays. */
  instrumentId: string;
  /** The display name events report as `instrument`. */
  instrument: string;
  key: ChromaticNote;
  mode: MusicalMode;
  laBasedMinor?: boolean;
}

function shapingOf(config: Partial<StrudelConfig>): LiveShaping {
  const shape = config.shape;
  return {
    cutoff: shape?.cutoff ?? OPEN_CUTOFF_HZ,
    resonance: shape?.resonance ?? 0,
    room: shape?.room ?? 0,
    delay: shape?.delay ?? 0,
  };
}

/** The Stage and keys identity of one pitch under a fixed key and mode. */
export function patternNoteIdentity(noteName: string, key: ChromaticNote, mode: MusicalMode, laBasedMinor = false) {
  const parsed = TonalNote.get(noteName);
  const pitchClass = pitchClassOf(noteName);
  if (parsed.empty || parsed.oct === undefined || pitchClass === null) return null;
  const chromatic = CHROMATIC_NOTES[pitchClass] as ChromaticNote;
  const context = { tonic: key, mode };
  const solfege = pitchSolfegeData(chromatic, context, laBasedMinor);
  if (!solfege) return null;
  const solfegeIndex = identifyPitch(chromatic, context)?.scaleIndex ?? -1;
  const tonicIndex = CHROMATIC_NOTES.indexOf(key);
  return {
    solfege,
    noteName: parsed.name,
    frequency: parsed.freq ?? 440 * 2 ** (((parsed.midi ?? 69) - 69) / 12),
    octave: parsed.oct,
    keyboardOctave: solfegeIndex === -1 || tonicIndex === -1 ? parsed.oct : parsed.oct - Number(pitchClass < tonicIndex),
    solfegeIndex,
    pitchClassIndex: pitchClass,
    isBorrowed: solfegeIndex === -1,
  };
}

export function buildPatternMember(request: PatternMemberRequest): PatternMember {
  const plan = planRecordedPattern(request.notes as LogNote[], request.config);
  const planned = plan.notes.filter(note => patternNoteIdentity(note.note.note, request.key, request.mode) !== null);
  const count = planned.length;
  const f64 = () => new Float64Array(count);
  const f32 = () => new Float32Array(count);
  const table: TransportMemberTable = {
    id: request.id,
    generation: request.generation,
    instrumentId: request.instrumentId,
    lengthBars: plan.lengthBars,
    shaping: shapingOf(request.config),
    begin: f64(), gate: f64(), pitch: f32(), velocity: f32(),
    attack: f32(), decay: f32(), sustain: f32(), release: f32(),
    pitchStart: new Uint32Array(count), pitchCount: new Uint32Array(count),
    pitchTime: new Float32Array(0), pitchCents: new Float32Array(0),
    gainStart: new Uint32Array(count), gainCount: new Uint32Array(count),
    gainTime: new Float32Array(0), gainValue: new Float32Array(0),
  };
  const pitchPoints: { time: number; value: number }[] = [];
  const gainPoints: { time: number; value: number }[] = [];
  const contexts: PatternNoteContext[] = [];
  const bars = (ms: number) => ms / plan.barMs;
  planned.forEach((note, index) => {
    table.begin[index] = note.beginBars;
    table.gate[index] = note.gateBars;
    table.pitch[index] = note.midi;
    // The take's level, not the raw velocity: the worklet plays the loudest note at full gain.
    table.velocity[index] = note.playbackVelocity ?? NaN;
    table.attack[index] = note.attack;
    table.decay[index] = note.decay;
    table.sustain[index] = note.sustain;
    table.release[index] = note.release;
    // Curves as Float32 columns, never arrays of objects: tables cross to the
    // audio thread by structured clone and must stay small and flat.
    const pitch = note.note.pitchExpression?.filter(point => Number.isFinite(point.timeMs) && Number.isFinite(point.cents)) ?? [];
    table.pitchStart[index] = pitchPoints.length;
    table.pitchCount[index] = pitch.length;
    for (const point of pitch) pitchPoints.push({ time: bars(point.timeMs), value: point.cents });
    const gain = note.note.gainExpression?.filter(point => Number.isFinite(point.timeMs) && Number.isFinite(point.gain)) ?? [];
    table.gainStart[index] = gainPoints.length;
    table.gainCount[index] = gain.length;
    for (const point of gain) gainPoints.push({ time: bars(point.timeMs), value: point.gain });
    const identity = patternNoteIdentity(note.note.note, request.key, request.mode, request.laBasedMinor)!;
    contexts.push({
      ...identity,
      sourceNoteId: note.noteId,
      mode: request.mode,
      key: request.key,
      instrument: request.instrument,
      ...(note.velocity === undefined ? {} : { velocity: note.velocity }),
      articulation: { attack: note.attack, decay: note.decay, sustain: note.sustain, release: note.release },
    });
  });
  table.pitchTime = Float32Array.from(pitchPoints, point => point.time);
  table.pitchCents = Float32Array.from(pitchPoints, point => point.value);
  table.gainTime = Float32Array.from(gainPoints, point => point.time);
  table.gainValue = Float32Array.from(gainPoints, point => point.value);
  return { table, notes: contexts };
}
