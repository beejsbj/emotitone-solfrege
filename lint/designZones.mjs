/**
 * The design law as data: which files are in which zone, what each zone may
 * not do. ESLint (eslint.config.js, lint/eslintPluginDesignLaw.mjs) and
 * Stylelint (stylelint.config.mjs, lint/stylelintPluginDesignLaw.mjs) both read
 * this file, so there is one place to review. The violations that predate the
 * lint (BJS-481) are counted per file and rule in lint/designLawBaseline.json.
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

/** Every runtime source extension ESLint holds to the law, so a new .js file cannot dodge it. */
export const SOURCE_EXTENSIONS = "{vue,ts,tsx,js,jsx,mjs,cjs}";
/** Style files Stylelint holds to the colour law (.css parses as CSS, .vue through postcss-html). */
export const STYLE_EXTENSIONS = "{vue,css}";

/** Globs for the playing zone, for one extension group, e.g. SOURCE_EXTENSIONS or STYLE_EXTENSIONS. */
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
  `src/components/primatives/**/*.${SOURCE_EXTENSIONS}`,
  `src/components/compounds/**/*.${SOURCE_EXTENSIONS}`,
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
