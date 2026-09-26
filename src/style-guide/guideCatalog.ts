import type { GuideLayer, GuideLayerId } from "@/types/styleGuide";

/**
 * The guide's single table of contents. Layer pages, the index map, and the
 * masthead navigation all read from here; specimens stay real-source.
 */
export const GUIDE_LAYERS: GuideLayer[] = [
  {
    id: "tokens",
    number: "01",
    title: "Tokens",
    color: "bone",
    mark: "diamond",
    blurb: "Ink, Ivory, Brass, poster colour, cut geometry, jazz type, and the horn-section easings.",
    units: [
      { id: "ui-colors", name: "UI Colors", density: "detailed", specimen: () => import("./tokens/TokenUiColors.vue") },
      { id: "brand-colors", name: "Brand Colors", density: "short", specimen: () => import("./tokens/TokenBrandColors.vue") },
      { id: "music-color", name: "Music Color", density: "detailed", specimen: () => import("./tokens/TokenMusicColors.vue") },
      { id: "typography", name: "Typography", density: "detailed", specimen: () => import("./tokens/TokenTypography.vue") },
      { id: "spacing-radius", name: "Radius", density: "short", specimen: () => import("./tokens/TokenSpacingRadius.vue") },
      { id: "spacing-scale", name: "Spacing Scale", density: "short", specimen: () => import("./tokens/TokenSpacingScale.vue") },
      { id: "geometry", name: "Geometry", density: "detailed", specimen: () => import("./tokens/TokenGeometry.vue") },
      { id: "motion", name: "Motion", density: "detailed", specimen: () => import("./tokens/TokenMotion.vue") },
    ],
  },
  {
    id: "primitives",
    number: "02",
    title: "Primitives",
    color: "tomato",
    mark: "triangle",
    blurb: "Paper chads, stickers, notes, knobs, marks, and tabs — the pieces everything else is cut from.",
    units: [
      { id: "button", name: "Button", density: "short", specimen: () => import("./primatives/PrimitiveButtons.vue") },
      { id: "sticker", name: "Sticker + Badge", density: "short", specimen: () => import("./primatives/PrimitiveSticker.vue") },
      { id: "note", name: "Note", density: "detailed", specimen: () => import("./primatives/PrimitiveNote.vue") },
      { id: "knob-ring", name: "Knob · Ring", density: "detailed", specimen: () => import("./primatives/PrimitiveKnobsAnalog.vue") },
      { id: "knob-arc", name: "Knob · Arc", density: "detailed", specimen: () => import("./primatives/PrimitiveKnobsDigital.vue") },
      { id: "marks", name: "Marks", density: "short", specimen: () => import("./primatives/PrimitiveMarks.vue") },
      { id: "bar-tape", name: "Bar Tape", density: "short", specimen: () => import("./primatives/PrimitiveBarTape.vue") },
      { id: "tabs", name: "Tabs", density: "detailed", specimen: () => import("./primatives/PrimitiveTabs.vue"), focusedHref: "/style-guide/tabs" },
    ],
  },
  {
    id: "compounds",
    number: "03",
    title: "Compounds",
    color: "mustard",
    mark: "beam",
    blurb: "Keys, chords, keyboards, strips, and bars — primitives glued into working assemblies.",
    units: [
      { id: "key", name: "Key", density: "detailed", specimen: () => import("./compounds/CompoundKey.vue") },
      { id: "chord", name: "Chord", density: "detailed", specimen: () => import("./compounds/CompoundChord.vue") },
      { id: "keyboard", name: "Keyboard", density: "detailed", specimen: () => import("./compounds/CompoundKeyboard.vue") },
      { id: "beat-indicator", name: "Beat Indicator", density: "short", specimen: () => import("./compounds/CompoundBeatIndicator.vue") },
      { id: "code-strip-bar", name: "CodeStrip Bar", density: "short", specimen: () => import("./compounds/CompoundCodeStripBar.vue") },
      { id: "control-bar", name: "Control Bar", density: "short", specimen: () => import("./compounds/CompoundControlBar.vue") },
      { id: "pattern-strip", name: "PatternStrip", density: "short", specimen: () => import("./compounds/CompoundPatternStrip.vue") },
      { id: "pattern-reel", name: "PatternReel", density: "detailed", specimen: () => import("./compounds/CompoundPatternReel.vue"), focusedHref: "/style-guide/pattern-reel" },
    ],
  },
  {
    id: "uniques",
    number: "04",
    title: "Uniques",
    color: "plum",
    mark: "clef",
    blurb: "One-of-a-kind artifacts: the logo, the code strip, the joystick, the drawer, the harmonic canvas.",
    units: [
      { id: "brand-logo", name: "Brand Logo", density: "short", specimen: () => import("./uniques/UniqueBrandLogo.vue") },
      { id: "code-strip", name: "CodeStrip", density: "detailed", specimen: () => import("./uniques/UniqueCodeStrip.vue") },
      { id: "joystick", name: "Joystick", density: "detailed", specimen: () => import("./uniques/UniqueJoystick.vue") },
      { id: "drawer", name: "Drawer", density: "detailed", specimen: () => import("./uniques/UniqueDrawer.vue") },
      { id: "harmonic-geometry", name: "Harmonic Geometry", density: "detailed", specimen: () => import("./uniques/UniqueHarmonicGeometry.vue") },
    ],
  },
  {
    id: "compositions",
    number: "05",
    title: "Compositions",
    color: "cobalt",
    mark: "fermata",
    blurb: "Whole product surfaces, mounted from the same sources production runs.",
    units: [
      { id: "performance-deck", name: "PerformanceDeck", density: "detailed", focusedHref: "/style-guide/performance-deck", summary: "Bottom drawer, pattern reel, code strip bar, control bar, and keyboard as one deck." },
      { id: "stage", name: "Stage", density: "detailed", focusedHref: "/style-guide/stage", summary: "The unified canvas: Hilbert scope, blobs, strings, atmosphere, flecks, and lettering." },
      { id: "instrument-picker", name: "Instrument Picker", density: "detailed", focusedHref: "/style-guide/instrument-picker", summary: "Sounds and Shape in the top drawer, chosen with Ivory stickers." },
      { id: "config-menu", name: "Config Menu", density: "detailed", focusedHref: "/style-guide/config-menu", summary: "Eight shallow destinations of Ivory knobs and Brass masters." },
      { id: "loading-screen", name: "Loading Screen", density: "short", specimen: () => import("./compositions/CompositionLoadingScreen.vue") },
    ],
  },
  {
    id: "systems",
    number: "06",
    title: "Systems",
    color: "pine",
    mark: "repeat",
    blurb: "Protocols that run through every layer — the UI's pulse follows the music.",
    units: [
      { id: "ui-beat", name: "UIBeat", density: "detailed", specimen: () => import("./systems/SystemUIBeat.vue") },
    ],
  },
];

export const guideLayer = (id: GuideLayerId) =>
  GUIDE_LAYERS.find((layer) => layer.id === id);

export const guideLayerHref = (id: GuideLayerId) => `/style-guide/${id}`;
