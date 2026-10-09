/**
 * Stylelint covers the colour law in CSS and Vue <style> blocks (BJS-481); ESLint
 * covers script and template. Zones and allowlists are data in
 * lint/designZones.mjs. Nothing else is linted here: this is not a style linter.
 */
import {
  ALLOWLIST,
  BRAND_TOKENS,
  BRAND_ZONE,
  PLAYING_ZONE_IGNORE,
  RAW_COLOUR_EXEMPT_PROPERTIES,
  playingZoneGlobs,
} from "./lint/designZones.mjs";

const BRAND_PATTERN = new RegExp(`--(?:${BRAND_TOKENS.join("|")})(?![\\w-])`, "i");
const RAW_PATTERNS = [
  /(?:^|[^\w&-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i,
  /(?:^|[^\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i,
];

// Every property for brand tokens; every property except gradient masks (which
// only need an opaque stop, not a colour) for raw literals.
const ANY_PROPERTY = "/./";
const COLOUR_PROPERTY = `/^(?!(?:${RAW_COLOUR_EXEMPT_PROPERTIES.join("|")})$)/`;

/** The colour law for one file; a kind drops out when the file is allowlisted for it. */
function colourLaw({ brand, raw }) {
  const list = {};
  if (brand) list[ANY_PROPERTY] = [BRAND_PATTERN];
  if (raw) list[COLOUR_PROPERTY] = RAW_PATTERNS;
  if (!brand && !raw) return { "declaration-property-value-disallowed-list": null };
  return {
    "declaration-property-value-disallowed-list": [
      list,
      {
        message: (property, value) =>
          BRAND_PATTERN.test(value)
            ? `Brand paper in "${property}: ${value}" is brand-zone only. In the playing zone, colour is Music Color plus Ink / Ivory / Brass tokens (WIP-bible section 3).`
            : `Raw colour in "${property}: ${value}". Use a design-system token, or Music Color from the numeric OKLCH adapter (WIP-bible section 4).`,
      },
    ],
  };
}

const brandAllowed = ALLOWLIST["style/no-brand-colour"];
const rawAllowed = ALLOWLIST["style/no-raw-colour"];
const exemptionGroups = new Map(); // "brand,raw" still enforced -> files
for (const file of new Set([...brandAllowed, ...rawAllowed])) {
  const key = `${!brandAllowed.includes(file)},${!rawAllowed.includes(file)}`;
  exemptionGroups.set(key, [...(exemptionGroups.get(key) ?? []), file]);
}

const syntaxFor = (glob) => (glob.endsWith(".css") ? {} : { customSyntax: "postcss-html" });


export default {
  // Only the playing zone is checked; the brand zone, tests and token sources are never matched.
  ignoreFiles: [...PLAYING_ZONE_IGNORE, ...BRAND_ZONE, "src/style-guide/**"],
  rules: { "declaration-property-value-disallowed-list": null }, // set per file below
  overrides: [
    { files: playingZoneGlobs("vue"), customSyntax: "postcss-html", rules: colourLaw({ brand: true, raw: true }) },
    { files: playingZoneGlobs("css"), rules: colourLaw({ brand: true, raw: true }) },
    ...[...exemptionGroups].map(([key, files]) => {
      const [brand, raw] = key.split(",").map((v) => v === "true");
      return { files, ...syntaxFor(files[0]), rules: colourLaw({ brand, raw }) };
    }),
  ],
};
