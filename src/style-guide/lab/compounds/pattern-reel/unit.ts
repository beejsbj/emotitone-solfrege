import type { LabCompoundUnit } from "@/types/compoundsLab";
import PatternReelBench from "./PatternReelBench.vue";

export const patternReelUnit: LabCompoundUnit = {
  id: "pattern-reel",
  name: "PatternStrip + PatternReel",
  source: "components/compounds/PatternStrip.vue · PatternReel.vue",
  bench: PatternReelBench,
  verdict:
    "Burooj, 2026-10-01: \"I do like the ransom titles. I think one thing we can experiment with is retiring the pattern strip's bar tape … to a circular sequencer that can sit to the left of the button and right of the texts, so between them. Since all strudel is technically a loop anyway.\" Quiet Deck and Cassette Spines are dropped.",
  reading:
    "Playing zone · chassis rows. Each phrase is a fixed 51.2px Ink PatternStrip with a root-colour spine and a 6px Piano Roll Bar Tape on its top edge. The collapsed deck peeks three predecessors above Current, so up to four contours stack over the Drawer lip. Burooj asked to try the retired Ransom cut letters on the pattern row, in Ink and Ivory only.",
  directions: [
    {
      id: "ransom",
      letter: "A",
      name: "Ransom Titles",
      paper: "tomato",
      skin: "ransom",
      idea:
        "Each phrase title is set in Ransom cut letters: every letter its own small scrap, alternating Ink on Ivory and Ivory on Ink, with slight tilts and mixed sizes. The rest of the strip is unchanged.",
      better:
        "Titles become labels pasted onto the take, the hardware-with-paper seam at its most literal, and the shelf gains the identity the rest of the deck already has, at the exact spot Burooj pointed to.",
      risks:
        "Cut letters are slower to read at 51.2px, and long titles run out of room sooner. Renaming must still edit plain text.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Ink and Ivory scraps only, as Burooj specified." },
    },
    {
      id: "loop",
      letter: "B",
      name: "Loop Dial",
      paper: "cobalt",
      skin: "loop",
      idea:
        "The Bar Tape retires from the strip's top edge. A small circular sequencer sits between the title and the actions and lays the same events around one loop, clockwise from twelve o'clock: each arc as long as its duration, set further out the higher its pitch.",
      better:
        "All Strudel is a loop, and the dial says so: a phrase reads as a cycle you come back to, not a line that ends. Without the tape on every row, the collapsed deck stops stacking four contours over the Drawer lip.",
      risks:
        "It retires an accepted primitive's only consumer (Bar Tape's Piano Roll). At 34px the dial is small, and dense phrases make thin arcs. It takes width from the title, which matters with Ransom titles.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Music Color arcs on an Ink well; the same data the tape draws." },
    },
  ],
};
