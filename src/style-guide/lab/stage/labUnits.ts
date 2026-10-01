import type { StageLabUnit } from "@/types/stageLab";

/*
 * The Stage lab registry. Stage directions replace Atmosphere, Pitch Strings,
 * the Hilbert Scope and Note Flecks while bodies and lettering stay
 * production; Geometry directions replace bodies and Merge/Web while those
 * layers stay production. Each pick can therefore be adopted on its own.
 */
export const STAGE_LAB_UNITS: StageLabUnit[] = [
  {
    id: "stage",
    name: "Stage",
    source: "components/UnifiedVisualEffects.vue · composables/canvas/useUnifiedCanvas.ts and its layer renderers",
    reading:
      "Playing zone · the instrument's display. Production paints soft light on near-black: a glowing Hilbert loop with a trail, a radial Music Color wash under grain, hairline pitch Strings, and Mark flecks scattered at random. It fills with black rather than Ink and renders at CSS resolution, so on a 3× phone every edge is soft. These directions replace Atmosphere, Strings, the Hilbert Scope and Flecks; bodies and lettering stay production.",
    leaveAlone:
      "Composition and physics stay: the usable-region fit, Hilbert radius, Circle-of-Fifths orbit, exact-pitch String selection, the shared envelope, the silence breath, Reduced Motion stillness, and the Mark family. Every direction reads them through the production seams and changes only what is painted.",
    pick:
      "A · Phosphor, with C · LED Matrix as its digital edition alternating between loads, the way Knob Ring and Arc do. Phosphor is the truest reading of 'light answers sound' and makes Hilbert unmistakably the primary body. Paste-Up is the boldest identity move, but it asks the bible to call the Stage paper.",
    directions: [
      {
        id: "phosphor",
        letter: "A",
        name: "Phosphor",
        paper: "cobalt",
        idea:
          "The Stage is one vector-scope tube behind the deck. Everything is a beam of Music Color on Ink: nothing is filled or blurred, and every trace decays the way phosphor does.",
        layers: [
          { name: "Hilbert Scope", reading: "A hot core beam inside its own glow; phosphor persistence halves the old trace every 110ms." },
          { name: "Atmosphere", reading: "No wash. A scope graticule is the chassis; only its edge-light, tinted by the sounding pitch, breathes in silence and rises with the envelope." },
          { name: "Pitch Strings", reading: "A long exposure: the faint envelope of a string's two extremes with the instantaneous string burning between them." },
          { name: "Note Flecks", reading: "Mark sparks thrown off the beam's ring, streaking outward and decaying." },
        ],
        better:
          "It commits fully to the 'lit by a synth' half: light exists only where sound is, the scope is unmistakably the primary body, and the ground is Ink rather than #000.",
        risks:
          "Additive light can saturate on dense chords, and persistence turns fast passages into a tangle. The soft production bodies look foreign over a crisp beam until Harmonic Geometry is decided too.",
        bible: { zone: "Playing zone", role: "Light", fit: "fits", note: "Light answers sound; no fills, no blur, Ink ground." },
      },
      {
        id: "paste-up",
        letter: "B",
        name: "Paste-Up",
        paper: "tomato",
        idea:
          "Music cuts paper instead of emitting light. The Stage is a poster being pasted up while you play: flat Music Color cut on a 12fps stop-motion clock, a tilted highlight band, torn strips, and chads that fall off the bottom.",
        layers: [
          { name: "Hilbert Scope", reading: "Each step cuts the loop out as one flat sheet (even-odd, so self-crossings become holes) over a hard Ink offset. The last three cuts stack, older ones darker and turned, and silence peels them away." },
          { name: "Atmosphere", reading: "One tilted highlight band behind the scope: Ink paper in silence, the sounding pitch's deep colour once it plays, its height following the envelope." },
          { name: "Pitch Strings", reading: "Torn paper strips with ragged edges that shudder on the stop-motion clock." },
          { name: "Note Flecks", reading: "Confetti chads with an Ink offset that tumble under gravity and leave by falling behind the deck, never fading." },
        ],
        better:
          "It brings Let's Jazz into the playing zone the bible's way, flat, leaning, offset and handmade, while every colour still comes from the music. The Stage and the cut-paper Keys become one material.",
        risks:
          "The bible doesn't currently treat the Stage as applied paper. Large flat fills are loud behind the lettering, and a 12fps step can read as lag rather than craft.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Cut grammar in Music Color only; it reads the canvas as paper on the hardware." },
      },
      {
        id: "led",
        letter: "C",
        name: "LED Matrix",
        paper: "pine",
        idea:
          "The digital reading. The Stage is a dot-matrix panel: unlit LEDs are the chassis, every layer only lights pixels, and each pixel's light decays by itself.",
        layers: [
          { name: "Hilbert Scope", reading: "Rasterised onto the panel; the decaying LEDs give it a trail for free." },
          { name: "Atmosphere", reading: "The unlit panel itself; its backlight steps from Ink-3 to Ink-4 as the envelope rises." },
          { name: "Pitch Strings", reading: "Columns of LEDs, displaced a whole pixel at a time." },
          { name: "Note Flecks", reading: "Pixel Marks: a glyph from the Mark family lights for a moment and decays with the panel." },
        ],
        better:
          "It answers the bible's analog-or-digital question for the Stage. Phosphor is the analog edition and LED the digital one; they could alternate between loads like Knob Ring and Arc.",
        risks:
          "The dot grid covers the whole Stage and competes with the deck. At a 6–8px pitch on a phone the scope's shape is coarse, and smooth bodies and lettering above it mix two resolutions.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "A hardware panel; only lit pixels carry Music Color." },
      },
    ],
  },
  {
    id: "geometry",
    name: "Harmonic Geometry",
    source: "composables/canvas/useBlobRenderer.ts · useBlobFieldRenderer.ts · useHarmonicGeometryRenderer.ts",
    reading:
      "Playing zone · the Stage's support orbit. Production is the accepted organic Merge (one gooey shared body) and rooted Web filaments: soft, blurred discs on the Circle-of-Fifths orbit with the cut-paper Jazz lettering on top. Merge and Web were accepted on 2026-09-24 and confirmed on a device on 2026-09-27, so these are alternatives to compare, not corrections.",
    leaveAlone:
      "Lettering stays exactly as accepted: the harmonicTypography authority, its Jazz chord headline, interval stamps and entrances. Both organic-lettering trials were rolled back, so every direction publishes its relationship paths and lets that same authority place the words. Lifecycle, replay, exact-pitch colour, orbit positions and release timing all come from the production body renderer's prepared frames.",
    pick:
      "B · Chord Shape. It is the only direction that teaches something new, and it reads as instrument hardware. If the gooey Merge has to stay, keep production Merge and take Chord Shape's dial and Web.",
    directions: [
      {
        id: "facets",
        letter: "A",
        name: "Cut Facets",
        paper: "mustard",
        idea:
          "Each note is a faceted cut-paper body whose flat colour sits off-register from an Ivory keyline. Merge pastes the bodies into one piece with wide two-tone bands; Web tapes every analyzed pair with thin strips. Colour never blends: it meets at a hard cut.",
        layers: [
          { name: "Bodies", reading: "7–9 sided cuts riding the production contour, so they still breathe; flat facet shading in Ink and Ivory." },
          { name: "Merge", reading: "Wide two-tone bands along the spanning tree, overlapped by the bodies at both ends: one pasted piece." },
          { name: "Web", reading: "4px strips on the chord's perimeter and 2px inside, each split at a slanted seam." },
        ],
        better:
          "It applies the faceted Let's Jazz illustration language to the theory, and it fixes one thing the soft field can't: each member's exact colour stays exact instead of mixing at the join.",
        risks:
          "It gives up the gooey fusion Burooj accepted for Merge, and long-range bands can read as ball-and-stick. The Ivory keyline is a new outline and has to stay intentional grammar.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Cut grammar in Music Color; the keyline is the poster's off-register outline." },
      },
      {
        id: "chord-shape",
        letter: "B",
        name: "Chord Shape",
        paper: "cobalt",
        idea:
          "The Circle of Fifths the bodies already orbit becomes a visible dial of twelve stations, and the chord is the polygon its notes make on it. Every major triad is the same triangle turned, minor is its mirror, and augmented is equilateral.",
        layers: [
          { name: "Dial", reading: "Twelve chassis ticks with mono pitch names; a station lights in Music Color while its pitch sounds." },
          { name: "Bodies", reading: "Small flat vertex jewels in an Ink collar." },
          { name: "Merge", reading: "The polygon filled with flat, deep, opaque facets, one per member." },
          { name: "Web", reading: "The perimeter in two-tone edges plus finer inner diagonals." },
        ],
        better:
          "The shape is the lesson: chord quality becomes a silhouette you learn to recognise, and the orbit finally explains itself.",
        risks:
          "It is the most diagrammatic direction, with less body and more instrument face. Twelve small labels add text to a phone Stage, and close voicings make thin slivers.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "The dial is chassis; only sounding stations and the chord carry colour." },
      },
      {
        id: "resonance",
        letter: "C",
        name: "Resonance",
        paper: "plum",
        idea:
          "A sounding note is a source that rings outward at a rate proportional to its pitch. There are no connecting lines: in Web the relationship is where rings cross, and in Merge the chord rings as one body from its centre.",
        layers: [
          { name: "Bodies", reading: "One flat opaque core per note." },
          { name: "Web", reading: "Each note emits rings at a base rate × its frequency over the lowest; a fifth makes a slow regular lattice (3:2), a dissonance crosses irregularly." },
          { name: "Merge", reading: "One source at the chord's centre; each ring takes the next member's colour, low to high." },
        ],
        better:
          "It shows consonance physically instead of naming it, and it is the only direction where the relationship is made of the sound itself.",
        risks:
          "Rings run for as long as notes hold, so the motion must stay strictly sound-driven. Ring fields compete with the Hilbert Scope, which is also circular, and a busy chord is hard to read.",
        bible: { zone: "Playing zone", role: "Light", fit: "caution", note: "Light answers sound, but it is busy; Reduced Motion shows three still rings." },
      },
    ],
  },
];
