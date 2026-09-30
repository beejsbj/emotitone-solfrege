import type { LabCompoundUnit } from "@/types/compoundsLab";
import ChordBench from "./ChordBench.vue";

export const chordUnit: LabCompoundUnit = {
  id: "chord",
  name: "Chord",
  source: "components/compounds/Chord.vue · ChordKey.vue",
  bench: ChordBench,
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
        "A chord is its notes' paper stacked: each member is a cut slip in its pitch colour, fanned a few degrees behind an Ink symbol label. Pressing squares the fan up into one stack.",
      better:
        "It shows a chord as notes played together, literally a collage of Keys, and the press has a physical answer that says 'these sound at once'.",
      risks:
        "The fan can overflow the chord row's height and overlaps hide most of each member's colour. Seven fanned chords in a row may be the busiest thing on the Keyboard.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Collage grammar; must stay inside the row's accepted height." },
    },
    {
      id: "root",
      letter: "C",
      name: "Root Plate",
      paper: "bone",
      skin: "root",
      idea:
        "The chord face is one flat plate in its root's Music Color, with the other members as a short row of pips along the bottom edge. The row reads as harmony built on a root, not as a blend.",
      better:
        "The chord row calms down: seven root colours instead of seven rainbows, so the melody Keys below carry the colour, while the pips still name every member.",
      risks:
        "Member colour shrinks to pips, so a Cmaj7 and a C look alike at a glance. Two chords with the same root become harder to tell apart.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Root Music Color only; pips answer each member's progress." },
    },
  ],
};
