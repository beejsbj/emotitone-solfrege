import type { LabCompoundUnit } from "@/types/compoundsLab";
import KeyBench from "./KeyBench.vue";

export const keyUnit: LabCompoundUnit = {
  id: "key",
  name: "Key",
  source: "components/compounds/Key.vue",
  bench: KeyBench,
  reading:
    "Playing zone · applied paper. A Key is cut paper in its pitch's Music Color, stuck onto the Keyboard hardware: a leaning quadrilateral with a Lets Jazz syllable, degree and octave. It owns the momentary press; the Keyboard owns density, which is accepted and must not change here.",
  directions: [
    {
      id: "misprint",
      letter: "A",
      name: "Misprint",
      paper: "mustard",
      skin: "misprint",
      idea:
        "Each Key is printed like the Let's Jazz poster: a hard Ink plate cut to the Key's silhouette, with the Music Color fill sitting a few pixels off register. Pressing pulls the fill into register, so the press is the print landing.",
      better:
        "The bible's signature move (colour fill sitting off its black outline) never reaches the product. Here it becomes the press itself, so the cut identity and the touch answer are one gesture instead of a darken-and-scale.",
      risks:
        "The offset costs about 3px of every face at 390px on a seven-wide row. If the Ink plate reads thin, it looks like a border, which the bible rejects.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "The poster's own offset grammar; colour stays pitch-only." },
    },
    {
      id: "scrap",
      letter: "B",
      name: "Label Scrap",
      paper: "plum",
      skin: "scrap",
      idea:
        "The syllable moves off the coloured face onto a small tilted Ink scrap pasted on the Key, like the Brand Logo's ET scraps. Degree and octave stay small on the face itself.",
      better:
        "Ivory type on pitch colour changes contrast from key to key (Sol and Ti are much lighter than Do). An Ink scrap gives every syllable the same contrast and ties the Keyboard to the logo's paste-up.",
      risks:
        "Twenty-eight scraps can be busy, and each covers part of the pitch colour. The accepted 24/18px label caps must still fit the scrap.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Ink scrap on Music Color paper; no brand paper." },
    },
    {
      id: "deckle",
      letter: "C",
      name: "Torn Top",
      paper: "tomato",
      skin: "deckle",
      idea:
        "Each Key loses its machined top cut for a torn edge, seeded per pitch so every Key tears differently, with a thin paper core showing along the tear. The sides keep their lean.",
      better:
        "The Keys read unmistakably as paper stuck onto hardware rather than as coloured buttons, and every Key becomes an individual pressing, the bible's aliveness through variation.",
      risks:
        "Twenty-eight torn edges add noise at the top of every row, and the tear eats a few pixels of face height the density decision counted on.",
      bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Paper grammar; the paper core must be Ivory, never a brand paper." },
    },
  ],
};
