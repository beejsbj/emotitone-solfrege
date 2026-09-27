import { Comment, Fragment, Text, type VNode } from "vue";
import type { LabStickerColor } from "@/types/primitivesLab";

export interface StickerPaint {
  fill: string;
  fg: string;
  accent: string;
  glow: boolean;
  sheen: boolean;
}

/** The production Sticker palette, read as token references only. */
export function stickerPaint(color: LabStickerColor = "ivory"): StickerPaint {
  const brass = color.startsWith("brass");
  const sheen = color === "brass-sheen" || color === "brass-sheen-glow";
  const glow = color === "brass-glow" || color === "brass-sheen-glow";
  if (brass) {
    return { fill: sheen ? "var(--brass-fill)" : "var(--brass)", fg: "var(--brass-edge)", accent: "var(--brass)", glow, sheen };
  }
  const darkText = color === "ivory" || color === "bone" || color === "mustard";
  return {
    fill: `var(--${color})`,
    fg: darkText ? "var(--ink)" : "var(--ivory)",
    accent: `var(--${color})`,
    glow: false,
    sheen: false,
  };
}

/** Plain text of a default slot, so letter-by-letter directions keep one accessible name. */
export function slotText(nodes: VNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === Comment) return "";
      if (node.type === Text) return String(node.children ?? "");
      if (node.type === Fragment && Array.isArray(node.children)) return slotText(node.children as VNode[]);
      if (typeof node.children === "string") return node.children;
      if (Array.isArray(node.children)) return slotText(node.children as VNode[]);
      return "";
    })
    .join("")
    .trim();
}

/** One stable pseudo-random stream per mounted sticker, like production's per-mount geometry. */
export function mountRandom(seedText: string) {
  let seed = Math.floor(Math.random() * 1e6);
  for (const character of seedText) seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
