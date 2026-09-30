import type { LabCompoundUnit } from "@/types/compoundsLab";
import BeatIndicatorBench from "./BeatIndicatorBench.vue";

export const beatIndicatorUnit: LabCompoundUnit = {
  id: "beat-indicator",
  name: "Beat Indicator",
  source: "components/compounds/BeatIndicator.vue",
  bench: BeatIndicatorBench,
  reading:
    "Playing zone · chassis light. A Digital Arc-style ring of one segment per beat around Play/Stop, shown only during playback, driven by the shared UIBeat clock; the downbeat is Brass. Since Button became the Lit Keycap (#114), a circular ring wraps a square keycap.",
  directions: [
    {
      id: "square",
      letter: "A",
      name: "Square Collar",
      paper: "mustard",
      skin: "square",
      idea:
        "The ring becomes a square collar traced around the keycap's own outline, one segment per beat running clockwise from top centre, the downbeat in Brass. Same light, same kick, the keycap's shape.",
      better:
        "It fixes the mismatch directly: the only round thing around a square key goes, and the collar reads as part of the key's housing light rather than a separate gauge.",
      risks:
        "Four beats split cleanly into four sides, but 3/4 and 6/8 put segment ends mid-side or around corners. It still overhangs the bar's block inset like the ring does.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Light answers the beat; Brass only on the downbeat." },
    },
    {
      id: "lip",
      letter: "B",
      name: "Lip Counter",
      paper: "cobalt",
      skin: "lip",
      idea:
        "No wrapper at all. The Lit Keycap's own lip (the lit arc under the cap) splits into one segment per beat and lights the current beat, Brass on the downbeat. The key counts time with the light it already has.",
      better:
        "It removes an element instead of reshaping it: no 44px ring overhanging the bar, no second light source competing with the keycap's lip, and it uses grammar Burooj already accepted.",
      risks:
        "The lip is small, so the beat is less visible at a glance than a ring. Adoption would need Button to let a consumer drive its lip segments, which is a new Button seam.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "Reuses the accepted Lit Keycap light; no new material." },
    },
    {
      id: "chads",
      letter: "C",
      name: "Step Chads",
      paper: "plum",
      skin: "chads",
      idea:
        "The ring leaves the key: a short column of hand-cut LED chads, the Knob collar's grammar, stands beside Play and lights one chad per beat like a drum machine's step lights.",
      better:
        "Play goes back to being just a key, and the beat gets the Knob family's LED chads, so the bar's two light languages become one. Counting down a column reads as a bar, not a clock.",
      risks:
        "It takes about 10px of width from the Code Strip at 390px. A separate indicator is easier to ignore than light on the control you touch.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "LED collar chads; Brass downbeat; hidden while idle as today." },
    },
  ],
};
