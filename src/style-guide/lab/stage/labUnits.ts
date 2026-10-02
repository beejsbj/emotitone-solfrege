import type { StageLabDirection, StageLabUnit } from "@/types/stageLab";

/*
 * The Stage lab registry: every part of the Stage is its own unit. A unit's
 * strip shows only that part (every other part is soloed out), production
 * first. Blobs, Connections and Lettering are the Note Bodies group:
 * independent parts that work together. Compose combines any picks.
 *
 * Directions left after Burooj's review on 2026-10-02; his words are on each
 * unit's verdict. Letters are reassigned to the survivors.
 */

const fits = (role: StageLabDirection["bible"]["role"], note: string): StageLabDirection["bible"] =>
  ({ zone: "Playing zone", role, fit: "fits", note });
const caution = (role: StageLabDirection["bible"]["role"], note: string): StageLabDirection["bible"] =>
  ({ zone: "Playing zone", role, fit: "caution", note });

export const STAGE_LAB_UNITS: StageLabUnit[] = [
  {
    id: "atmosphere",
    name: "Atmosphere",
    source: "composables/canvas/useAmbientRenderer.ts",
    reading:
      "The ground. Production fills pure black, lays a radial Music Color wash and sprinkles random grain; it breathes in silence and follows the envelope with sound.",
    keeps: "The clock: the silence breath handing over to the shared envelope, and its place beneath everything.",
    verdict:
      "Burooj, 2026-10-02: \"Graticule - kill/drop it. Tideline - kill it. … Spotlight and highlight bar are interesting. I wanna see a diffused version of them instead of a hard edge. Unlit panel and halftone are interesting too. Tho couldn't they be combined.\"",
    directions: [
      { id: "band", letter: "A", name: "Diffused Band", paper: "tomato",
        idea: "The poster's tilted highlight band as a soft-edged wash of light: Ink-3 in silence, the sounding pitch's deep colour once it plays, its height following the envelope.",
        better: "Keeps the band's lean and placement while losing the hard paper edge.",
        risks: "A soft colour field is close to production's wash; the lean is what makes it ours.",
        bible: caution("Light", "A diffused shape, as Burooj asked; the bible's 'flat colour' is the poster zone's rule.") },
      { id: "spotlight", letter: "B", name: "Diffused Spotlight", paper: "mustard",
        idea: "A jazz-club spot from above onto the scope as a soft beam with a brighter pool where it lands, in the sounding pitch's colour; it opens with the envelope, a dim Ink house light in silence.",
        better: "The light has a source and a target: the music is what it lights.",
        risks: "Always points at the scope, even when the bodies are the interest.",
        bible: fits("Light", "Light answers sound.") },
      { id: "halftone-panel", letter: "C", name: "Halftone Panel", paper: "pine",
        idea: "Unlit Panel and Halftone combined: the ground is the unlit LED grid, and light is printed onto the same grid as halftone, dots swelling in the sounding pitch's colour around the scope.",
        better: "One dot language for ground and light, sharing a grid with Dot Trace, LED Columns and Pixel Marks.",
        risks: "Full-Stage texture behind everything.",
        bible: fits("Chassis display", "Hardware grid; light is dot size.") },
    ],
  },
  {
    id: "scope",
    name: "Hilbert Scope",
    source: "composables/canvas/useHilbertScopeRenderer.ts",
    reading: "The primary musical body: the analytic signal as a glowing loop with a smeared, fading trail, coloured by the first sounding note.",
    keeps: "The Hilbert pair and its mapping, the centre and radius from the Stage solver, and the colour policy.",
    verdict:
      "Burooj, 2026-10-02: \"paper cut and brush are most interesting reimaginings. groove and waveform. Kill them. phosphorus is a nice alt to the production. dots one works well with the two dot atmosphere ones.\"",
    directions: [
      { id: "phosphor", letter: "A", name: "Phosphor", paper: "cobalt",
        idea: "A hot core beam inside its own glow with phosphor persistence that halves every 110ms.",
        better: "A crisper alternative to production's smear.",
        risks: "Dense chords tangle into a bright knot.",
        bible: fits("Light", "No blur; light answers sound.") },
      { id: "cut", letter: "B", name: "Paper Cut", paper: "tomato",
        idea: "Twelve times a second the loop is cut out as one flat sheet over an Ink offset; the last three stack and silence peels them away.",
        better: "The waveform as a poster cut-out.",
        risks: "A big flat shape; stepped motion.",
        bible: caution("Applied paper", "Cut grammar in Music Color.") },
      { id: "brush", letter: "C", name: "Brush", paper: "plum",
        idea: "The loop painted in one calligraphic stroke: a flat nib at a fixed angle makes it thick and thin as the waveform turns. A fresh stroke each frame.",
        better: "The poster's hand inside the instrument.",
        risks: "Busy frame to frame; thick strokes can block the bodies.",
        bible: caution("Applied paper", "Hand-made line in Music Color.") },
      { id: "dots", letter: "D", name: "Dot Trace", paper: "pine",
        idea: "The loop rasterised onto the dot grid; each lit dot decays on its own.",
        better: "Pairs with the Halftone Panel ground.",
        risks: "Coarse at phone pitch.",
        bible: fits("Chassis display", "Only lit dots carry colour.") },
    ],
  },
  {
    id: "strings",
    name: "Pitch Strings",
    source: "composables/canvas/useStringRenderer.ts",
    reading: "Full-height hairlines, one per pitch, in that pitch's colour; the sounding pitch's string vibrates with harmonics and damped ends.",
    keeps: "Which strings exist and where, exact-pitch selection, Presence and Response, and the vibration physics.",
    verdict: "Burooj, 2026-10-02: \"B and C are most interesting. Kill others.\"",
    directions: [
      { id: "strips", letter: "A", name: "Torn Strips", paper: "tomato",
        idea: "Ragged paper strips with a lean; a sounding strip thickens, gains an Ink offset and shudders at 12fps.",
        better: "Strings become cut paper like the Keys.",
        risks: "Heavier idle strings; stepped motion.",
        bible: caution("Applied paper", "Cut grammar in Music Color.") },
      { id: "columns", letter: "B", name: "LED Columns", paper: "pine",
        idea: "Columns of lit dots on the shared grid, displaced a whole dot at a time.",
        better: "Quantised like hardware; pairs with the dot parts.",
        risks: "Small vibrations vanish below one dot.",
        bible: fits("Chassis display", "Only lit dots carry colour.") },
    ],
  },
  {
    id: "blobs",
    name: "Blobs",
    group: "Note Bodies",
    source: "composables/canvas/useBlobRenderer.ts",
    reading:
      "One body per sounding note on the Circle-of-Fifths orbit: a soft, blurred, glowing disc whose contour vibrates. Production fuses bodies with their Merge/Web; here the bodies stand alone.",
    keeps: "Lifecycle, replay, exact-pitch colour, orbit positions, contour vibration and release timing, from the production body renderer's prepared frames.",
    verdict: "Burooj, 2026-10-02: \"All meh. Rings is best.\"",
    directions: [
      { id: "rings", letter: "A", name: "Register Rings", paper: "plum",
        idea: "A flat core with one ring per scientific octave (C4 has four), the outer ring riding the contour: high notes are many fine rings, low notes a few wide ones.",
        better: "Register becomes visible, which colour lightness alone only hints at.",
        risks: "Dense on high notes; the count needs learning.",
        bible: fits("Light", "Music Color only; no blur.") },
    ],
  },
  {
    id: "connections",
    name: "Connections · Merge/Web",
    group: "Note Bodies",
    source: "composables/canvas/useBlobFieldRenderer.ts",
    reading:
      "How bodies relate. Production's organic Merge fuses bodies into one gooey body; Web joins every analyzed pair with rooted filaments. Production cannot draw them without the bodies (one field), so its frame here shows the fused field.",
    keeps: "Which pairs relate, Merge as one connected body and Web as the full graph, and publishing the drawn path so lettering lands on it.",
    verdict:
      "Burooj, 2026-10-02: \"Chord shape is best. Slur arc is good too. But doesn't work in merge. Kill rest.\" Slur Arcs now has a Merge reading: one scalloped phrase of slurs around the chord's outside.",
    directions: [
      { id: "chord-shape", letter: "A", name: "Chord Shape", paper: "cobalt",
        idea: "The Circle of Fifths becomes a dial of twelve stations and the chord is the polygon its notes make on it; Merge fills it with flat deep facets, Web adds the diagonals.",
        better: "Chord quality becomes a silhouette: every major triad the same triangle turned.",
        risks: "Diagrammatic; twelve small labels.",
        bible: fits("Chassis display", "The dial is chassis; only sounding stations carry colour.") },
      { id: "slurs", letter: "B", name: "Slur Arcs", paper: "bone",
        idea: "Relationships are engraved slurs, tapered Ivory crescents taller for wider intervals. Web slurs every analyzed pair; Merge runs one scalloped phrase of slurs around the chord's outside so the notes read as one enclosed body.",
        better: "Notation's own mark for notes that belong together.",
        risks: "Ivory arcs are bright; wide chords make tall arcs near the Stage edge.",
        bible: fits("Chassis display", "Notation ink, no brand colour.") },
    ],
  },
  {
    id: "lettering",
    name: "Lettering",
    group: "Note Bodies",
    source: "composables/canvas/harmonicTypography.ts",
    reading:
      "The chord as a cut-paper Jazz headline with glyph tilt and hard Ink offsets, an optional emotion phrase, and interval stamps on their connections.",
    keeps: "Everything: no lab direction survived review, so production lettering stays.",
    verdict: "Burooj, 2026-10-02: \"Lettering non are good.\" Label Tape, Readout, Lead Sheet, Neon Sign and Roman Function are retired.",
    directions: [],
  },
  {
    id: "flecks",
    name: "Note Flecks",
    source: "composables/canvas/useParticleSystem.ts",
    reading: "On each attack, Marks from the whole family appear at random places across the Stage in the note's colour, drift a little and fade.",
    keeps: "Attack-driven only, the randomised whole Mark family, and nothing in flight under Reduced Motion.",
    verdict: "Burooj, 2026-10-02: \"Flecks best is C. Then B. Kill rest.\" (C was Pixel Marks, B was Chads.)",
    directions: [
      { id: "pixels", letter: "A", name: "Pixel Marks", paper: "pine",
        idea: "A Mark lights on the shared dot grid for a moment, then decays.",
        better: "A pixel-font glyph per attack; pairs with the dot parts.",
        risks: "Coarse; can read as noise.",
        bible: fits("Chassis display", "Only lit dots carry colour.") },
      { id: "chads", letter: "B", name: "Chads", paper: "tomato",
        idea: "Cut Marks with an Ink offset pop from the scope, tumble and fall off behind the deck; they never fade.",
        better: "Physical and playful.",
        risks: "Falling paper crosses the lettering.",
        bible: caution("Applied paper", "Cut grammar in Music Color.") },
    ],
  },
];
