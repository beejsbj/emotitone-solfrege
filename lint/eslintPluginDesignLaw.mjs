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

/** SVG presentation attributes whose value is a colour, so a bare name there (`fill="white"`) is one. */
const COLOUR_ATTRIBUTES = /^(?:fill|stroke|stop-?color|flood-?color|lighting-?color)$/i;
const COLOUR_NAMES = /(?:colou?r|fill|stroke|background|shadow|accent|caret|border|outline|column-?rule|text-?decoration|^--)/i;

/** `computed(() => ...)` is how a colour is derived in this codebase, so its callback is not a boundary. */
const isComputedCall = (node) => node?.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "computed";

const isComputedGetter = (node) => node?.type === "Property" && (node.key.name ?? node.key.value) === "get" &&
  node.parent?.type === "ObjectExpression" && isComputedCall(node.parent.parent);
const computedForCallback = (node) => isComputedCall(node.parent) ? node.parent :
  isComputedGetter(node.parent) ? node.parent.parent.parent : null;

function isComputedReturn(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === "ReturnStatement") {
      let callback = parent.parent;
      while (callback && !["ArrowFunctionExpression", "FunctionExpression"].includes(callback.type)) callback = callback.parent;
      return Boolean(callback && computedForCallback(callback));
    }
    if (parent.type === "ArrowFunctionExpression") return parent.body.type !== "BlockStatement" && Boolean(computedForCallback(parent));
    if (parent.type === "Property" && COLOUR_NAMES.test(parent.key.name ?? parent.key.value)) continue;
    if (!["CallExpression", "ObjectExpression", "ConditionalExpression", "LogicalExpression", "TSAsExpression", "TSNonNullExpression"].includes(parent.type)) return false;
  }
  return false;
}

function isSvgElement(node) {
  let element = node;
  while (element && !["VElement", "JSXElement"].includes(element.type)) element = element.parent;
  if (element?.type === "VElement") return element.namespace === "http://www.w3.org/2000/svg" && /^[a-z][^-]*$/.test(element.rawName);
  if (element?.type !== "JSXElement" || !/^[a-z][^-]*$/.test(element.openingElement.name.name ?? "")) return false;
  for (let parent = node; parent; parent = parent.parent) {
    if (parent !== element && parent.type === "JSXElement" && parent.openingElement.name.name === "foreignObject") return false;
    if (parent.type === "JSXElement" && parent.openingElement.name.name === "svg") return true;
  }
  return false;
}

function isColourValue(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === "BinaryExpression") return false;
    if (["ArrowFunctionExpression", "FunctionExpression"].includes(parent.type)) {
      if (computedForCallback(parent)) continue;
      return false;
    }
    if (parent.type === "CallExpression" && !["ref", "shallowRef", "computed"].includes(parent.callee.name) && !isComputedReturn(parent)) return false;
    let name;
    if (parent.type === "Property") {
      if (isComputedGetter(parent)) continue;
      name = parent.key.name ?? parent.key.value;
    }
    if (parent.type === "VariableDeclarator") name = parent.id.name;
    if (parent.type === "AssignmentExpression") name = parent.left.property?.name ?? parent.left.property?.value;
    if (parent.type === "VAttribute") {
      const attribute = parent.directive ? parent.key.argument?.name : parent.key.name;
      // A bound :style value is an object or CSS text checked here; a static style="" is parsed by the inline patterns.
      return (parent.directive && attribute === "style") || (typeof attribute === "string" && COLOUR_ATTRIBUTES.test(attribute)) || (attribute === "color" && isSvgElement(parent));
    }
    if (parent.type === "JSXAttribute") return COLOUR_ATTRIBUTES.test(parent.name.name ?? "") || (parent.name.name === "color" && isSvgElement(parent));
    if (name !== undefined) return COLOUR_NAMES.test(name);
  }
  return false;
}

/** Sticker's explicit token-name type is not a CSS colour derivation. */
function isIvoryTone(node, text) {
  if (text.trim().toLowerCase() !== "ivory" || !isComputedReturn(node)) return false;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (["Property", "VAttribute", "JSXAttribute"].includes(parent.type)) return false;
    if (["ArrowFunctionExpression", "FunctionExpression"].includes(parent.type)) {
      const call = computedForCallback(parent);
      return isComputedCall(call) && call.typeArguments?.params?.[0]?.typeName?.name === "StickerPaperColor";
    }
  }
  return false;
}

function colourText(patterns) {
  const check = (add) => (node, text) => {
    if (typeof text !== "string") return;
    if (patterns === RAW_COLOUR_PATTERNS) {
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.type === "VAttribute" && /^(?:href|xlink:href|src)$/.test(parent.directive ? parent.key.argument?.name : parent.key.name)) return;
        if (parent.type === "JSXAttribute" && /^(?:href|xlinkHref|src)$/.test(parent.name.name)) return;
        if (parent.type === "Property") {
          if (/^(?:-webkit-|Webkit)?mask(?:-image|Image)?$/i.test(parent.key.name ?? parent.key.value)) return;
          break;
        }
      }
      text = text.replace(/(?:^|[;{])\s*(?:-webkit-)?mask(?:-image)?\s*:[^;{}]*/gi, " ");
    }
    text = text.replace(/url\([^)]*\)/gi, " ");
    const hit = patterns.map((p) => p.exec(text)).find(Boolean);
    if (hit) add(node, (hit[1] ?? hit[0]).trim());
    else if (isColourValue(node) && !isIvoryTone(node, text)) {
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
  else if (source.startsWith("/src/")) resolved = posix.normalize(source.slice(1)); // Vite serves root-absolute paths from the project root
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

// Use the primitives ---------------------------------------------------------

/** An `<a>` is a bespoke button when it carries its own visual styling: a class, a style, or role="button". */
const STYLING_ATTRIBUTES = /^(?:class|style|role)$/;

function attributeValue(node) {
  const value = node?.expression ?? node;
  const choices = value?.type === "ConditionalExpression" ? [value.consequent, value.alternate] :
    value?.type === "LogicalExpression" ? [value.left, value.right] : [];
  return choices.length ? (choices.some((choice) => attributeValue(choice) === "button") ? "button" : undefined) : value?.value;
}

const objectAttributes = (node) => node?.type === "ObjectExpression" ? node.properties
  .filter((property) => property.type === "Property")
  .map((property) => ({ name: property.key.name ?? property.key.value, value: attributeValue(property.value) })) : [];

function bespokeButton({ add }) {
  const check = (node, tag, attributes) => {
    if (tag === "button") add(node, "<button>");
    else if (tag === "a" && attributes.some(({ name, value }) => (name === "role" ? value === "button" : STYLING_ATTRIBUTES.test(name)))) add(node, "<a>");
  };
  return {
    template: {
      VElement(node) {
        const attributes = node.startTag.attributes.flatMap((attribute) => attribute.directive && attribute.key.name.name === "bind" && !attribute.key.argument
          ? objectAttributes(attribute.value?.expression) : [{
          name: attribute.directive ? attribute.key.argument?.name : attribute.key.name,
          value: attributeValue(attribute.value),
        }]);
        check(node, node.rawName, attributes);
      },
    },
    script: {
      JSXOpeningElement(node) {
        const attributes = node.attributes.flatMap((attribute) => attribute.type === "JSXSpreadAttribute"
          ? objectAttributes(attribute.argument) : [{ name: attribute.name.name, value: attributeValue(attribute.value) }])
          .map((attribute) => ({ ...attribute, name: attribute.name === "className" ? "class" : attribute.name }));
        check(node, node.name.type === "JSXIdentifier" ? node.name.name : undefined, attributes);
      },
    },
  };
}

export default {
  meta: { name: "eslint-plugin-design-law" },
  rules: {
    "no-bespoke-button": budgeted({
      baselineKey: "no-bespoke-button",
      description: "Playing-zone components use the Button primitive, not a raw <button> or a styled <a>",
      violation: 'A raw {{found}} in a playing-zone component: use the Button primitive (src/components/primatives/Button.vue) instead of a bespoke button.',
      collect: bespokeButton,
    }),
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
