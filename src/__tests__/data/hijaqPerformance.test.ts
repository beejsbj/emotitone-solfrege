import { describe, expect, it } from "vitest";
import { Note } from "@tonaljs/tonal";
import { LiveAudioCore } from "@/audio/live/core";
import { readTransportEvents, TransportEventKind, type DecodedTransportEvent } from "@/audio/live/transportEvents";
import type { PreparedLiveInstrument } from "@/audio/live/types";
import { defaultPatterns } from "@/data/patterns";
import { createLooper, join, periodBars } from "@/domain/looper";
import { phraseFromPattern } from "@/domain/phraseBook";
import { buildPatternMember } from "@/services/patternMember";
import type { LogNote, Pattern } from "@/types/patterns";

const IDS = ["ostinato", "low-roots", "chords", "opening"].map(part => `pattern-hijaq-${part}-1`);
const BPM = 416 / 3;
const BAR_MS = 240000 / BPM;
const RATE = 8000;
const QUANTUM = 128;

function libraryParts(): Pattern[] {
  return IDS.map(id => {
    const pattern = defaultPatterns.find(pattern => pattern.id === id);
    expect(pattern, `registered library part ${id}`).toBeDefined();
    return pattern!;
  });
}

/** Same library conversion and domain membership used when joining from the shelf. */
function playingParts() {
  const looper = createLooper();
  const parts = libraryParts().map(pattern => {
    const phrase = phraseFromPattern(pattern, "library");
    const membership = join(looper, phrase, { kind: "pinned-to-bar-one" });
    const member = buildPatternMember({
      id: phrase.id, generation: IDS.indexOf(phrase.id) + 1,
      notes: phrase.notes as LogNote[],
      config: { sourceBpm: phrase.context.bpm, bpm: phrase.context.bpm,
        patternDurationMs: phrase.duration, shape: phrase.context.shape },
      instrumentId: phrase.context.instrument, instrument: phrase.context.instrument,
      key: phrase.context.key, mode: phrase.context.mode,
    });
    // patternTransport applies the domain's whole-bar length after compiling.
    member.table.lengthBars = membership.lengthBars;
    return { phrase, membership, member };
  });
  return { looper, parts };
}

describe("hijaq library parts on the worklet Looper", () => {
  it("offers four independent parts and preserves the authored loop boundaries through library conversion", () => {
    const { looper, parts } = playingParts();
    expect(defaultPatterns.filter(pattern => pattern.id.startsWith("pattern-hijaq-")).map(pattern => pattern.id))
      .toEqual(IDS);
    expect(defaultPatterns.some(pattern => pattern.id === "pattern-hijaq-just-turn-it-on-1")).toBe(false);
    expect(looper.bpm).toBe(BPM);
    expect(periodBars(looper)).toBe(36);
    expect(parts.map(({ membership }) => membership.lengthBars)).toEqual([4, 36, 36, 4]);
    for (const { phrase, membership } of parts) {
      expect(phrase.duration).toBeCloseTo(membership.lengthBars * BAR_MS, 8);
      expect(Math.max(...phrase.notes.map(note => note.releaseTime))).toBeLessThanOrEqual(phrase.duration);
      expect(membership).toMatchObject({ offsetBars: 0, rate: 1, muted: false });
    }
    // Keep the fractional four-bar boundary rather than rounding the authored rest upward.
    expect(parts[0].phrase.duration).toBeCloseTo(90000 / 13, 8);
    expect(parts[0].phrase.duration - parts[0].phrase.notes.at(-1)!.releaseTime).toBeLessThan(1);
    // The harmony stops at source 103.8 s, leaving silence until bar 36.
    for (const part of parts.slice(1, 3)) {
      expect(Math.max(...part.phrase.notes.map(note => note.releaseTime))).toBe(58980);
      expect(part.phrase.duration - 58980).toBeGreaterThan(BAR_MS);
    }
  });

  it("keeps source pitches, live onsets and gates when compiling the separate parts", () => {
    const { parts } = playingParts();
    const [ostinato, roots, chords, opening] = parts.map(part => part.phrase.notes);
    expect(ostinato).toHaveLength(24);
    expect(ostinato.slice(0, 4).map(note => [note.note, note.pressTime, note.duration]))
      .toEqual([["C3", 0, 440], ["G3", 440, 220], ["B3", 660, 220], ["C3", 880, 420]]);
    expect(ostinato[12]).toMatchObject({ note: "E3", pressTime: 3500, duration: 440 });
    expect(roots.slice(0, 3).map(note => [note.note, note.pressTime, note.duration]))
      .toEqual([["C1", 0, 3420], ["E1", 3420, 3480], ["C1", 6900, 3040]]);
    expect(chords.filter(note => note.pressTime === 27020).map(note => note.note))
      .toEqual(["E3", "G3", "B3", "D4"]);
    expect(opening.map(note => [note.note, note.pressTime, note.duration]))
      .toEqual([["C3", 0, 650], ["E3", 650, 200], ["G3", 850, 200], ["B3", 1050, 240]]);

    for (const { phrase, member } of parts) {
      expect(member.notes).toHaveLength(phrase.notes.length);
      for (let index = 0; index < member.notes.length; index++) {
        const source = phrase.notes.find(note => note.id === member.notes[index].sourceNoteId)!;
        expect(member.table.pitch[index]).toBe(Note.midi(source.note));
        // Notation weights have four decimal places; allow under 2 ms of printed precision.
        expect(Math.abs(member.table.begin[index] * BAR_MS - source.pressTime)).toBeLessThan(2);
        expect(Math.abs(member.table.gate[index] * BAR_MS - source.duration)).toBeLessThan(2);
      }
    }
  });

  it("renders every part through its repeat boundary without dropped, duplicate or drifting attacks", () => {
    const { parts } = playingParts();
    const events: DecodedTransportEvent[] = [];
    const recycled: ArrayBuffer[] = [];
    const core = new LiveAudioCore(RATE, response => {
      if (response.type !== "transport-events") return;
      readTransportEvents(response, event => { if (event.kind === TransportEventKind.Attack) events.push(event); });
      recycled.push(response.buffer);
    });
    const instrument: PreparedLiveInstrument = {
      kind: "oscillator", instrumentId: "sawtooth", waveform: "sawtooth",
      gain: 1, attack: .001, decay: .01, sustain: .5, release: .01,
    };
    core.command({ type: "prepare", requestId: 0, instrument }, 0);
    core.command({ type: "transport-start", requestId: 1, run: 1, bpm: BPM }, 0);
    core.command({ type: "transport-change", requestId: 2, boundary: "immediate",
      change: { type: "batch", changes: parts.map(({ member, membership }) => ({
        type: "join", member: { table: member.table, ...membership },
      })) } }, 0);

    // All nine ostinato repeats, the long harmony's restart, and optional opening's restart.
    const horizonMs = 37 * BAR_MS;
    let finite = true;
    let energy = 0;
    let restartEnergy = 0;
    const output = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
    for (let frame = 0; frame < horizonMs * RATE / 1000; frame += QUANTUM) {
      core.render(output, frame);
      for (const sample of output[0]) {
        finite &&= Number.isFinite(sample);
        energy += sample * sample;
        if (frame >= 36 * BAR_MS * RATE / 1000) restartEnergy += sample * sample;
      }
      for (const buffer of recycled.splice(0)) core.command({ type: "transport-recycle", buffer }, frame);
    }
    expect(finite).toBe(true);
    expect(energy).toBeGreaterThan(1);
    expect(restartEnergy).toBeGreaterThan(1);

    for (const { phrase, membership, member } of parts) {
      const actual = events.filter(event => event.generation === member.table.generation && event.bar < 37);
      const expected = [];
      for (let cycle = 0; cycle * membership.lengthBars < 37; cycle++) {
        for (const source of phrase.notes) {
          const onsetMs = cycle * membership.lengthBars * BAR_MS + source.pressTime;
          if (onsetMs < horizonMs) expected.push({ source, onsetMs, cycle });
        }
      }
      expect(actual, phrase.id).toHaveLength(expected.length);
      actual.forEach((event, index) => {
        const { source, onsetMs, cycle } = expected[index];
        expect(member.notes[event.noteIndex].sourceNoteId).toBe(source.id);
        expect(Math.abs(event.frame / RATE * 1000 - onsetMs)).toBeLessThan(2);
        expect(Math.abs(event.length / RATE * 1000 - source.duration)).toBeLessThan(2);
        expect(Math.abs(event.bar - cycle * membership.lengthBars - source.pressTime / BAR_MS)).toBeLessThan(2 / BAR_MS);
      });
    }
  });
});
