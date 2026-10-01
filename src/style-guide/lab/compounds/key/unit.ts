import type { LabCompoundUnit } from "@/types/compoundsLab";
import KeyBench from "./KeyBench.vue";

export const keyUnit: LabCompoundUnit = {
  id: "key",
  name: "Key",
  source: "components/compounds/Key.vue",
  bench: KeyBench,
  verdict:
    "Burooj, 2026-10-01: \"Key is alright. Not worth changing. Perhaps misprint could be added as one of the variants the keys randomize from.\" Label Scrap and Torn Top are dropped; Misprint stays as a candidate edition.",
  reading:
    "Playing zone · applied paper. A Key is cut paper in its pitch's Music Color, stuck onto the Keyboard hardware: a leaning quadrilateral with a Lets Jazz syllable, degree and octave. It owns the momentary press; the Keyboard owns density, which is accepted and must not change here.",
  directions: [
    {
      id: "misprint",
      letter: "A",
      name: "Misprint edition",
      paper: "mustard",
      skin: "misprint",
      idea:
        "Each Key is printed like the Let's Jazz poster: a hard Ink plate cut to the Key's silhouette, with the Music Color fill sitting a few pixels off register, and pressing pulls it into register. Not a replacement: it joins the daily edition draw as one more variant the Keys can come up in.",
      better:
        "The bible's signature move (colour fill sitting off its black outline) never reaches the product. Here it becomes the press itself, so the cut identity and the touch answer are one gesture instead of a darken-and-scale.",
      risks:
        "The offset costs about 3px of every face at 390px on a seven-wide row. If the Ink plate reads thin, it looks like a border, which the bible rejects.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "The poster's own offset grammar; colour stays pitch-only." },
    },
  ],
};
