/**
 * ESLint rules for the colour law (WIP-bible section 4). Scope and allowlists
 * live in lint/designZones.mjs and are applied from eslint.config.js; these
 * rules only say what a violation looks like. They check string literals,
 * template literals and, in .vue files, template attribute text.
 */
import { BRAND_TOKENS } from "./designZones.mjs";

const BRAND = BRAND_TOKENS.join("|");

/** `--tomato`, `var(--bone)`, or a bare tone name such as tone="tomato". */
const BRAND_PATTERNS = [
  new RegExp(`--(?:${BRAND})(?![\\w-])`, "i"),
  new RegExp(`^\\s*(?:${BRAND})\\s*$`, "i"),
  // Tailwind utilities, if a brand colour is ever registered in tailwind.config.js.
  new RegExp(
    `(?:^|[\\s:"'\`])(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide)-(?:${BRAND})(?![\\w-])`,
    "i",
  ),
];

/** #rgb, #rgba, #rrggbb, #rrggbbaa, and the colour functions. */
const RAW_COLOUR_PATTERNS = [
  /(?:^|[^\w&])(#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4}))(?![\w-])/i,
  /(?:^|[^\w-])((?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\()/i,
];

function textRule(patterns, message, description) {
  return {
    meta: { type: "problem", schema: [], messages: { violation: message }, docs: { description } },
    create(context) {
      const check = (node, text) => {
        if (typeof text !== "string") return;
        const hit = patterns.map((p) => p.exec(text)).find(Boolean);
        if (hit) context.report({ node, messageId: "violation", data: { found: (hit[1] ?? hit[0]).trim() } });
      };
      const visitor = {
        Literal: (node) => check(node, node.value),
        TemplateElement: (node) => check(node, node.value.cooked),
        VLiteral: (node) => check(node, node.value),
      };
      const services = context.sourceCode?.parserServices ?? context.parserServices;
      if (services?.defineTemplateBodyVisitor) {
        return services.defineTemplateBodyVisitor(visitor, visitor);
      }
      return visitor;
    },
  };
}

export default {
  meta: { name: "eslint-plugin-design-law" },
  rules: {
    "no-brand-colour": textRule(
      BRAND_PATTERNS,
      'Brand paper "{{found}}" is brand-zone only. In the playing zone, colour is Music Color plus Ink / Ivory / Brass tokens (WIP-bible section 3).',
      "Disallow brand-paper tokens in playing-zone files",
    ),
    "no-raw-colour": textRule(
      RAW_COLOUR_PATTERNS,
      'Raw colour "{{found}}" in a playing-zone file. Use a design-system token, or Music Color from the numeric OKLCH adapter (WIP-bible section 4).',
      "Disallow raw hex/rgb/hsl/oklch colour literals in playing-zone files",
    ),
  },
};
