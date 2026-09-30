import type { LabCompoundUnit } from "@/types/compoundsLab";
import PatternReelBench from "./PatternReelBench.vue";

export const patternReelUnit: LabCompoundUnit = {
  id: "pattern-reel",
  name: "PatternStrip + PatternReel",
  source: "components/compounds/PatternStrip.vue · PatternReel.vue",
  bench: PatternReelBench,
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
      id: "quiet",
      letter: "B",
      name: "Quiet Deck",
      paper: "bone",
      skin: "quiet",
      idea:
        "Only Current shows its Piano Roll tape while the deck is collapsed. Predecessors peek as plain Ink edges with their titles, and their tapes appear as the deck unfolds.",
      better:
        "The collapsed stack stops drawing four coloured contours across the Drawer lip, so the busiest seam in the deck goes quiet until you reach for it.",
      risks:
        "It contradicts the accepted 'uniform persistent tape on every row, no selection-dependent suppression' constraint, so adopting it reopens Bar Tape's contract. You lose the glanceable shape of previous takes.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "caution", note: "Removes colour at rest; reverses an accepted Bar Tape rule." },
    },
    {
      id: "spine",
      letter: "C",
      name: "Cassette Spines",
      paper: "mustard",
      skin: "spine",
      idea:
        "Each strip reads as a cassette spine: an Ivory label tape stuck on the Ink row carries the title and has the Piano Roll printed along it. Peeking predecessors stack like tapes on a shelf.",
      better:
        "The phrase shelf becomes a tape shelf, a strong metaphor for takes, and the label is applied paper on hardware exactly as the bible describes.",
      risks:
        "Four stacked Ivory labels are the brightest thing at the bottom of the screen and compete with Music Color; the tape on Ivory needs a different contrast than on Ink.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Ivory paper is legal but bright; the Piano Roll stays Music Color." },
    },
  ],
};
