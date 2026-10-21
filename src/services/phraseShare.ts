/**
 * Phrase links: one phrase, with the world it was played in (key, mode,
 * instrument, Shape, tempo, octave), carried in the URL hash so showing
 * someone a phrase needs no server and the phrase never reaches one.
 *
 * The hash is `#phrase=<token>`. The token is a versioned JSON payload,
 * deflated and base64url-encoded ("z…"), or base64url JSON alone ("j…") where
 * the browser cannot compress. A link is untrusted input: decoding validates
 * every field, clamps every number and caps every list, and returns null
 * rather than a partial phrase.
 */

import { CHROMATIC_NOTES } from "@/data/notes";
import { MODE_DEFINITIONS } from "@/data/modes";
import { selectableReplacement } from "@/data/instrumentCatalog";
import { identifyPitch, pitchHeightOf } from "@/domain/musicalIdentity";
import { NEUTRAL_SHAPE, sanitizeShape } from "@/services/shape";
import type { GainExpressionPoint, PitchExpressionPoint } from "@/types/expression";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import type { Phrase, PhraseContext } from "@/types/phrases";

export const PHRASE_SHARE_PARAM = "phrase";
const VERSION = 1;

/** Bounds on what a link may ask the app to hold. */
export const PHRASE_SHARE_LIMITS = {
  notes: 1024,
  curvePoints: 4096,
  nameLength: 80,
  tokenLength: 400_000,
  payloadBytes: 2_000_000,
  durationMs: 10 * 60_000,
  bpm: { min: 20, max: 400 },
  octave: { min: 0, max: 8 },
} as const;

/** What a link carries: everything needed to hear the phrase as it was played. */
export interface SharedPhrase {
  name?: string;
  notes: PatternNote[];
  context: PhraseContext;
  /** Phrase length in ms, authored trailing silence included. */
  duration: number;
}

interface WireNote {
  /** Note name with octave, e.g. "F#4". */
  n: string;
  o: number;
  /** Press and length, phrase-relative ms. */
  t: number;
  l: number;
  /** Scale degree and index; borrowed pitches carry the pitch class. */
  d: number;
  i: number;
  p?: number;
  b?: 1;
  v?: number;
  /** Envelope: attack, decay, sustain, release. */
  a?: [number, number, number, number];
  /** Flat [timeMs, cents, …] and [timeMs, gain, …] curves. */
  pe?: number[];
  ge?: number[];
}

interface WirePhrase {
  v: number;
  name?: string;
  k: string;
  m: string;
  i: string;
  b: number;
  o: number;
  s: PhraseContext["shape"];
  d: number;
  n: WireNote[];
}

// ─── Encoding ────────────────────────────────────────────────────────────────

const round = (value: number, digits = 0) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

function flatCurve<T extends { timeMs: number }>(
  curve: readonly T[] | undefined,
  valueOf: (point: T) => number,
  digits: number,
): number[] | undefined {
  if (!curve?.length) return undefined;
  return curve.flatMap((point) => [round(point.timeMs), round(valueOf(point), digits)]);
}

function wireNote(note: PatternNote, start: number): WireNote {
  const wire: WireNote = {
    n: note.note,
    o: note.octave,
    t: round(note.pressTime - start),
    l: round(Math.max(0, note.duration ?? note.releaseTime - note.pressTime)),
    d: note.scaleDegree,
    i: note.scaleIndex,
  };
  if (typeof note.pitchClassIndex === "number") wire.p = note.pitchClassIndex;
  if (note.isBorrowed) wire.b = 1;
  if (typeof note.velocity === "number") wire.v = round(note.velocity, 3);
  if (note.articulation) {
    const { attack, decay, sustain, release } = note.articulation;
    wire.a = [round(attack, 4), round(decay, 4), round(sustain, 3), round(release, 3)];
  }
  const pe = flatCurve(note.pitchExpression, (point) => point.cents, 0);
  const ge = flatCurve(note.gainExpression, (point) => point.gain, 3);
  if (pe) wire.pe = pe;
  if (ge) wire.ge = ge;
  return wire;
}

function wirePhrase(phrase: Pick<Phrase, "name" | "notes" | "context" | "duration">): WirePhrase {
  const start = phrase.notes.length ? Math.min(...phrase.notes.map((note) => note.pressTime)) : 0;
  const { key, mode, instrument, bpm, shape, octave } = phrase.context;
  const wire: WirePhrase = {
    v: VERSION,
    k: key,
    m: mode,
    i: instrument,
    b: bpm,
    o: octave,
    s: { ...(shape ?? NEUTRAL_SHAPE) },
    d: round(phrase.duration),
    n: [...phrase.notes]
      .sort((left, right) => left.pressTime - right.pressTime)
      .map((note) => wireNote(note, start)),
  };
  if (phrase.name) wire.name = phrase.name;
  return wire;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Inflate, giving up once the output passes `limit` bytes (a zip bomb, not a phrase). */
async function inflateNative(bytes: Uint8Array, limit: number): Promise<Uint8Array | null> {
  const reader = new Blob([bytes]).stream()
    .pipeThrough(new DecompressionStream("deflate-raw"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function inflate(bytes: Uint8Array, limit: number): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "function") {
    try {
      return await inflateNative(bytes, limit);
    } catch {
      // Some browsers expose the constructor without supporting deflate-raw.
    }
  }
  try {
    // Load only on recipients missing native support; existing z links stay portable.
    const { Inflate } = await import("fflate");
    const chunks: Uint8Array[] = [];
    let size = 0;
    const decoder = new Inflate((chunk) => {
      size += chunk.byteLength;
      if (size > limit) throw new Error("Phrase payload exceeds its limit");
      chunks.push(chunk);
    });
    // A DEFLATE run can expand roughly 1,000-fold. Small input chunks bound
    // each allocation before the callback can enforce the total output limit.
    const CHUNK = 1024;
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      decoder.push(bytes.subarray(offset, offset + CHUNK), offset + CHUNK >= bytes.length);
    }
    const out = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return out;
  } catch {
    return null;
  }
}

/** The hash token for a phrase. */
export async function encodePhraseShare(
  phrase: Pick<Phrase, "name" | "notes" | "context" | "duration">,
): Promise<string> {
  const payload = wirePhrase(phrase);
  // Apply the receiver's structural limits before promising a working link.
  // Refuse the whole phrase rather than silently truncating notes or curves.
  if (!readSharedPhrase(payload)) throw new Error("This phrase is too large or unsupported for a link");
  const json = new TextEncoder().encode(JSON.stringify(payload));
  if (json.byteLength > PHRASE_SHARE_LIMITS.payloadBytes) throw new Error("This phrase is too large for a link");
  let token = `j${toBase64Url(json)}`;
  if (typeof CompressionStream === "function") {
    try {
      token = `z${toBase64Url(await deflate(json))}`;
    } catch {
      // An unavailable compression format still has a portable JSON link.
    }
  }
  if (token.length > PHRASE_SHARE_LIMITS.tokenLength) throw new Error("This phrase is too large for a link");
  return token;
}

/** A link that opens this app with the phrase on the desk. */
export async function phraseShareUrl(
  phrase: Pick<Phrase, "name" | "notes" | "context" | "duration">,
  base: string,
): Promise<string> {
  const url = new URL(base);
  url.hash = `${PHRASE_SHARE_PARAM}=${await encodePhraseShare(phrase)}`;
  return url.toString();
}

// ─── Decoding ────────────────────────────────────────────────────────────────

const NOTE_NAME = /^([A-G](?:#{1,2}|b{1,2})?)(-?\d{1,2})$/;
const MODES = new Set(Object.keys(MODE_DEFINITIONS));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function readCurve<T extends { timeMs: number }>(
  raw: unknown,
  point: (timeMs: number, value: number) => T,
): T[] | undefined | null {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length % 2 !== 0) return null;
  if (raw.length / 2 > PHRASE_SHARE_LIMITS.curvePoints) return null;
  const curve: T[] = [];
  let last = -Infinity;
  for (let index = 0; index < raw.length; index += 2) {
    const timeMs = raw[index];
    const value = raw[index + 1];
    if (!finite(timeMs) || !finite(value) || timeMs < last) return null;
    last = timeMs;
    curve.push(point(clamp(timeMs, 0, PHRASE_SHARE_LIMITS.durationMs), value));
  }
  return curve;
}

function readNote(
  raw: unknown,
  context: { tonic: string; mode: MusicalMode },
  newId: (index: number) => string,
  index: number,
): PatternNote | null {
  if (!isRecord(raw) || typeof raw.n !== "string") return null;
  const name = NOTE_NAME.exec(raw.n);
  if (!name || !finite(raw.o) || !Number.isInteger(raw.o)) return null;
  if (!finite(raw.t) || !finite(raw.l) || !finite(raw.d) || !finite(raw.i)) return null;
  if (!Number.isInteger(raw.d) || !Number.isInteger(raw.i)) return null;
  if (raw.p !== undefined && (!finite(raw.p) || !Number.isInteger(raw.p) || raw.p < 0 || raw.p > 11)) return null;
  const height = pitchHeightOf(raw.n);
  const identity = identifyPitch(raw.n, context);
  if (height === null || !identity) return null;
  const octave = Math.floor(height / 12) - 1;
  if (octave < -1 || octave > 10) return null;

  const pressTime = clamp(raw.t, 0, PHRASE_SHARE_LIMITS.durationMs);
  const duration = clamp(raw.l, 0, PHRASE_SHARE_LIMITS.durationMs - pressTime);
  const note: PatternNote = {
    id: newId(index),
    // Playback, colour and future edits must agree on the pitch. These wire
    // fields are redundant hints, never authority over the scientific note.
    note: `${CHROMATIC_NOTES[identity.pitchClass]}${octave}`,
    octave,
    scaleDegree: identity.scaleIndex === null ? 0 : identity.scaleIndex + 1,
    scaleIndex: identity.scaleIndex ?? -1,
    pitchClassIndex: identity.pitchClass,
    isBorrowed: identity.borrowed,
    pressTime,
    releaseTime: pressTime + duration,
    duration,
  };
  if (raw.v !== undefined) {
    if (!finite(raw.v)) return null;
    note.velocity = clamp(raw.v, 0, 1);
  }
  if (raw.a !== undefined) {
    if (!Array.isArray(raw.a) || raw.a.length !== 4 || !raw.a.every(finite)) return null;
    const [attack, decay, sustain, release] = raw.a as number[];
    note.articulation = {
      attack: clamp(attack, 0, 5),
      decay: clamp(decay, 0, 5),
      sustain: clamp(sustain, 0, 1),
      release: clamp(release, 0, 10),
    };
  }
  const pitch = readCurve<PitchExpressionPoint>(raw.pe, (timeMs, cents) =>
    ({ timeMs, cents: Math.round(clamp(cents, -50, 50)) }));
  const gain = readCurve<GainExpressionPoint>(raw.ge, (timeMs, value) =>
    ({ timeMs, gain: clamp(value, 0.25, 1.75) }));
  if (pitch === null || gain === null) return null;
  if (pitch) note.pitchExpression = pitch;
  if (gain) note.gainExpression = gain;
  return note;
}

/** Validate a decoded payload into a phrase, or null if any part is wrong. */
export function readSharedPhrase(
  raw: unknown,
  newId: (index: number) => string = (index) => `note_shared_${index}`,
): SharedPhrase | null {
  if (!isRecord(raw) || raw.v !== VERSION) return null;
  if (!CHROMATIC_NOTES.includes(raw.k as ChromaticNote)) return null;
  if (typeof raw.m !== "string" || !MODES.has(raw.m)) return null;
  if (typeof raw.i !== "string" || !finite(raw.b) || !finite(raw.o) || !finite(raw.d)) return null;
  const shape = sanitizeShape(raw.s);
  if (!shape) return null;
  if (!Array.isArray(raw.n) || !raw.n.length || raw.n.length > PHRASE_SHARE_LIMITS.notes) return null;

  const notes: PatternNote[] = [];
  const context = { tonic: raw.k as ChromaticNote, mode: raw.m as MusicalMode };
  for (let index = 0; index < raw.n.length; index += 1) {
    const note = readNote(raw.n[index], context, newId, index);
    if (!note) return null;
    notes.push(note);
  }
  notes.sort((left, right) => left.pressTime - right.pressTime);
  const sounding = Math.max(...notes.map((note) => note.releaseTime));

  const { bpm, octave, durationMs, nameLength } = PHRASE_SHARE_LIMITS;
  const shared: SharedPhrase = {
    notes,
    context: {
      key: raw.k as ChromaticNote,
      mode: raw.m as MusicalMode,
      // An instrument this build does not offer opens on its nearest one.
      instrument: selectableReplacement(raw.i),
      bpm: clamp(raw.b, bpm.min, bpm.max),
      shape,
      octave: Math.round(clamp(raw.o, octave.min, octave.max)),
    },
    duration: Math.max(sounding, clamp(raw.d, 0, durationMs)),
  };
  if (typeof raw.name === "string" && raw.name.trim()) {
    shared.name = raw.name.trim().slice(0, nameLength);
  }
  return shared;
}

/** Decode a hash token, or null if it is not a phrase this build can open. */
export async function decodePhraseShare(token: string): Promise<SharedPhrase | null> {
  if (!token || token.length > PHRASE_SHARE_LIMITS.tokenLength) return null;
  const format = token[0];
  const bytes = fromBase64Url(token.slice(1));
  if (!bytes) return null;
  let json: Uint8Array | null;
  if (format === "j") json = bytes.byteLength <= PHRASE_SHARE_LIMITS.payloadBytes ? bytes : null;
  else if (format === "z") json = await inflate(bytes, PHRASE_SHARE_LIMITS.payloadBytes);
  else return null;
  if (!json) return null;
  try {
    return readSharedPhrase(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(json)));
  } catch {
    return null;
  }
}

/** The phrase token in a location hash ("#phrase=…"), if there is one. */
export function phraseShareToken(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get(PHRASE_SHARE_PARAM);
}
