import { LiveAudioCore } from "@/audio/live/core";
import { readTransportEvents, type DecodedTransportEvent } from "@/audio/live/transportEvents";
import type { LiveResponse } from "@/audio/live/types";
import { GATE_BPM, gateMembers, gateTables } from "@/lab/phoneGate/fixtures";
import { buildPatternMember } from "@/services/patternMember";

export const GATE_RENDER_RATE = 8000;
const RATE = GATE_RENDER_RATE;
const QUANTUM = 128;

/**
 * The phone gate's loop on the real render core (BJS-494): the same four
 * members the phone plays, on the worklet transport, with every record the
 * core sends decoded as the main thread would. Only the instrument differs (an
 * oscillator, so no sample download).
 */
export function playGateLoop(bars: number) {
  const records: DecodedTransportEvent[] = [];
  const queued: LiveResponse[] = [];
  const core = new LiveAudioCore(RATE, response => { queued.push(response); });
  let frame = 0;
  const deliver = () => {
    while (queued.length) {
      const response = queued.shift()!;
      if (response.type !== "transport-events") continue;
      readTransportEvents(response, event => records.push({ ...event }));
      core.command({ type: "transport-recycle", buffer: response.buffer }, frame);
    }
  };
  core.command({ type: "prepare", requestId: 1, instrument: { kind: "oscillator", instrumentId: "sine", waveform: "sine",
    gain: .2, attack: .002, decay: .01, sustain: .6, release: .02 } }, frame);
  const members = gateMembers();
  const generations = new Map<number, string>();
  const joins = members.map((member, index) => {
    const { table } = buildPatternMember({ ...member, generation: 100 + index, instrumentId: "sine" });
    table.lengthBars = member.lengthBars!;
    generations.set(table.generation, member.id);
    return { type: "join" as const, member: { table, offsetBars: 0, rate: 1, muted: false } };
  });
  core.command({ type: "transport-change", requestId: 2, change: { type: "batch", changes: joins }, boundary: "immediate" }, frame);
  core.command({ type: "transport-start", requestId: 3, run: 1, bpm: GATE_BPM }, frame);
  deliver();
  const frames = Math.ceil((bars * 4 * 60 / GATE_BPM) * RATE);
  while (frame < frames) {
    core.render([new Float32Array(QUANTUM), new Float32Array(QUANTUM)], frame);
    frame += QUANTUM;
    deliver();
  }
  return { records, memberOf: (generation: number) => generations.get(generation), tables: gateTables(members, "sine") };
}

