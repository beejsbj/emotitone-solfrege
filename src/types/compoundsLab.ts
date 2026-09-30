import type { Component } from "vue";

/*
 * Guide-only contracts for the Compounds design lab. Every direction keeps the
 * real production compound mounted and fed the same real states; a direction
 * is a skin class the bench applies around that source, plus any guide-only
 * face the bench swaps in where CSS alone cannot express the idea.
 */

export type LabPaper = "bone" | "tomato" | "mustard" | "plum" | "cobalt" | "pine";

/** How a direction reads against the design bible (`src/style-guide/WIP-bible.md`). */
export interface LabBibleReading {
  zone: "Playing zone" | "Brand zone" | "Both zones";
  /** Chassis (hardware) or applied paper stuck onto it. */
  role: "Chassis" | "Applied paper" | "Seam";
  fit: "fits" | "caution";
  note: string;
}

export interface LabCompoundDirection {
  id: string;
  letter: string;
  name: string;
  paper: LabPaper;
  /** The idea in two lines. */
  idea: string;
  better: string;
  risks: string;
  bible: LabBibleReading;
  /** Class suffix the bench applies around the real compound (`<unit>-skin--<skin>`). */
  skin: string;
}

/**
 * Every bench takes the same two props. `skin` is null for production.
 * `compact` renders one representative state for the side-by-side strip.
 */
export interface LabBenchProps {
  skin?: string | null;
  compact?: boolean;
}

export interface LabCompoundUnit {
  id: string;
  name: string;
  /** Production source path shown on the baseline sheet. */
  source: string;
  /** Bench that mounts the real compound through every state the unit owns. */
  bench: Component;
  directions: LabCompoundDirection[];
  /** The unit's place in the bible: which zone, chassis or applied paper. */
  reading: string;
  /** The lab's recommendation among the directions, or why none. */
  pick?: string;
  /** Burooj's recorded response to the directions, once given. */
  verdict?: string;
  /** Present when the lab deliberately leaves the unit alone. */
  leaveAlone?: string;
}
