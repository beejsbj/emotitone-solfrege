/**
 * The arithmetic oracle of the phone gate (BJS-494): which onsets the loop
 * must sound in a window of bars, from the members' tables alone. Placement is
 * the Looper grid (docs/looper.md): a note sounds at shared bar
 * `offset + loop × (length / rate) + begin / rate`.
 */

export interface GateMemberTable {
  id: string;
  /** Note onsets in bars at rate 1, from the start of the member's period. */
  begin: readonly number[];
  lengthBars: number;
  offsetBars: number;
  rate: number;
}

export interface ExpectedOnset {
  memberId: string;
  noteIndex: number;
  bar: number;
}

/** A stable key for one onset: member, note and bar (to a millionth of a bar). */
export function onsetKey(memberId: string, noteIndex: number, bar: number): string {
  return `${memberId}|${noteIndex}|${Math.round(bar * 1e6)}`;
}

/** Every onset with `fromBar <= bar < toBar`, in bar order. */
export function expectedOnsets(tables: readonly GateMemberTable[], fromBar: number, toBar: number): ExpectedOnset[] {
  const onsets: ExpectedOnset[] = [];
  for (const table of tables) {
    if (!(table.lengthBars > 0) || !(table.rate > 0)) continue;
    const period = table.lengthBars / table.rate;
    const firstLoop = Math.floor((fromBar - table.offsetBars) / period) - 1;
    const lastLoop = Math.floor((toBar - table.offsetBars) / period);
    for (let loop = firstLoop; loop <= lastLoop; loop++) {
      table.begin.forEach((begin, noteIndex) => {
        const bar = table.offsetBars + loop * period + begin / table.rate;
        if (bar >= fromBar - 1e-9 && bar < toBar - 1e-9) onsets.push({ memberId: table.id, noteIndex, bar });
      });
    }
  }
  return onsets.sort((a, b) => a.bar - b.bar);
}
