import type { StageLabSelection } from "@/types/stageLab";

/*
 * Families and Looks for the Stage lab.
 *
 * Burooj, 2026-10-03: there are three families (Lit, Paper, Dot), and
 * "variations can be drastic, or can be due to knob changes." A drastic
 * variation is a different renderer (a lab direction). A knob variation is a
 * Look: production settings the Config Menu already exposes, tuned. Phosphor
 * is a Look on the production scope, not a renderer.
 *
 * Lit is the original intent: classy, soft, jazz-club light on Ink, Ivory
 * and Brass; Pixar's Soul (the club scenes and the Great Before) is a named
 * influence. Paper is the cut-paper poster side with hard edges. Dot is the
 * hardware panel.
 */

export type StageLabFamily = "lit" | "paper" | "dot";

type Knobs = Partial<Record<"hilbertScope" | "blobs" | "particles" | "ambient" | "strings", Record<string, number | boolean>>>;

export interface StageLabLook {
  id: string;
  name: string;
  /** What the knobs do, in a line. */
  note: string;
  knobs: Knobs;
}

/** Knob presets over the production configuration. Values stay inside each knob's public range. */
export const STAGE_LAB_LOOKS: StageLabLook[] = [
  { id: "canonical", name: "Canonical", note: "Production defaults.", knobs: {} },
  {
    id: "phosphor",
    name: "Phosphor",
    note: "The production scope as a crisp beam: long persistence, a thin line, little glow, no smear.",
    knobs: { hilbertScope: { history: 0.85, smear: 0, glowIntensity: 4, thickness: 1, opacity: 1 } },
  },
  {
    id: "smoke",
    name: "Smoke",
    note: "Club haze: a thick, smeared, glowing scope and softer bodies.",
    knobs: {
      hilbertScope: { history: 0.6, smear: 0.6, glowIntensity: 30, thickness: 2.4 },
      blobs: { blurRadius: 18, glowIntensity: 14 },
    },
  },
  {
    id: "firm",
    name: "Firm Bodies",
    note: "Production bodies and Merge/Web with blur and field softness at zero: the same flow with firm edges.",
    knobs: { blobs: { blurRadius: 0, fieldSoftness: 0, glowIntensity: 3 } },
  },
];

export interface StageLabPreset {
  id: string;
  name: string;
  family: StageLabFamily;
  note: string;
  selection: StageLabSelection;
  look: string;
}

const base: StageLabSelection = {
  atmosphere: "production",
  strings: "production",
  scope: "production",
  connections: "chord-shape",
  blobs: "production",
  flecks: "production",
  lettering: "production",
};

export const STAGE_LAB_PRESETS: StageLabPreset[] = [
  {
    id: "lit", name: "Lit", family: "lit",
    note: "Diffused spotlight, the production scope and strings, Lit Pop bodies on the Chord Shape dial, production lettering and flecks.",
    selection: { ...base, atmosphere: "spotlight", blobs: "pop" },
    look: "canonical",
  },
  {
    id: "lit-band", name: "Lit · Band + Phosphor", family: "lit",
    note: "The diffused band instead of the spot, and the Phosphor Look on the production scope.",
    selection: { ...base, atmosphere: "band", blobs: "pop" },
    look: "phosphor",
  },
  {
    id: "lit-smoke", name: "Lit · Smoke", family: "lit",
    note: "Production soft bodies and gooey Merge/Web under the Smoke Look, with the diffused spot: the club at its haziest.",
    selection: { ...base, atmosphere: "spotlight", connections: "production" },
    look: "smoke",
  },
  {
    id: "paper", name: "Paper", family: "paper",
    note: "Cut band, Paper Cut scope, Torn Strips, Paper Pop bodies, Chord Shape, Chads.",
    selection: { ...base, atmosphere: "band-cut", strings: "strips", scope: "cut", blobs: "pop-cut", flecks: "chads" },
    look: "canonical",
  },
  {
    id: "paper-brush", name: "Paper · Spot + Brush", family: "paper",
    note: "The cut spotlight and the Brush scope instead.",
    selection: { ...base, atmosphere: "spotlight-cut", strings: "strips", scope: "brush", blobs: "pop-cut", flecks: "chads" },
    look: "canonical",
  },
  {
    id: "dot", name: "Dot", family: "dot",
    note: "Halftone Panel, Dot Trace, LED Columns, Dot Pop bodies, Chord Shape, Pixel Marks.",
    selection: { ...base, atmosphere: "halftone-panel", strings: "columns", scope: "dots", blobs: "pop-dots", flecks: "pixels" },
    look: "canonical",
  },
  {
    id: "dot-crt", name: "Dot · CRT in panel", family: "dot",
    note: "The production scope under the Phosphor Look set into the dot panel, so the waveform keeps its detail on a phone.",
    selection: { ...base, atmosphere: "halftone-panel", strings: "columns", blobs: "pop-dots", flecks: "pixels" },
    look: "phosphor",
  },
];

export const lookById = (id: string | null | undefined) =>
  STAGE_LAB_LOOKS.find((look) => look.id === id) ?? STAGE_LAB_LOOKS[0];

/** Apply a Look's knobs over a production configuration object (ephemeral store state). */
export function applyLook(config: Record<string, Record<string, unknown>>, lookId: string | null | undefined) {
  const look = lookById(lookId);
  Object.entries(look.knobs).forEach(([section, values]) => {
    const target = config[section];
    if (target) Object.assign(target, values);
  });
}
