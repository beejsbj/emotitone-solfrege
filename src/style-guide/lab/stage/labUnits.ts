import type { StageLabDirection, StageLabUnit } from "@/types/stageLab";

/*
 * The Stage lab registry: every part of the Stage is its own unit. A unit's
 * strip shows only that part (every other part is soloed out), production
 * first. Blobs, Connections and Lettering are the Note Bodies group:
 * independent parts that work together. Compose combines any picks.
 *
 * Directions left after Burooj's reviews (2026-10-02 cut; 2026-10-04 "Drop
 * dot family"; 2026-10-06 "Kill paper. We are going with lit." — the Paper
 * family is preserved on design/lab-stage-paper); his words are on each
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
      "Burooj, 2026-10-05: \"Drop spotlight. Band is just better. Should atmosphere be the complimentary color\" — after comparing both: \"I'm against complement.\" Burooj, 2026-10-03: \"Diffused spotlight and band are both lit vibes. And their non diffused are paper. They both can be alternates.\" Burooj, 2026-10-02: \"Graticule - kill/drop it. Tideline - kill it. … Spotlight and highlight bar are interesting. I wanna see a diffused version of them instead of a hard edge. Unlit panel and halftone are interesting too. Tho couldn't they be combined.\"",
    directions: [
      { id: "band", letter: "A", name: "Diffused Band", family: "lit", paper: "tomato",
        idea: "The poster's tilted highlight band as a soft-edged wash of light in the sounding pitch's own hue, deep and dark; Ink-3 in silence, its height following the envelope.",
        better: "Keeps the band's lean while losing the hard paper edge.",
        risks: "Same hue as the sounding note, so the scope and bodies have less contrast against their ground (the complement was tried and rejected).",
        bible: caution("Light", "A diffused shape; the bible's flat colour is the poster zone's rule.") },
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
    verdict: "Burooj, 2026-10-02: \"All meh. Rings is best.\" 2026-10-03, on a reference from another app: \"I like it for the blob vibe… The feel without the blur… we only need the vibe of the blob not the surrounding structure.\" Then: \"It will be a full disk/blob. No core. The aesthetic and motion is what I like from the reference image.\" In Lit the reference disc is production's own field under the Pop Look (Compose); Motion is production's, tightened by the Pop Look's knobs. 2026-10-06: \"Pop is just a look not new default.\" and \"Retire register rings.\" Lit keeps production's bodies; Pop ships as a Look.",
    directions: [
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
      "Burooj, 2026-10-02: \"Chord shape is best. Slur arc is good too. But doesn't work in merge. Kill rest.\" Slur Arcs now has a Merge reading: one scalloped phrase of slurs around the chord's outside. 2026-10-03: \"Chord shape cannot be for all families. Like the production connection family organic merge would work well with the reference image aesthetic.\" Lit uses production's organic Merge/Web (under the Pop Look); Paper uses Chord Shape, with Slur Arcs as its Web alternate. 2026-10-04: every connection in the lab now labels every chord interval in Merge too, not only its joins (production change filed as BJS-468). 2026-10-05, Chord Shape: \"Make the circle of fifth circle thingy invisible. So only the shape shows up. The note letter itself will show within the center of the blob.\" On Lit's firm Merge: \"Let it be one slab. That's fine.\" 2026-10-06: \"Kill paper. We are going with lit.\" Lit's connection is production's organic Merge/Web; Chord Shape and Slur Arcs left with Paper (preserved on design/lab-stage-paper).",
    directions: [
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
    ],
  },
];
