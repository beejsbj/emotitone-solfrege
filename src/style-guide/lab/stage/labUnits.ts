import type { StageLabDirection, StageLabUnit } from "@/types/stageLab";

/*
 * The Stage lab registry: every part of the Stage is its own unit. A unit's
 * strip shows only that part (every other part is soloed out), production
 * first. Blobs, Connections and Lettering are the Note Bodies group:
 * independent parts that work together. Compose combines any picks.
 *
 * Directions left after Burooj's reviews (2026-10-02 cut, 2026-10-04: "Drop
 * dot family"); his words are on each unit's verdict. Letters are reassigned
 * to the survivors.
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
      "Burooj, 2026-10-05: \"Drop spotlight. Band is just better. Should atmosphere be the complimentary color\" — both hues are here to compare. Burooj, 2026-10-03: \"Diffused spotlight and band are both lit vibes. And their non diffused are paper. They both can be alternates.\" Burooj, 2026-10-02: \"Graticule - kill/drop it. Tideline - kill it. … Spotlight and highlight bar are interesting. I wanna see a diffused version of them instead of a hard edge. Unlit panel and halftone are interesting too. Tho couldn't they be combined.\"",
    directions: [
      { id: "band", letter: "A", name: "Diffused Band", family: "lit", paper: "tomato",
        idea: "The poster's tilted highlight band as a soft-edged wash of light in the sounding pitch's own hue, deep and dark; Ink-3 in silence, its height following the envelope.",
        better: "Keeps the band's lean while losing the hard paper edge.",
        risks: "Same hue as the sounding note, so the scope and bodies lose contrast against their own ground.",
        bible: caution("Light", "A diffused shape; the bible's flat colour is the poster zone's rule.") },
      { id: "band-complement", letter: "B", name: "Diffused Band · Complement", family: "lit", paper: "plum",
        idea: "The same diffused band in the sounding pitch's complementary accent: the Music Color authority's own hue turned 180°, deep and dark.",
        better: "The sounding colour pops against its opposite, the jazz poster's complementary pairing.",
        risks: "Pitches sit 30° apart, so the complement is the tritone's hue: while C plays the ground is F♯'s colour, which can read as another pitch sounding.",
        bible: caution("Light", "Music Color's own accent, kept dark so it reads as ground.") },
      { id: "band-cut", letter: "C", name: "Cut Band", family: "paper", paper: "tomato",
        idea: "The same band as a hard-edged strip of paper in the sounding pitch's hue, stepping with the 12fps clock.",
        better: "The poster's highlight band, literally.",
        risks: "A big colour field behind everything; same-hue contrast loss.",
        bible: caution("Applied paper", "Music Color only, but the ground becomes pasted paper.") },
      { id: "band-cut-complement", letter: "D", name: "Cut Band · Complement", family: "paper", paper: "plum",
        idea: "The cut band in the complementary accent.",
        better: "Complementary paper pairing, as on the Let's Jazz posters.",
        risks: "The tritone's hue as ground.",
        bible: caution("Applied paper", "Music Color's own accent.") },
    ],
  },
  {
    id: "scope",
    name: "Hilbert Scope",
    source: "composables/canvas/useHilbertScopeRenderer.ts",
    reading: "The primary musical body: the analytic signal as a glowing loop with a smeared, fading trail, coloured by the first sounding note.",
    keeps: "The Hilbert pair and its mapping, the centre and radius from the Stage solver, and the colour policy.",
    verdict:
      "Burooj, 2026-10-02: \"paper cut and brush are most interesting reimaginings. groove and waveform. Kill them. phosphorus is a nice alt to the production. dots one works well with the two dot atmosphere ones.\" Then, 2026-10-03: \"Phosphor doesn't need to replace the current scope. Cause the current scope is beautiful too. And phosphorus seems like a tweak of knobs.\" Phosphor is now the Phosphor Look on the production scope (see Looks).",
    directions: [
      { id: "cut", letter: "A", name: "Paper Cut", family: "paper", paper: "tomato",
        idea: "Twelve times a second the loop is cut out as one flat sheet over an Ink offset; the last three stack and silence peels them away.",
        better: "The waveform as a poster cut-out.",
        risks: "A big flat shape; stepped motion.",
        bible: caution("Applied paper", "Cut grammar in Music Color.") },
      { id: "brush", letter: "B", name: "Brush", family: "paper", paper: "plum",
        idea: "The loop painted in one calligraphic stroke: a flat nib at a fixed angle makes it thick and thin as the waveform turns. A fresh stroke each frame.",
        better: "The poster's hand inside the instrument.",
        risks: "Busy frame to frame; thick strokes can block the bodies.",
        bible: caution("Applied paper", "Hand-made line in Music Color.") },
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
      { id: "strips", letter: "A", name: "Torn Strips", family: "paper", paper: "tomato",
        idea: "Ragged paper strips with a lean; a sounding strip thickens, gains an Ink offset and shudders at 12fps.",
        better: "Strings become cut paper like the Keys.",
        risks: "Heavier idle strings; stepped motion.",
        bible: caution("Applied paper", "Cut grammar in Music Color.") },
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
    verdict: "Burooj, 2026-10-02: \"All meh. Rings is best.\" 2026-10-03, on a reference from another app: \"I like it for the blob vibe… The feel without the blur… we only need the vibe of the blob not the surrounding structure.\" Then: \"It will be a full disk/blob. No core. The aesthetic and motion is what I like from the reference image.\" In Lit the reference disc is production's own field under the Pop Look (Compose); Paper and Dot discs are below. Motion is production's, tightened by the Pop Look's knobs.",
    directions: [
      { id: "pop-cut", letter: "A", name: "Paper Disc", family: "paper", paper: "tomato",
        idea: "The reference blob in paper: one full, firm, flat disc per note over a hard Ink offset, popping in on the attack, holding still and shrinking away on release, its size advancing on the 12fps cut clock.",
        better: "The reference's aesthetic and motion with the poster's offset; no fog.",
        risks: "Flat discs on the orbit are heavier than production's soft bodies.",
        bible: fits("Applied paper", "Cut grammar in Music Color.") },
      { id: "rings", letter: "B", name: "Register Rings", family: "any", paper: "plum",
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
      "Burooj, 2026-10-02: \"Chord shape is best. Slur arc is good too. But doesn't work in merge. Kill rest.\" Slur Arcs now has a Merge reading: one scalloped phrase of slurs around the chord's outside. 2026-10-03: \"Chord shape cannot be for all families. Like the production connection family organic merge would work well with the reference image aesthetic.\" Lit uses production's organic Merge/Web (under the Pop Look); Paper uses Chord Shape, with Slur Arcs as its Web alternate. 2026-10-04: every connection in the lab now labels every chord interval in Merge too, not only its joins (production change filed as BJS-468). 2026-10-05, Chord Shape: \"Make the circle of fifth circle thingy invisible. So only the shape shows up. The note letter itself will show within the center of the blob.\" On Lit's firm Merge: \"Let it be one slab. That's fine.\"",
    directions: [
      { id: "chord-shape", letter: "A", name: "Chord Shape", family: "paper", paper: "cobalt",
        idea: "The chord is the polygon its notes make on the circle of fifths the bodies already orbit (the circle itself stays invisible), and each body carries its note letter at its centre. Merge fills the shape with flat deep facets; Web adds the diagonals.",
        better: "Chord quality becomes a silhouette: every major triad the same triangle turned.",
        risks: "A letter on every body adds text beside the chord and interval lettering.",
        bible: fits("Applied paper", "Flat facets in Music Color; Ivory letters.") },
      { id: "slurs", letter: "B", name: "Slur Arcs", family: "paper", paper: "bone",
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
    verdict: "Burooj, 2026-10-02: \"Flecks best is C. Then B. Kill rest.\" (C was Pixel Marks, B was Chads; Pixel Marks left with the Dot family on 2026-10-04.) 2026-10-03: \"Flecks honestly are the most performance consuming.\" Turn on Timings to see each part's measured cost.",
    directions: [
      { id: "chads", letter: "A", name: "Chads", family: "paper", paper: "tomato",
        idea: "Cut Marks with an Ink offset pop from the scope, tumble and fall off behind the deck; they never fade.",
        better: "Physical and playful.",
        risks: "Falling paper crosses the lettering.",
        bible: caution("Applied paper", "Cut grammar in Music Color.") },
    ],
  },
];
