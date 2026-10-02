import type { StageLabUnit } from "@/types/stageLab";

/*
 * The Stage lab registry: every part of the Stage is its own unit, back to
 * front. A direction repaints only its own part; every other part in its
 * frame stays production, so each pick can be adopted alone and any picks
 * can be combined in the Compose frame.
 */
export const STAGE_LAB_UNITS: StageLabUnit[] = [
  {
    id: "atmosphere",
    name: "Atmosphere",
    source: "composables/canvas/useAmbientRenderer.ts",
    reading:
      "The lowest layer. Production fills pure black, lays a radial Music Color wash (tonic, sounding pitch, support) over it and sprinkles random grey grain. The wash breathes slowly in silence and follows the envelope with sound; on a phone it reads as almost nothing.",
    keeps:
      "Its job and its clock: the slow silence breath handing over to the shared envelope (resolveAmbientLevel), and its place beneath everything.",
    pick:
      "A · Graticule. It gives the Stage a hardware ground that only lights when the music does. B is the strongest poster move and pairs with Paper Cut.",
    directions: [
      {
        id: "graticule", letter: "A", name: "Graticule", paper: "cobalt",
        idea: "Ink ground and a scope reticle (cross-hair, ring, minor ticks) centred on the Hilbert Scope. The reticle is chassis; only its edge-light, tinted by the sounding pitch, breathes in silence and brightens with sound.",
        better: "Ink replaces #000, the wash and grain go, and the Stage gains the structure of an instrument face without decoration.",
        risks: "A visible cross-hair is a permanent drawing on the Stage; at low light it must stay below the Strings.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "Chassis lines; light answers sound." },
      },
      {
        id: "band", letter: "B", name: "Highlight Band", paper: "tomato",
        idea: "One tilted flat band across the Stage behind the scope, the poster's highlight band. Ink-3 paper in silence; the sounding pitch's deep colour once it plays, its height following the envelope on a 12fps step.",
        better: "Flat colour instead of a gradient, and the most Let's Jazz gesture available to a background.",
        risks: "A large field of colour behind everything is loud and tints the whole Stage; the Stage reads as paper, not hardware.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Music Color only, but it treats the ground as pasted paper." },
      },
      {
        id: "panel", letter: "C", name: "Unlit Panel", paper: "pine",
        idea: "The ground is a dot-matrix panel of unlit LEDs. Its backlight steps from Ink-3 to Ink-4 as the envelope rises; nothing else.",
        better: "The digital reading of the ground; it pairs with the Dot Trace scope and LED Columns.",
        risks: "A full-Stage dot texture competes with the deck and every layer above it.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "Hardware panel, two backlight steps, no gradient." },
      },
    ],
  },
  {
    id: "strings",
    name: "Pitch Strings",
    source: "composables/canvas/useStringRenderer.ts",
    reading:
      "Full-height hairlines, one per pitch, in that pitch's colour. The sounding pitch's string vibrates with harmonics and damped ends and glows; release fades it back to its idle presence.",
    keeps:
      "Which strings exist and where, exact-pitch selection (borrowed pitches excite nothing), Presence and Response, and the vibration physics.",
    pick: "A · Long Exposure. It shows the vibration as a shape even in a still frame.",
    directions: [
      {
        id: "exposure", letter: "A", name: "Long Exposure", paper: "cobalt",
        idea: "A sounding string is drawn as a long-exposure photograph would show it: the faint envelope of its two extremes, with the instantaneous string burning brighter inside.",
        better: "The string's energy becomes a readable lens shape instead of a wobble you have to catch moving.",
        risks: "The envelope fill is soft light; on many simultaneous strings it can haze the Stage.",
        bible: { zone: "Playing zone", role: "Light", fit: "fits", note: "Light only where the string sounds." },
      },
      {
        id: "strips", letter: "B", name: "Torn Strips", paper: "tomato",
        idea: "Each string is a torn paper strip with ragged edges and a slight lean; a sounding strip thickens, gains an Ink offset and shudders on a 12fps step.",
        better: "Strings become cut paper in their pitch colour, like the Keys.",
        risks: "Idle strips are heavier than hairlines; stepped motion can read as lag.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Cut grammar in Music Color." },
      },
      {
        id: "columns", letter: "C", name: "LED Columns", paper: "pine",
        idea: "Each string is a column of lit dots on the panel grid, displaced a whole dot at a time.",
        better: "Digital reading of the strings, quantised like a hardware display.",
        risks: "Coarse; small vibrations disappear below one dot.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "Only lit dots carry colour." },
      },
    ],
  },
  {
    id: "scope",
    name: "Hilbert Scope",
    source: "composables/canvas/useHilbertScopeRenderer.ts",
    reading:
      "The primary musical body: the sound's analytic signal drawn as a glowing loop with a smeared, fading trail, coloured by the first sounding note.",
    keeps:
      "The Hilbert pair, its sigmoid mapping, the centre and radius from the Stage solver, and the colour policy.",
    pick: "A · Phosphor. It is the scope at its truest and the brightest thing on the Stage, as the primary body should be.",
    directions: [
      {
        id: "phosphor", letter: "A", name: "Phosphor", paper: "cobalt",
        idea: "A hot core beam inside its own glow, with phosphor persistence that halves the old trace every 110ms. An idle beam parks as a dim spot.",
        better: "Crisper and hotter than the smeared trail, and it reads as an instrument rather than an effect.",
        risks: "Dense chords and fast passages tangle into a bright knot.",
        bible: { zone: "Playing zone", role: "Light", fit: "fits", note: "Light answers sound; no blur." },
      },
      {
        id: "cut", letter: "B", name: "Paper Cut", paper: "tomato",
        idea: "Twelve times a second the loop is cut out as one flat sheet (even-odd, so self-crossings become holes) over a hard Ink offset. The last three cuts stack, darker and turned; silence peels them away.",
        better: "The waveform becomes a poster cut-out, flat and leaning, without leaving Music Color.",
        risks: "A big flat shape dominates the Stage and competes with the lettering; stepped motion.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Cut grammar in Music Color." },
      },
      {
        id: "dots", letter: "C", name: "Dot Trace", paper: "pine",
        idea: "The loop rasterised onto the dot grid; each lit dot decays on its own, which gives the trace its trail.",
        better: "The digital edition of the scope, pairing with the Unlit Panel.",
        risks: "Coarse at phone pitch; fine waveform detail is lost.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "Only lit dots carry colour." },
      },
    ],
  },
  {
    id: "bodies",
    name: "Note Bodies · Merge/Web",
    source: "composables/canvas/useBlobRenderer.ts · useBlobFieldRenderer.ts",
    reading:
      "Soft, blurred discs on the Circle-of-Fifths orbit, joined by the accepted organic Merge (one gooey shared body) or rooted Web filaments. Merge and Web stay inside this unit because production renders them as one material with the bodies. Accepted 2026-09-24, confirmed on a device 2026-09-27.",
    keeps:
      "Lifecycle, replay, exact-pitch colour, orbit positions and release timing all come from the production body renderer's prepared frames. Each direction publishes its relationship paths so lettering can place intervals.",
    pick:
      "B · Chord Shape. It is the only direction that teaches something new. If the gooey Merge has to stay, keep production Merge and take Chord Shape's dial and Web.",
    directions: [
      {
        id: "facets", letter: "A", name: "Cut Facets", paper: "mustard",
        idea: "Each note is a faceted cut-paper body whose flat colour sits off-register from an Ivory keyline. Merge pastes the bodies into one piece with wide two-tone bands; Web tapes every analyzed pair with thin strips.",
        better: "The faceted Let's Jazz illustration language, and each member's exact colour stays exact instead of mixing at the join.",
        risks: "It gives up the gooey Merge you accepted, and long-range bands can read as ball-and-stick. The keyline is a new outline.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "The keyline is the poster's off-register outline." },
      },
      {
        id: "chord-shape", letter: "B", name: "Chord Shape", paper: "cobalt",
        idea: "The Circle of Fifths the bodies already orbit becomes a dial of twelve stations, and the chord is the polygon its notes make on it. Every major triad is the same triangle turned; augmented is equilateral.",
        better: "The shape is the lesson: chord quality becomes a silhouette you learn to recognise, and the orbit explains itself.",
        risks: "The most diagrammatic direction. Twelve small labels add text; close voicings make thin slivers.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "The dial is chassis; only sounding stations and the chord carry colour." },
      },
      {
        id: "resonance", letter: "C", name: "Resonance", paper: "plum",
        idea: "Each note rings outward at a rate proportional to its pitch; no lines. In Web the crossings of rings are the relationship; in Merge the chord rings as one body from its centre.",
        better: "Consonance shown physically, made of the sound itself.",
        risks: "Constant rings while notes hold; competes with the circular scope; busy on big chords.",
        bible: { zone: "Playing zone", role: "Light", fit: "caution", note: "Sound-driven, but busy." },
      },
    ],
  },
  {
    id: "flecks",
    name: "Note Flecks",
    source: "composables/canvas/useParticleSystem.ts",
    reading:
      "On each attack, Marks from the full family appear at random places across the whole Stage in the note's accent colour, drift a little and fade out.",
    keeps: "Attack-driven only, the randomised whole Mark family, and nothing in flight under Reduced Motion.",
    pick: "B · Chads. They are the most playful answer to an attack and leave physically instead of fading.",
    directions: [
      {
        id: "sparks", letter: "A", name: "Sparks", paper: "cobalt",
        idea: "Marks are thrown off the scope's ring as sparks, streaking outward, slowing and decaying like phosphor.",
        better: "Flecks come from the sound's body instead of appearing anywhere, so they read as a consequence of the note.",
        risks: "They cluster around the scope and the bodies near it.",
        bible: { zone: "Playing zone", role: "Light", fit: "fits", note: "Light answers the attack." },
      },
      {
        id: "chads", letter: "B", name: "Chads", paper: "tomato",
        idea: "Marks pop up from the scope as cut chads with an Ink offset, tumble edge-on under gravity and fall off behind the deck. They never fade.",
        better: "Physical and playful: the attack throws paper, and the bounce grammar lives on the Stage.",
        risks: "Falling paper crosses everything below the scope, including the lettering.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "caution", note: "Cut grammar in Music Color." },
      },
      {
        id: "pixels", letter: "C", name: "Pixel Marks", paper: "pine",
        idea: "A Mark glyph lights on the dot grid at a random spot for a moment, then decays with the panel.",
        better: "The digital reading: a tiny pixel-font glyph per attack.",
        risks: "At phone pitch the glyphs are coarse and can read as noise.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "Only lit dots carry colour." },
      },
    ],
  },
  {
    id: "lettering",
    name: "Lettering",
    source: "composables/canvas/harmonicTypography.ts · useHarmonicGeometryRenderer.ts",
    reading:
      "The chord as a cut-paper Jazz headline with glyph tilt and hard Ink offsets, an optional curved emotion phrase, and small interval stamps on their connections, with a brief entrance per chord. Two organic trials (interval inside the filament, text in the Merge joins) were rolled back.",
    keeps:
      "The analysis and switches: chord, emotion and interval lines, Label Strength, and no recurring motion. Neither direction bends text into a filament or a join.",
    pick: "A · Label Tape. It reuses the accepted panel-heading tape and Stamp paper, so the Stage speaks the same paper as the menus.",
    directions: [
      {
        id: "tape", letter: "A", name: "Label Tape", paper: "mustard",
        idea: "The words are applied paper stuck onto the Stage: the chord in Ink on Ivory tape with an Ink offset, emotion on a thinner Ink tape, each interval on a small Ivory stamp at its connection's midpoint. A 140ms slap when the chord changes.",
        better: "Always legible over any colour beneath, and built from grammar already accepted (#129 tape, #108 stamps).",
        risks: "Ivory paper is the brightest thing on the Stage; it can outshout the scope.",
        bible: { zone: "Playing zone", role: "Applied paper", fit: "fits", note: "Ink and Ivory paper; no brand colour." },
      },
      {
        id: "readout", letter: "B", name: "Readout", paper: "cobalt",
        idea: "The words leave the canvas and become chassis: one fixed Readout window at the top of the Stage in the Readout primitive's recipe, chord, intervals and emotion in mono caps over ghost segments, with member pips as the only colour.",
        better: "The bodies stay free of text, and the theory always sits in the same place.",
        risks: "It loses the poster headline and puts words away from the shapes they describe.",
        bible: { zone: "Playing zone", role: "Chassis display", fit: "fits", note: "Reuses the accepted Readout recipe." },
      },
    ],
  },
];
