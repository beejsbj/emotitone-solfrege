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

/** The Stage's parts, back to front. Bodies carry Merge/Web: production renders them as one material. */
export const STAGE_LAB_UNIT_IDS = ["atmosphere", "strings", "scope", "bodies", "flecks", "lettering"] as const;
export type StageLabUnitId = (typeof STAGE_LAB_UNIT_IDS)[number];

export const STAGE_LAB_DIRECTION_IDS = {
  atmosphere: ["graticule", "band", "panel"],
  strings: ["exposure", "strips", "columns"],
  scope: ["phosphor", "cut", "dots"],
  bodies: ["facets", "chord-shape", "resonance"],
  flecks: ["sparks", "chads", "pixels"],
  lettering: ["tape", "readout"],
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
  | { type: "stage-lab:wake" };
