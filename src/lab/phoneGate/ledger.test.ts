import { describe, expect, it } from "vitest";
import { TransportEventKind } from "@/audio/live/transportEvents";
import { GATE_RENDER_RATE as RATE, playGateLoop } from "@/__tests__/helpers/phoneGateLoop";
import { GATE_BPM } from "./fixtures";
import { createAttackLedger, createLightLedger } from "./ledger";
import { expectedOnsets } from "./oracle";
import { gateRows } from "./report";

describe("phone gate attack ledger", () => {
  it("finds every expected onset of the four-member loop rendered once by the real core", () => {
    const { records, memberOf, tables } = playGateLoop(5.2);
    const expected = expectedOnsets(tables, 1, 5);
    // Melody 8, bass 2, chords 6 and arp 16 onsets a bar.
    expect(expected).toHaveLength(4 * 32);
    const ledger = createAttackLedger({ expected, memberOf, fromBar: 1, toBar: 5, sampleRate: RATE });
    records.forEach(ledger.record);
    expect(ledger.result()).toEqual({ expected: 128, rendered: 128, lost: 0, doubled: 0, extra: 0, cancelled: 0,
      cutShort: 0, stolenAtOnset: 0, overflows: 0 });
  });

  it("counts a refused onset as lost, a second attack as doubled, an early release as cut short", () => {
    const { records, memberOf, tables } = playGateLoop(3.1);
    const expected = expectedOnsets(tables, 1, 3);
    const attacks = records.filter(record => record.kind === TransportEventKind.Attack && record.bar >= 1 && record.bar < 3);
    const [refused, twice, stolen] = attacks;
    const ledger = createAttackLedger({ expected, memberOf, fromBar: 1, toBar: 3, sampleRate: RATE });
    records.forEach(ledger.record);
    // What the render thread sends when it cannot start a voice, or steals one halfway through its gate.
    ledger.record({ ...refused, kind: TransportEventKind.Cancel });
    ledger.record({ ...twice, serial: 1e6 });
    ledger.record({ ...stolen, kind: TransportEventKind.Release, frame: stolen.frame + Math.floor(stolen.length / 2) });
    ledger.record({ ...stolen, kind: TransportEventKind.SnapshotBegin, serial: 0 });
    // An attack the oracle never asked for (a stale table).
    ledger.record({ ...twice, serial: 1e6 + 1, noteIndex: 999 });
    expect(ledger.result()).toMatchObject({ expected: expected.length, rendered: expected.length - 1, lost: 1, doubled: 1,
      extra: 1, cancelled: 1, cutShort: 1, stolenAtOnset: 0, overflows: 1 });
  });

  it("counts a voice stolen in its first frames as lost, and fails the attacks row on it", () => {
    const { records, memberOf, tables } = playGateLoop(3.1);
    const expected = expectedOnsets(tables, 1, 3);
    const [stolen] = records.filter(record => record.kind === TransportEventKind.Attack && record.bar >= 1 && record.bar < 3);
    const ledger = createAttackLedger({ expected, memberOf, fromBar: 1, toBar: 3, sampleRate: RATE });
    records.forEach(ledger.record);
    // Stolen 2 ms after its onset: an attack announced, a click at most, never a note.
    ledger.record({ ...stolen, kind: TransportEventKind.Release, frame: stolen.frame + Math.round(RATE * .002) });
    const result = ledger.result();
    expect(result).toMatchObject({ expected: expected.length, rendered: expected.length - 1, lost: 1, cutShort: 1,
      stolenAtOnset: 1 });
    const row = gateRows({ startedAt: "", url: "", build: null, bpm: GATE_BPM, attacks: { ...result, bars: 2 },
      environment: { device: "", os: "", browser: "", userAgent: "", sampleRate: RATE, baseLatencyMs: null,
        outputLatencyMs: null, devicePixelRatio: null, cores: null, deviceMemoryGb: null } })
      .find(entry => entry.id === "attacks")!;
    expect(row.verdict).toBe("fail");
    expect(row.value).toContain("1 of them stolen at onset and counted lost");
  });

  it("ignores records outside the window and from tables that are not the gate's", () => {
    const { records, memberOf, tables } = playGateLoop(3.1);
    const expected = expectedOnsets(tables, 2, 3);
    const ledger = createAttackLedger({ expected, memberOf: generation => generation === 100 ? undefined : memberOf(generation),
      fromBar: 2, toBar: 3, sampleRate: RATE });
    records.forEach(ledger.record);
    // The melody's table (generation 100) is unknown here: its eight onsets read as lost, nothing reads as extra.
    expect(ledger.result()).toMatchObject({ expected: 32, rendered: 24, lost: 8, extra: 0 });
  });
});

describe("phone gate light ledger", () => {
  it("tells notes dropped by a busy main thread from notes a stale clock placed a pause early", () => {
    const { records, memberOf } = playGateLoop(2.1);
    const attacks = records.filter(record => record.kind === TransportEventKind.Attack && record.bar >= 1 && record.bar < 2);
    expect(attacks).toHaveLength(32);
    const ledger = createLightLedger({ memberOf, fromBar: 1, toBar: 2, staleMs: 2500 });
    // Injected decode-time leads of each note's end: most well ahead, two
    // already ended by a little (late), one ended a whole pause ago (stale).
    attacks.forEach((attack, index) => ledger.record(attack, index === 0 ? -5000 : index < 3 ? -40 : 300));
    // One refused at render: it never sounded, so it is not owed a light.
    ledger.record({ ...attacks[3], kind: TransportEventKind.Cancel }, 0);
    attacks.slice(4).forEach((attack, index) => ledger.lit(attack.serial, 20 - index));
    expect(ledger.result()).toEqual({ sounded: 31, lit: 28, late: 2, stale: 1, missing: 0, earliestLeadMs: 20 - 27 });
    // A note that had time to spare and still did not light is unexplained.
    const unlit = createLightLedger({ memberOf, fromBar: 1, toBar: 2, staleMs: 2500 });
    unlit.record(attacks[5], 300);
    expect(unlit.result()).toMatchObject({ sounded: 1, lit: 0, missing: 1 });
  });
});

describe("phone gate oracle", () => {
  it("places onsets on the Looper grid, with offset and rate", () => {
    const table = { id: "m", begin: [0, .5], lengthBars: 1, offsetBars: .25, rate: 2 };
    // Period .5 bar; the pass from bar -.25 has its second note on bar 0.
    expect(expectedOnsets([table], 0, 1).map(onset => onset.bar)).toEqual([0, .25, .5, .75]);
    expect(expectedOnsets([{ ...table, rate: 0 }], 0, 1)).toEqual([]);
  });
});
