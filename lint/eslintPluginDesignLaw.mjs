/**
 * ESLint rules for the design law (WIP-bible sections 3 and 4): the import
 * boundary for primitives and compounds, and the colour law for the playing zone.
 * Where each applies is set in eslint.config.js from lint/designZones.mjs; how
 * much existing debt a file may keep is lint/designLawBaseline.json. A file with
 * no baseline entry gets a budget of zero.
 */
import { posix } from "node:path";
import { BRAND_TEXT_PATTERNS, RAW_COLOUR_PATTERNS, styleDeclarationViolations } from "./colourPatterns.mjs";
import { PURE_SERVICES } from "./designZones.mjs";
import { judge, relativeToRoot } from "./baseline.mjs";

/**
 * Wraps a "collect occurrences" rule with the baseline budget. Reports every
 * occurrence when a file is over budget, and one stale-baseline error when it is
 * under, after the whole file (script and, for .vue, template) has been seen.
 */
function budgeted({ baselineKey, description, violation, collect }) {
  return {
    meta: {
      type: "problem",
      schema: [],
      docs: { description },
      messages: {
        violation,
        grown: `{{found}}: this file already has design-law debt (baseline allows {{budget}} for ${baselineKey}) and must not gain more. Fix the new one; counts only go down.`,
        stale: `The baseline allows {{budget}} for ${baselineKey} here but {{count}} remain. Lower it with "bun run lint:baseline".`,
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename();
      const file = relativeToRoot(filename);
      const found = [];
      const add = (node, text) => found.push({ node, found: text });
      const visitor = collect({ add, file });

      const flush = (programNode) => {
        const verdict = judge(baselineKey, file, found.length);
        if (verdict.kind === "violation" || verdict.kind === "grown") {
          for (const hit of found) {
            context.report({
              node: hit.node,
              messageId: verdict.kind,
              data: { found: hit.found, budget: verdict.budget },
            });
          }
        } else if (verdict.kind === "stale") {
          context.report({
            node: programNode,
            loc: { line: 1, column: 0 },
            messageId: "stale",
            data: { budget: verdict.budget, count: found.length },
          });
        }
      };

      const services = context.sourceCode?.parserServices ?? context.parserServices;
      const ast = (context.sourceCode ?? context.getSourceCode()).ast;
      if (services?.defineTemplateBodyVisitor && ast.templateBody) {
        // The template is walked after the script's Program:exit, so flush when its root element exits.
        return services.defineTemplateBodyVisitor(
          {
            ...(visitor.template ?? {}),
            "VElement:exit"(node) {
              if (node.parent?.type !== "VElement") flush(ast);
            },
          },
          visitor.script,
        );
      }
      return { ...visitor.script, "Program:exit": flush };
    },
  };
}

// Colour law ---------------------------------------------------------------

function isColourValue(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (["BinaryExpression", "CallExpression", "ArrowFunctionExpression", "FunctionExpression"].includes(parent.type)) return false;
    let name;
    if (parent.type === "Property") name = parent.key.name ?? parent.key.value;
    if (parent.type === "VariableDeclarator") name = parent.id.name;
    if (parent.type === "AssignmentExpression") name = parent.left.property?.name ?? parent.left.property?.value;
    if (parent.type === "VAttribute") return parent.key.argument?.name === "style";
    if (name !== undefined) return /(?:colou?r|fill|stroke|background|shadow|accent|caret|border|outline|column-?rule|text-?decoration|^--)/i.test(name);
  }
  return false;
}

function colourText(patterns) {
  const check = (add) => (node, text) => {
    if (typeof text !== "string") return;
    const hit = patterns.map((p) => p.exec(text)).find(Boolean);
    if (hit) add(node, (hit[1] ?? hit[0]).trim());
    else if (isColourValue(node)) {
      const kind = patterns === RAW_COLOUR_PATTERNS ? "raw" : "brand";
      const named = styleDeclarationViolations("color", text)[kind];
      if (named) add(node, named);
    }
  };
  return ({ add }) => {
    const test = check(add);
    const common = {
      Literal: (node) => test(node, node.value),
      TemplateElement: (node) => test(node, node.value.cooked),
    };
    return { script: common, template: { ...common, VLiteral: (node) => test(node, node.value) } };
  };
}

// Import boundary ----------------------------------------------------------

/** Resolve an import specifier to a repo-relative path, or null for packages. */
function resolveSpecifier(source, file) {
  let resolved;
  if (source.startsWith("@/")) resolved = posix.normalize(`src/${source.slice(2)}`);
  else if (source.startsWith(".")) resolved = posix.normalize(posix.join(posix.dirname(file), source));
  else return null;
  return resolved.startsWith("..") ? null : resolved;
}

const stripExtension = (name) => name.replace(/\.(?:[cm]?[jt]s|vue)$/, "");

function classify(source, file) {
  const path = resolveSpecifier(source, file);
  if (!path) return null;
  if (/^src\/stores(?:\/|$)/.test(path)) return "no-store-imports";
  if (/^src\/audio(?:\/|$)/.test(path)) return "no-production-service-imports";
  const service = /^src\/services\/(.*)$/.exec(path);
  if (service) {
    const name = stripExtension(service[1]);
    // Only a plain top-level pure service is allowed; a computed name or a subfolder is not.
    return PURE_SERVICES.includes(name) ? null : "no-production-service-imports";
  }
  return null;
}

/** Static text of a dynamic import() argument: a string, or the leading text of a template literal. */
function dynamicSource(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral") return node.quasis[0].value.cooked;
  if (node.type === "BinaryExpression" && node.operator === "+") return dynamicSource(node.left);
  return null;
}

const allTypeSpecifiers = (specifiers, key) => specifiers.length > 0 && specifiers.every((s) => s[key] === "type");

function importBoundary(kind) {
  return ({ add, file }) => {
    const check = (node, source) => {
      if (typeof source === "string" && classify(source, file) === kind) add(node, source);
    };
    return {
      script: {
        ImportDeclaration(node) {
          if (node.importKind === "type" || allTypeSpecifiers(node.specifiers, "importKind")) return;
          check(node, node.source.value);
        },
        ExportNamedDeclaration(node) {
          if (!node.source || node.exportKind === "type" || allTypeSpecifiers(node.specifiers, "exportKind")) return;
          check(node, node.source.value);
        },
        ExportAllDeclaration(node) {
          if (node.exportKind !== "type") check(node, node.source.value);
        },
        ImportExpression: (node) => check(node, dynamicSource(node.source)),
        CallExpression(node) {
          if (node.callee.type === "Identifier" && node.callee.name === "require") check(node, dynamicSource(node.arguments[0]));
        },
      },
    };
  };
}

export default {
  meta: { name: "eslint-plugin-design-law" },
  rules: {
    "no-store-imports": budgeted({
      baselineKey: "no-store-imports",
      description: "Primitives and compounds may not import stores",
      violation: 'Primitives and compounds are presentational: take props or use a composable, do not import a store ("{{found}}"). Type-only imports are fine.',
      collect: importBoundary("no-store-imports"),
    }),
    "no-production-service-imports": budgeted({
      baselineKey: "no-production-service-imports",
      description: "Primitives and compounds may not import production services",
      violation: 'Primitives and compounds may not import production services or the audio engine ("{{found}}"). Pure services are listed in lint/designZones.mjs.',
      collect: importBoundary("no-production-service-imports"),
    }),
    "no-brand-colour": budgeted({
      baselineKey: "no-brand-colour",
      description: "Disallow brand-paper tokens in playing-zone files",
      violation: 'Brand paper "{{found}}" is brand-zone only. In the playing zone, colour is Music Color plus Ink / Ivory / Brass tokens (WIP-bible section 3).',
      collect: colourText(BRAND_TEXT_PATTERNS),
    }),
    "no-raw-colour": budgeted({
      baselineKey: "no-raw-colour",
      description: "Disallow raw hex/rgb/hsl/oklch colour literals in playing-zone files",
      violation: 'Raw colour "{{found}}" in a playing-zone file. Use a design-system token, or Music Color from the numeric OKLCH adapter (WIP-bible section 4).',
      collect: colourText(RAW_COLOUR_PATTERNS),
    }),
  },
};
