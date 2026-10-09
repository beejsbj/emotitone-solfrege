/**
 * The design law as data: which files are in which zone, what each zone may
 * not do, and the explicit allowlists of violations that predate the lint
 * (BJS-481). ESLint (eslint.config.js, lint/eslintPluginDesignLaw.mjs) and
 * Stylelint (stylelint.config.mjs) both read this file, so there is one place to
 * review and one place to shrink.
 *
 * The law itself is src/style-guide/WIP-bible.md, section 3 (two zones) and
 * section 4 (colour law). In short: playing-zone colour is only Music Color plus
 * Ink / Ivory / Brass tokens; the brand papers belong to the brand zone.
 */

/**
 * Brand zone: surfaces of identity. Brand papers and loud colour are allowed
 * here, so no colour rule applies. (src/style-guide/** is brand zone too, but it
 * is simply never matched by PLAYING_ZONE.)
 */
export const BRAND_ZONE = [
  "src/components/uniques/BrandLogo.vue",
  "src/components/uniques/brandMark.ts",
  "src/components/compositions/LoadingScreen.vue",
  "src/components/LoadingSplash.vue", // wraps the Loading Screen
  "src/components/uniques/SourceCredits.vue", // lives on the Loading Screen
];

/**
 * Playing zone: everything you touch or watch while playing. Every component and
 * composable under these paths that is not in BRAND_ZONE is held to the colour
 * law. Token sources (src/emotitone-design-system.css, src/style.css), services,
 * stores, data and the style guide are deliberately outside: they define or
 * compute colour, they do not apply it to the instrument.
 */
export const PLAYING_ZONE_DIRS = ["src/components", "src/composables"];
export const PLAYING_ZONE_FILES = ["src/App.vue", "src/MainApp.vue"];

/** Globs for the playing zone, for one extension group, e.g. "{vue,ts}" (ESLint) or "{vue,css}" (Stylelint). */
export const playingZoneGlobs = (extensions) => [
  ...PLAYING_ZONE_DIRS.map((dir) => `${dir}/**/*.${extensions}`),
  ...PLAYING_ZONE_FILES.filter((file) => extensions.replace(/[{}]/g, "").split(",").some((ext) => file.endsWith(`.${ext}`))),
];

/** Playing-zone files that are not lintable surfaces (tests, type fixtures). */
export const PLAYING_ZONE_IGNORE = [
  "src/**/__tests__/**",
  "src/**/*.test.ts",
  "src/**/*.typecheck.*",
];

/**
 * Import boundary: primitives and compounds are presentational. They take props
 * and use composables; they do not reach for stores or the audio/persistence
 * services. (The folder is spelled "primatives" in the repo.)
 */
export const IMPORT_BOUNDARY_SCOPE = [
  "src/components/primatives/**/*.{vue,ts}",
  "src/components/compounds/**/*.{vue,ts}",
];

/**
 * Pure services that primitives and compounds may import: colour, music-theory
 * and display derivations with no audio context, storage or hardware. Every
 * other file in src/services is a "production service" (audio runtime,
 * playback, persistence, microphone, MIDI/ROLI sync, voice lifecycle) and is
 * forbidden there. A new service is forbidden until it is classified here.
 */
export const PURE_SERVICES = [
  "musicColor",
  "musicColorCore",
  "keySurfaceColor",
  "music",
  "playStyles",
  "scalePitch",
  "shape",
  "harmonicEmotion",
  "stageAppearance",
  "configPublicSurface",
];

/** Brand papers (WIP-bible section 3): the exact custom-property names. */
export const BRAND_TOKENS = ["tomato", "mustard", "plum", "cobalt", "pine", "bone"];

/**
 * Allowlists of violations that existed when the rules landed. Each entry is a
 * file that is exempt from one rule. To shrink: fix the file (Phase 2 or 4 of
 * the retrospective spec), delete its entry, and `bun run lint` proves it. Do
 * not add entries for new work; fix the code or ask the design owner.
 */
export const RECORDED_ALLOWLIST = {
  /** `@/stores/**` imported by a primitive or compound. */
  "no-store-imports": [
    "src/components/compounds/Keyboard.vue", // 3
  ],
  /** A production service imported by a primitive or compound. */
  "no-production-service-imports": [
    "src/components/compounds/Keyboard.vue", // 1
  ],
  /** A brand-paper token or tone name in playing-zone script or template. */
  "no-brand-colour": [
    "src/components/primatives/Mark.vue", // 4
    "src/components/primatives/Sticker.vue", // 5
  ],
  /** A raw hex / rgb / hsl / oklch literal in playing-zone script or template. */
  "no-raw-colour": [
    "src/components/InstrumentSelector.vue", // 1
    "src/components/primatives/Knob/BooleanKnob.vue", // 3
    "src/components/primatives/Knob/OptionsKnob.vue", // 1
    "src/components/primatives/Knob/RangeKnob.vue", // 1
    "src/components/primatives/Knob/index.vue", // 1
    "src/components/primatives/Note.vue", // 9
    "src/composables/canvas/harmonicTypography.ts", // 2
    "src/composables/canvas/useAmbientRenderer.ts", // 2
    "src/composables/canvas/useBlobFieldRenderer.ts", // 1
    "src/composables/canvas/useHilbertScopeRenderer.ts", // 1
    "src/composables/useMusicColor.ts", // 1
  ],
  /** The same two rules for CSS and Vue <style> blocks (Stylelint). A brand-paper custom property in a style. */
  "style/no-brand-colour": [
    "src/components/primatives/Button.vue", // 1
    "src/components/primatives/Mark.vue", // 4
    "src/components/primatives/MidiSettingsIcon.vue", // 2
    "src/components/primatives/Sticker.vue", // 10
  ],
  /** A raw colour literal in a style. */
  "style/no-raw-colour": [
    "src/components/compounds/ChordKey.vue", // 1
    "src/components/compounds/Key.vue", // 1
    "src/components/primatives/Button.vue", // 4
    "src/components/primatives/Note.vue", // 1
    "src/components/primatives/Readout.vue", // 1
    "src/components/primatives/Sticker.vue", // 1
    "src/components/primatives/Tabs.vue", // 1
    "src/components/primatives/instrumentControl.css", // 2
    "src/components/primatives/Knob/BooleanKnob.vue", // 1
    "src/components/primatives/Knob/KnobFace.vue", // 1
    "src/components/uniques/CodeStrip/index.vue", // 4
  ],
};

/**
 * What the linters actually read. `DESIGN_LAW_NO_ALLOWLIST=1 bun run lint` ignores
 * the allowlist, so it reports every violation that remains: the worklist for
 * shrinking, and what the allowlist test compares RECORDED_ALLOWLIST against.
 */
export const ALLOWLIST = process.env.DESIGN_LAW_NO_ALLOWLIST
  ? Object.fromEntries(Object.keys(RECORDED_ALLOWLIST).map((rule) => [rule, []]))
  : RECORDED_ALLOWLIST;

/**
 * Colour literals that are not colour: gradient masks only need an opaque stop.
 * Stylelint skips these properties for the raw-colour rule.
 */
export const RAW_COLOUR_EXEMPT_PROPERTIES = ["mask", "-webkit-mask", "mask-image", "-webkit-mask-image"];
