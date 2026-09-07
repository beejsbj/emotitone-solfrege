import { CHROMATIC_NOTES } from "@/data";
import { findScaleIndexForPitchClass } from "@/services/scalePitch";
import type { ImportedPatternCandidate } from "@/stores/patterns";
import type { PatternNote } from "@/types/patterns";
import type { ChromaticNote, MusicalMode } from "@/types/music";

const OUTPUT_SAMPLE_RATE = 22_050;
const DEFAULT_ANALYZE_URL = "/api/melograph/analyze";

export interface MelographFrame {
  time_seconds: number;
  f0_hz_raw: number | null;
  midi_raw: number | null;
  midi_processed: number | null;
  confidence: number;
  voiced: boolean;
  rms_db: number;
}

export interface MelographNoteEvent {
  type: "note";
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  midi: number;
  note: string;
  pitch_hz?: number;
  confidence?: number;
}

export interface MelographRestEvent {
  type: "rest";
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
}

export type MelographEvent = MelographNoteEvent | MelographRestEvent;

export interface MelographPhrase {
  number: number;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  events: MelographEvent[];
}

export interface MelographTake {
  number: number;
  code: string;
  code_midi: string;
  repl_url: string;
}

export interface MelographAnalysis {
  schema_version: number;
  product: string;
  tracker: string;
  duration_seconds: number;
  frames: MelographFrame[];
  phrases: MelographPhrase[];
  strudel: string;
  strudel_midi: string;
  takes: MelographTake[];
  warnings: string[];
}

export interface MelographPatternContext {
  key: ChromaticNote;
  mode: MusicalMode;
}

export async function analyzeWithMelograph(
  wav: Blob,
  options: {
    signal?: AbortSignal;
    fetcher?: typeof fetch;
    url?: string;
  } = {},
): Promise<MelographAnalysis> {
  const response = await (options.fetcher ?? fetch)(
    options.url
      ?? import.meta.env.VITE_MELOGRAPH_ANALYZE_URL
      ?? DEFAULT_ANALYZE_URL,
    {
      method: "POST",
      body: wav,
      headers: { "Content-Type": "audio/wav" },
      cache: "no-store",
      signal: options.signal,
    },
  );

  const payload = await readJson(response);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : `Melograph analysis failed (${response.status})`;
    throw new Error(message);
  }

  if (!isMelographAnalysis(payload)) {
    throw new Error("Melograph returned an unsupported analysis response.");
  }

  return payload;
}

export async function audioBlobToMelographWav(input: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await input.arrayBuffer());
    const frameCount = Math.ceil(decoded.duration * OUTPUT_SAMPLE_RATE);
    const offline = new OfflineAudioContext(1, frameCount, OUTPUT_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeMonoPcmWav(rendered.getChannelData(0), OUTPUT_SAMPLE_RATE);
  } finally {
    await context.close();
  }
}

export function encodeMonoPcmWav(
  samples: Float32Array,
  sampleRate: number,
): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  samples.forEach((value, index) => {
    const sample = Math.max(-1, Math.min(1, value));
    view.setInt16(
      44 + index * 2,
      Math.round(sample * (sample < 0 ? 32_768 : 32_767)),
      true,
    );
  });

  return new Blob([buffer], { type: "audio/wav" });
}

export function melographAnalysisToPatternCandidates(
  analysis: MelographAnalysis,
  context: MelographPatternContext,
  captureId = Date.now().toString(36),
): ImportedPatternCandidate[] {
  return analysis.phrases.flatMap((phrase) => {
    const notes = phrase.events.flatMap((event, eventIndex) => {
      if (event.type !== "note") {
        return [];
      }

      const note = eventToPatternNote(
        event,
        phrase,
        eventIndex,
        captureId,
        context,
      );
      return note ? [note] : [];
    });

    if (!notes.length) {
      return [];
    }

    return [{
      name: analysis.phrases.length > 1
        ? `Hummed take ${phrase.number}`
        : "Hummed pattern",
      notes,
      source: {
        kind: "melograph" as const,
        schemaVersion: analysis.schema_version,
        tracker: analysis.tracker,
        takeNumber: phrase.number,
      },
    }];
  });
}

function eventToPatternNote(
  event: MelographNoteEvent,
  phrase: MelographPhrase,
  eventIndex: number,
  captureId: string,
  context: MelographPatternContext,
): PatternNote | null {
  if (
    !Number.isFinite(event.midi)
    || !Number.isFinite(event.start_seconds)
    || !Number.isFinite(event.end_seconds)
    || event.end_seconds <= event.start_seconds
  ) {
    return null;
  }

  const midi = Math.round(event.midi);
  const pitchClass = CHROMATIC_NOTES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  if (!pitchClass || !Number.isFinite(octave)) {
    return null;
  }
  const canonicalName = `${pitchClass}${octave}`;

  const scaleIndex = findScaleIndexForPitchClass(
    pitchClass,
    context,
  );
  if (scaleIndex == null) {
    throw new Error(
      `Melograph detected ${canonicalName}, which is outside ${context.key} ${context.mode}.`,
    );
  }
  const pressTime = Math.max(
    0,
    Math.round((event.start_seconds - phrase.start_seconds) * 1000),
  );
  const releaseTime = Math.max(
    pressTime + 1,
    Math.round((event.end_seconds - phrase.start_seconds) * 1000),
  );

  return {
    id: `melograph-${captureId}-${phrase.number}-${eventIndex}`,
    note: canonicalName,
    scaleDegree: scaleIndex + 1,
    scaleIndex,
    octave,
    frequency: Number.isFinite(event.pitch_hz)
      ? event.pitch_hz
      : 440 * 2 ** ((event.midi - 69) / 12),
    velocity: clamp(event.confidence ?? 1, 0, 1),
    pressTime,
    releaseTime,
    duration: releaseTime - pressTime,
  };
}

function isMelographAnalysis(value: unknown): value is MelographAnalysis {
  if (!isRecord(value)) return false;
  return value.product === "Melograph"
    && value.schema_version === 1
    && value.tracker === "praat-ac"
    && typeof value.duration_seconds === "number"
    && Array.isArray(value.frames)
    && Array.isArray(value.phrases)
    && Array.isArray(value.takes)
    && Array.isArray(value.warnings)
    && typeof value.strudel === "string"
    && typeof value.strudel_midi === "string";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}
