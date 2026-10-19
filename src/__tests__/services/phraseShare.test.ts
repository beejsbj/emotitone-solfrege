import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodePhraseShare,
  encodePhraseShare,
  PHRASE_SHARE_LIMITS,
  phraseShareToken,
  phraseShareUrl,
  readSharedPhrase,
  type SharedPhrase,
} from "@/services/phraseShare";
import type { PatternNote } from "@/types/patterns";

function note(name: string, press: number, length: number, extra: Partial<PatternNote> = {}): PatternNote {
  const octave = Number(name.slice(-1));
  return {
    id: `note-${name}-${press}`,
    note: name,
    octave,
    scaleDegree: 1,
    scaleIndex: 0,
    frequency: 261.63,
    pressTime: press,
    releaseTime: press + length,
    duration: length,
    ...extra,
  };
}

// A hummed phrase in F# dorian: wall-clock press times, a borrowed note, a
// pitch and gain curve, a captured envelope, and a bar of authored silence.
const START = 1_760_000_000_000;
const phrase: SharedPhrase = {
  name: "Rain on the roof",
  notes: [
    note("F#4", START, 400, { velocity: 0.8, scaleDegree: 1, scaleIndex: 0, pitchClassIndex: 6 }),
    note("A4", START + 500, 300, {
      scaleDegree: 3,
      scaleIndex: 2,
      pitchClassIndex: 9,
      pitchExpression: [{ timeMs: 0, cents: 0 }, { timeMs: 40, cents: 18 }, { timeMs: 90, cents: -12 }],
      gainExpression: [{ timeMs: 0, gain: 1 }, { timeMs: 60, gain: 1.25 }],
    }),
    note("C5", START + 900, 600, {
      scaleDegree: 0,
      scaleIndex: -1,
      pitchClassIndex: 0,
      isBorrowed: true,
      articulation: { attack: 0.01, decay: 0.001, sustain: 1, release: 0.4 },
    }),
  ],
  context: {
    key: "F#",
    mode: "dorian",
    instrument: "sawtooth",
    bpm: 92,
    shape: { cutoff: 3400, resonance: 4.5, room: 0.35, delay: 0.2, attack: 0.05, release: 1.2 },
    octave: 4,
  },
  duration: 2609,
};

describe("phrase links", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("carries a phrase and the world it was played in through the link", async () => {
    const url = await phraseShareUrl(phrase, "https://emotitone.app/");
    expect(url.startsWith("https://emotitone.app/#phrase=")).toBe(true);

    const received = await decodePhraseShare(phraseShareToken(new URL(url).hash)!);
    expect(received).not.toBeNull();
    expect(received!.name).toBe("Rain on the roof");
    expect(received!.context).toEqual(phrase.context);
    expect(received!.duration).toBe(2609);
    // Phrase time: the first press sits at 0, gaps and lengths unchanged.
    expect(received!.notes.map((n) => [n.note, n.pressTime, n.duration, n.releaseTime])).toEqual([
      ["F#4", 0, 400, 400],
      ["A4", 500, 300, 800],
      ["C5", 900, 600, 1500],
    ]);
    const [root, third, borrowed] = received!.notes;
    expect(root.velocity).toBe(0.8);
    expect(third.pitchExpression).toEqual(phrase.notes[1].pitchExpression);
    expect(third.gainExpression).toEqual(phrase.notes[1].gainExpression);
    // The cue survives: the borrowed note stays borrowed, with its pitch class.
    expect(borrowed).toMatchObject({ isBorrowed: true, scaleDegree: 0, scaleIndex: -1, pitchClassIndex: 0 });
    expect(borrowed.articulation).toEqual(phrase.notes[2].articulation);
  });

  it("keeps an ordinary phrase short enough to paste into a message", async () => {
    const sixteen: SharedPhrase = {
      ...phrase,
      name: undefined,
      notes: Array.from({ length: 16 }, (_, index) =>
        note(`${["C", "D", "E", "G"][index % 4]}4`, START + index * 250, 200, { velocity: 0.7 })),
      duration: 4000,
    };
    const token = await encodePhraseShare(sixteen);
    expect(token[0]).toBe("z");
    expect(token.length).toBeLessThan(400);
  });

  it("still makes a working link where the browser cannot compress", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    const token = await encodePhraseShare(phrase);
    expect(token[0]).toBe("j");
    expect((await decodePhraseShare(token))?.notes).toHaveLength(3);
  });

  it("opens a phrase on a sound this build does not offer on its nearest one", async () => {
    const token = await encodePhraseShare({
      ...phrase,
      context: { ...phrase.context, instrument: "supersaw" },
    });
    expect((await decodePhraseShare(token))?.context.instrument).toBe("sawtooth");
    const unknown = await encodePhraseShare({
      ...phrase,
      context: { ...phrase.context, instrument: "<script>" },
    });
    expect((await decodePhraseShare(unknown))?.context.instrument).toBe("triangle");
  });

  it("clamps a link's Shape and tempo to what the instrument can do", async () => {
    const token = await encodePhraseShare({
      ...phrase,
      context: {
        ...phrase.context,
        bpm: 9000,
        shape: { ...phrase.context.shape, cutoff: 99_999, room: -3 },
      },
    });
    const received = await decodePhraseShare(token);
    expect(received?.context.bpm).toBe(PHRASE_SHARE_LIMITS.bpm.max);
    expect(received?.context.shape).toMatchObject({ cutoff: 12000, room: 0 });
  });

  describe("refuses a link that is not a phrase", () => {
    type Wire = Record<string, unknown> & { n: Array<Record<string, unknown>> };
    const valid = (): Wire => JSON.parse(JSON.stringify({
      v: 1, k: "C", m: "major", i: "sine", b: 120, o: 4, d: 500,
      s: { cutoff: 12000, resonance: 0, room: 0, delay: 0, attack: null, release: null },
      n: [{ n: "C4", o: 4, t: 0, l: 200, d: 1, i: 0 }],
    }));

    it("accepts the minimal phrase these cases break", () => {
      expect(readSharedPhrase(valid())?.notes).toHaveLength(1);
    });

    it.each([
      ["a future version", (raw: Wire) => { raw.v = 2; }],
      ["an unknown key", (raw: Wire) => { raw.k = "H"; }],
      ["an unknown mode", (raw: Wire) => { raw.m = "hypermixolydian"; }],
      ["a malformed Shape", (raw: Wire) => { raw.s = { cutoff: "loud" }; }],
      ["no notes", (raw: Wire) => { raw.n = []; }],
      ["a note that is not a pitch", (raw: Wire) => { raw.n[0].n = "C4); alert(1"; }],
      ["a non-finite time", (raw: Wire) => { raw.n[0].t = "soon"; }],
      ["a pitch class off the circle", (raw: Wire) => { raw.n[0].p = 12; }],
      ["a curve that runs backwards", (raw: Wire) => { raw.n[0].pe = [10, 5, 5, 0]; }],
      ["too many notes", (raw: Wire) => { raw.n = Array.from({ length: PHRASE_SHARE_LIMITS.notes + 1 }, () => raw.n[0]); }],
    ])("%s", (_label, breakIt) => {
      const raw = valid();
      breakIt(raw);
      expect(readSharedPhrase(raw)).toBeNull();
    });

    it("garbage and truncated tokens", async () => {
      const token = await encodePhraseShare(phrase);
      expect(await decodePhraseShare("")).toBeNull();
      expect(await decodePhraseShare("x123")).toBeNull();
      expect(await decodePhraseShare("z!!!")).toBeNull();
      expect(await decodePhraseShare(token.slice(0, token.length / 2))).toBeNull();
    });

    it("a small link that inflates past the payload limit", async () => {
      const huge = new TextEncoder().encode(" ".repeat(PHRASE_SHARE_LIMITS.payloadBytes + 1024));
      const stream = new Blob([huge]).stream().pipeThrough(new CompressionStream("deflate-raw"));
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      const token = `z${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
      expect(token.length).toBeLessThan(10_000);
      expect(await decodePhraseShare(token)).toBeNull();
    });
  });

  it("finds the phrase token among other hash parameters", () => {
    expect(phraseShareToken("#phrase=zAbC")).toBe("zAbC");
    expect(phraseShareToken("#edition=poster&phrase=jXyZ")).toBe("jXyZ");
    expect(phraseShareToken("#something-else")).toBeNull();
    expect(phraseShareToken("")).toBeNull();
  });
});
