import type { LabCompoundUnit } from "@/types/compoundsLab";
import BeatIndicatorBench from "./BeatIndicatorBench.vue";

export const beatIndicatorUnit: LabCompoundUnit = {
  id: "beat-indicator",
  name: "Beat Indicator",
  source: "components/compounds/BeatIndicator.vue",
  bench: BeatIndicatorBench,
  verdict:
    "Burooj, 2026-10-01: \"we can combine B and C. Making the step Chads be under or on top of the the play button. Instead of on the right.\" Square Collar is dropped; both placements are shown.",
  reading:
    "Playing zone · chassis light. A Digital Arc-style ring of one segment per beat around Play/Stop, shown only during playback, driven by the shared UIBeat clock; the downbeat is Brass. Since Button became the Lit Keycap (#114), a circular ring wraps a square keycap.",
  directions: [
    {
      id: "chad-lip",
      letter: "A",
      name: "Chad Lip",
      paper: "cobalt",
      skin: "chad-lip",
      idea:
        "Lip Counter and Step Chads combined: no ring. While the transport runs, a row of hand-cut LED chads takes the place of the Lit Keycap's lip under Play, one per beat, read left to right, with a Brass downbeat.",
      better:
        "Play stays a plain key with no 44px ring overhanging the bar, and the beat uses the Knob collar's chads, so the bar speaks one light language. The count sits where the key already shows its light.",
      risks:
        "The row is small (about 5px chads at the 32px bar key), and it uses the bar's 12px block inset under the key. Adoption needs Button to let a consumer replace its lip while playing.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "LED collar chads; Brass downbeat; hidden while idle as today." },
    },
    {
      id: "chad-crown",
      letter: "B",
      name: "Chad Crown",
      paper: "plum",
      skin: "chad-crown",
      idea:
        "The same chad row sitting on top of Play instead of under it, so the keycap keeps its own lip and the beat reads above the key like a meter's lamps.",
      better:
        "The keycap's accepted lip is untouched, so adoption needs no Button change, and the count sits where the eye lands before the thumb covers the key.",
      risks:
        "Two light rows on one key (chads above, lip below) can read busier than A. It uses the bar's block inset above the key instead.",
      bible: { zone: "Playing zone", role: "Chassis", fit: "fits", note: "LED collar chads; Brass downbeat; hidden while idle as today." },
    },
  ],
};
