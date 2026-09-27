import tokenCss from "@/emotitone-design-system.css?raw";
import type { SpacingStep } from "@/types/styleGuide";

export type { SpacingStep };

/**
 * Reads the spacing scale straight from the token source: values from the
 * `--s-N: Npx` declarations and role names from the "Spacing role names"
 * comment above them. The guide therefore mirrors nothing by hand.
 */
export function parseSpacingScale(css: string): SpacingStep[] {
  const roleBlock = css.match(/Spacing role names:([\s\S]*?)\*\//)?.[1] ?? "";
  const roles = new Map(
    [...roleBlock.matchAll(/(--s-\d+)\s+([^,.]+)/g)].map(([, token, role]) => [
      token,
      role.replace(/\s+/g, " ").trim(),
    ]),
  );
  return [...css.matchAll(/(--s-(\d+)):\s*([^;]+);/g)]
    .sort((a, b) => Number(a[2]) - Number(b[2]))
    .map(([, token, , value]) => {
      const role = roles.get(token) ?? "";
      return { token, value: value.trim(), hint: role.charAt(0).toUpperCase() + role.slice(1) };
    });
}

export const spacingScale = parseSpacingScale(tokenCss);
