import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SrgbColor } from "@/services/musicColorCore";

export type Rgb = Pick<SrgbColor, "r" | "g" | "b">;

const TOKEN_SOURCE = resolve(process.cwd(), "src/emotitone-design-system.css");

/** Every custom property declared in the token source's :root, verbatim. */
export function readTokenDeclarations(
  css = readFileSync(TOKEN_SOURCE, "utf8"),
): Map<string, string> {
  const root = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!root) throw new Error("The token source has no :root block.");
  const declarations = new Map<string, string>();
  for (const match of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }
  return declarations;
}

function hexToRgb(hex: string): Rgb {
  const digits = hex.slice(1);
  const full = digits.length === 3
    ? digits.split("").map((digit) => digit + digit).join("")
    : digits;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Unsupported hex ${hex}.`);
  const value = Number.parseInt(full, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function splitTopLevel(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of args) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

/**
 * Resolves an opaque token colour the way the browser does for the forms the
 * token source uses: hex, var() and color-mix(in srgb, ...).
 */
export function resolveTokenColor(
  value: string,
  tokens: Map<string, string>,
): Rgb {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) return hexToRgb(trimmed);

  const reference = trimmed.match(/^var\((--[\w-]+)\)$/);
  if (reference) {
    const target = tokens.get(reference[1]);
    if (!target) throw new Error(`Unknown token ${reference[1]}.`);
    return resolveTokenColor(target, tokens);
  }

  const mix = trimmed.match(/^color-mix\(\s*in srgb\s*,(.*)\)$/);
  if (mix) {
    const [first, second] = splitTopLevel(mix[1]).map((part) => {
      const weighted = part.match(/^(.*?)\s+([\d.]+)%$/);
      return weighted
        ? { color: weighted[1], weight: Number(weighted[2]) / 100 }
        : { color: part, weight: null as number | null };
    });
    const firstWeight = first.weight ?? (second.weight === null ? 0.5 : 1 - second.weight);
    const a = resolveTokenColor(first.color, tokens);
    const b = resolveTokenColor(second.color, tokens);
    return {
      r: a.r * firstWeight + b.r * (1 - firstWeight),
      g: a.g * firstWeight + b.g * (1 - firstWeight),
      b: a.b * firstWeight + b.b * (1 - firstWeight),
    };
  }

  throw new Error(`Unsupported token colour "${trimmed}".`);
}

/** A token's colour, resolved from the real token source. */
export function tokenColor(name: string, tokens = readTokenDeclarations()): Rgb {
  const value = tokens.get(name);
  if (!value) throw new Error(`Unknown token ${name}.`);
  return resolveTokenColor(value, tokens);
}

/** The opaque hex stops of a gradient token, such as --brass-fill. */
export function tokenGradientStops(
  name: string,
  tokens = readTokenDeclarations(),
): Rgb[] {
  const value = tokens.get(name);
  if (!value) throw new Error(`Unknown token ${name}.`);
  return [...value.matchAll(/#[0-9a-f]{3,6}\b/gi)].map((match) => hexToRgb(match[0]));
}

/** Parses the rgba()/rgb() string Music Color serialises surfaces to. */
export function parseCssRgb(value: string): Rgb {
  const match = value.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (!match) throw new Error(`Not an rgb() colour: ${value}.`);
  return {
    r: Number(match[1]) / 255,
    g: Number(match[2]) / 255,
    b: Number(match[3]) / 255,
  };
}
