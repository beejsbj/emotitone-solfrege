/**
 * Stylelint covers the colour law in CSS and Vue <style> blocks (BJS-481); ESLint
 * covers script and template. Zones are data in lint/designZones.mjs; the debt
 * that predates the rules is counted per file in lint/designLawBaseline.json
 * (read by lint/stylelintPluginDesignLaw.mjs). This is not a style linter.
 */
import { BRAND_ZONE, PLAYING_ZONE_IGNORE, playingZoneGlobs } from "./lint/designZones.mjs";

const colourLaw = { "design-law/no-brand-colour": true, "design-law/no-raw-colour": true };

export default {
  plugins: ["./lint/stylelintPluginDesignLaw.mjs"],
  // Only the playing zone is checked; the brand zone, the style guide, tests and token sources never match.
  ignoreFiles: [...PLAYING_ZONE_IGNORE, ...BRAND_ZONE, "src/style-guide/**"],
  rules: {},
  overrides: [
    // One override per extension, so every .css file is parsed as CSS and every .vue file through postcss-html.
    { files: playingZoneGlobs("vue"), customSyntax: "postcss-html", rules: colourLaw },
    { files: playingZoneGlobs("css"), rules: colourLaw },
  ],
};
