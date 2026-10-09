/**
 * What a colour-law violation looks like, shared by the ESLint rules (script and
 * template text) and the Stylelint rules (declaration values). Where the law
 * applies and what is already tolerated live in designZones.mjs and the baseline.
 */
import { BRAND_TOKENS } from "./designZones.mjs";

const BRAND = BRAND_TOKENS.join("|");

/** `--tomato` / `var(--bone)`, a bare tone name such as tone="tomato", or a Tailwind utility. */
export const BRAND_TEXT_PATTERNS = [
  new RegExp(`--(?:${BRAND})(?![\\w-])`, "i"),
  new RegExp(`^\\s*(?:${BRAND})\\s*$`, "i"),
  new RegExp(
    `(?:^|[\\s:"'\`])(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide)-(?:${BRAND})(?![\\w-])`,
    "i",
  ),
];

/** #rgb, #rgba, #rrggbb, #rrggbbaa, and the colour functions. Group 1 is the token. */
export const RAW_COLOUR_PATTERNS = [
  /(?:^|[^\w&])(#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4}))(?![\w-])/i,
  /(?:^|[^\w-])((?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\()/i,
];

/** CSS named colours except the keywords that are not a colour choice (transparent, currentColor, inherit...). */
export const NAMED_COLOURS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood " +
    "cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray " +
    "darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue " +
    "firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew " +
    "hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue " +
    "mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred " +
    "midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
    "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
    "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white " +
    "whitesmoke yellow yellowgreen"
  ).split(" "),
);

/** Properties whose values are names or lists, not colours (a word like `white` or `tan` is not a colour there). */
export const NAMED_COLOUR_EXEMPT_PROPERTIES = new Set([
  "font",
  "font-family",
  "animation",
  "animation-name",
  "transition",
  "transition-property",
  "will-change",
  "content",
  "quotes",
  "grid-area",
  "grid-row",
  "grid-column",
  "grid-template-areas",
  "container-name",
  "view-transition-name",
  "anchor-name",
  "counter-reset",
  "counter-increment",
]);

/** Gradient masks only need an opaque stop, not a colour choice. */
export const RAW_COLOUR_EXEMPT_PROPERTIES = new Set(["mask", "-webkit-mask", "mask-image", "-webkit-mask-image"]);

/**
 * Violations in one CSS declaration. A declaration yields at most one brand and
 * one raw violation: { brand: string | null, raw: string | null }.
 */
export function styleDeclarationViolations(prop, value) {
  const property = prop.toLowerCase();
  const brandHit = BRAND_TEXT_PATTERNS.slice(0, 1).map((p) => p.exec(value)).find(Boolean);
  // Words outside strings, url() and custom-property names.
  const words = value
    .replace(/(["'])(?:\\.|(?!\1).)*\1/g, " ")
    .replace(/url\([^)]*\)/gi, " ")
    .replace(/--[\w-]+/g, " ");
  const bareBrand = new RegExp(`(?<![\\w-])(${BRAND})(?![\\w(-])`, "i").exec(words);
  const brand = brandHit ? brandHit[0] : bareBrand ? bareBrand[1] : null;

  let raw = null;
  if (!RAW_COLOUR_EXEMPT_PROPERTIES.has(property)) {
    const hit = RAW_COLOUR_PATTERNS.map((p) => p.exec(value)).find(Boolean);
    if (hit) raw = hit[1];
  }
  if (!raw && !NAMED_COLOUR_EXEMPT_PROPERTIES.has(property)) {
    for (const match of words.matchAll(/(?<![\w-])([a-z]+)(?![\w(-])/gi)) {
      const name = match[1].toLowerCase();
      if (NAMED_COLOURS.has(name) && !BRAND_TOKENS.includes(name)) {
        raw = match[1];
        break;
      }
    }
  }
  return { brand, raw };
}
