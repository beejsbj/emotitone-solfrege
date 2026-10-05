import type { StageLabSelection } from "@/types/stageLab";

/*
 * Families and Looks for the Stage lab.
 *
 * Burooj, 2026-10-03: there are three families (Lit, Paper, Dot), and
 * "variations can be drastic, or can be due to knob changes." A drastic
 * variation is a different renderer (a lab direction). A knob variation is a
 * Look: production settings the Config Menu already exposes, tuned. Phosphor
 * is a Look on the production scope, not a renderer, and so is Pop: the
 * reference blob is production's own field with the fog off and the motion
 * tightened. Looks stack ("pop,phosphor").
 *
 * Lit is the original intent: classy, soft, jazz-club light on Ink, Ivory
 * and Brass; Pixar's Soul (the club scenes and the Great Before) is a named
 * influence. Paper is the cut-paper poster side with hard edges. The Dot
 * family was dropped on 2026-10-04.
 */

export type StageLabFamily = "lit" | "paper";

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
    id: "pop",
    name: "Pop",
    note: "The reference disc on production's own field: firm edges (no fog), Merge still gooey, the field's halo on, no wobble; bodies pop in over 100ms with production's overshoot and shrink away over 200ms.",
    knobs: {
      blobs: {
        blurRadius: 0, fieldSoftness: 12, fusionStrength: 0.5, glowEnabled: true, glowIntensity: 18,
        vibrationAmplitude: 0, oscillationAmplitude: 0,
        scaleInDuration: 0.1, scaleOutDuration: 0.2, fadeOutDuration: 0.2,
      },
    },
  },
];

export interface StageLabPreset {
  id: string;
  name: string;
  family: StageLabFamily;
  note: string;
  selection: StageLabSelection;
  /** One Look or several, comma-separated, applied in order. */
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
    note: "Production's bodies and organic Merge/Web under the Pop Look (firm discs with a halo, gooey necks), the diffused band, the production scope, strings and flecks.",
    selection: { ...base, atmosphere: "band", connections: "production" },
    look: "pop",
  },

  {
    id: "lit-phosphor", name: "Lit · Phosphor", family: "lit",
    note: "The Phosphor Look stacked on Pop.",
    selection: { ...base, atmosphere: "band", connections: "production" },
    look: "pop,phosphor",
  },
  {
    id: "lit-smoke", name: "Lit · Smoke", family: "lit",
    note: "Production's soft, foggy bodies under the Smoke Look: the club at its haziest.",
    selection: { ...base, atmosphere: "band", connections: "production" },
    look: "smoke",
  },
  {
    id: "paper", name: "Paper", family: "paper",
    note: "Cut band, Paper Cut scope, Torn Strips, Paper Discs, Chord Shape, Chads.",
    selection: { ...base, atmosphere: "band-cut", strings: "strips", scope: "cut", blobs: "pop-cut", flecks: "chads" },
    look: "pop",
  },

  {
    id: "paper-brush", name: "Paper · Brush + Slurs", family: "paper",
    note: "The Brush scope, and Slur Arcs as the connection (best in Web).",
    selection: { ...base, atmosphere: "band-cut", strings: "strips", scope: "brush", connections: "slurs", blobs: "pop-cut", flecks: "chads" },
    look: "pop",
  },


];

/** Known Look ids from a comma-separated list, in order; unknown ids are dropped. */
export const lookIds = (value: string | null | undefined) =>
  (value ?? "").split(",").filter((id) => STAGE_LAB_LOOKS.some((look) => look.id === id));

/** Apply one or more Looks' knobs over a production configuration object (ephemeral store state). */
export function applyLook(config: Record<string, Record<string, unknown>>, value: string | null | undefined) {
  lookIds(value).forEach((id) => {
    const look = STAGE_LAB_LOOKS.find((candidate) => candidate.id === id)!;
    Object.entries(look.knobs).forEach(([section, values]) => {
      const target = config[section];
      if (target) Object.assign(target, values);
    });
  });
}
