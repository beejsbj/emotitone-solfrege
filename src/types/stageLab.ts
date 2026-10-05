/*
 * Guide-only contracts for the Stage design lab (reimagining pass, step 4).
 * Every part of the Stage is its own unit with its own directions. A frame
 * takes one choice per unit; anything not chosen stays production, so any
 * direction can be seen alone or combined with picks from other units.
 */

export type StageLabPaper = "bone" | "tomato" | "mustard" | "plum" | "cobalt" | "pine";

/** How a direction reads against the design bible (`src/style-guide/WIP-bible.md`). */
export interface StageLabBibleReading {
  zone: "Playing zone" | "Brand zone" | "Both zones";
  /** What the part becomes: the chassis's display, paper applied to it, or light. */
  role: "Chassis display" | "Applied paper" | "Light";
  fit: "fits" | "caution";
  note: string;
}

/**
 * The Stage's parts, back to front (canvas order). Blobs, Connections and
 * Lettering are the Note Bodies group: independent parts that work together.
 */
export const STAGE_LAB_UNIT_IDS = ["atmosphere", "strings", "scope", "connections", "blobs", "flecks", "lettering"] as const;
export type StageLabUnitId = (typeof STAGE_LAB_UNIT_IDS)[number];

/**
 * Renderer directions after Burooj's 2026-10-02 cut, the 2026-10-03 family
 * pass, and dropping the Dot family on 2026-10-04. Knob-only variations (Pop, Phosphor, Smoke) are Looks, not here;
 * the Lit disc is production's field under the Pop Look.
 */
export const STAGE_LAB_DIRECTION_IDS = {
  atmosphere: ["band", "band-complement", "band-cut", "band-cut-complement"],
  strings: ["strips"],
  scope: ["cut", "brush"],
  connections: ["chord-shape", "slurs"],
  blobs: ["pop-cut", "rings"],
  flecks: ["chads"],
  lettering: [],
} as const satisfies Record<StageLabUnitId, readonly string[]>;

export type StageLabDirectionId<U extends StageLabUnitId = StageLabUnitId> =
  (typeof STAGE_LAB_DIRECTION_IDS)[U][number];

/** One choice per unit; `production` keeps the real renderer for that part. */
export type StageLabSelection = { [U in StageLabUnitId]: StageLabDirectionId<U> | "production" };

/** The scripted musical states every frame plays through. */
export type StageLabState =
  | "phrase"
  | "silence"
  | "note"
  | "fifth"
  | "triad"
  | "minor"
  | "seventh"
  | "augmented";

export interface StageLabDirection {
  id: string;
  /** The family it belongs to: Lit (soft club light), Paper (hard cut), or any. */
  family: "lit" | "paper" | "any";
  letter: string;
  name: string;
  paper: StageLabPaper;
  /** The idea in two lines. */
  idea: string;
  better: string;
  risks: string;
  bible: StageLabBibleReading;
}

export interface StageLabUnit {
  id: StageLabUnitId;
  name: string;
  /** Parts that work together share a group heading (Note Bodies). */
  group?: string;
  /** Production source shown on the baseline. */
  source: string;
  /** What production does today, and the unit's place in the bible. */
  reading: string;
  directions: StageLabDirection[];
  /** What stays production inside this unit, and why. */
  keeps: string;
  /** The lab's recommendation among the directions. */
  pick?: string;
  /** Burooj's recorded response, once given. */
  verdict?: string;
}

/** Parent → frame messages; every frame on the page receives the same ones. */
export type StageLabMessage =
  | { type: "stage-lab:state"; state: StageLabState }
  | { type: "stage-lab:key"; pitch: string; down: boolean }
  | { type: "stage-lab:mode"; mode: "merge" | "web" }
  /** Mute/solo: parts listed here keep running but are not shown. */
  | { type: "stage-lab:hidden"; hidden: StageLabUnitId[] }
  /** Show each part's measured paint cost in every frame. */
  | { type: "stage-lab:timings"; on: boolean }
  | { type: "stage-lab:wake" };
