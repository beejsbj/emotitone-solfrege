import type { LabCompoundUnit } from "@/types/compoundsLab";
import ChordBench from "./ChordBench.vue";

export const chordUnit: LabCompoundUnit = {
  id: "chord",
  name: "Chord",
  source: "components/compounds/Chord.vue · ChordKey.vue",
  bench: ChordBench,
  verdict:
    "Burooj, 2026-10-01: \"I love hardbands and I love the fanned slips. The fanned slips don't need to be so tall. And I dont like the fanned slips having the text be inside a black box. Just have the text on the slips directly.\" Root Plate is dropped; the fan now keeps the row's height with a flatter spread, and the symbol sits on the slips.",
  reading:
    "Playing zone · applied paper. The Keyboard's permanent chord row plays fused ChordKeys: a rounded pill whose face blends its members' pitch colours edge to edge. It is the only rounded, blended thing on a keyboard of flat, leaning cut paper. Member order and each member's independent progress must survive every direction.",
  directions: [
    {
      id: "bands",
      letter: "A",
      name: "Hard Bands",
      paper: "pine",
      skin: "bands",
      idea:
        "The chord becomes a leaning cut Key like its neighbours, split into hard-edged flat bands, one per member in voicing order, with the symbol on top. Each band keeps its member's own progress fill.",
      better:
        "It obeys the poster's flat colour with no gradients, shows every member's exact pitch colour instead of a blend, and puts the chord row in the same silhouette family as the Keys.",
      risks:
        "Four members on a 52px face make 13px bands. The symbol must stay legible across hard seams between very different colours.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Flat Music Color bands; the lean matches Key." },
    },
    {
      id: "fan",
      letter: "B",
      name: "Fanned Slips",
      paper: "cobalt",
      skin: "fan",
      idea:
        "A chord is its notes' paper stacked: each member is a cut slip in its pitch colour, fanned a few degrees within the row's own height, with the symbol printed straight across the slips. Pressing squares the fan up into one stack.",
      better:
        "It shows a chord as notes played together, literally a collage of Keys, and the press has a physical answer that says 'these sound at once'.",
      risks:
        "The fan can overflow the chord row's height and overlaps hide most of each member's colour. Seven fanned chords in a row may be the busiest thing on the Keyboard.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Collage grammar; must stay inside the row's accepted height." },
    },
  ],
};
