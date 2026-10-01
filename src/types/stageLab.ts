/*
 * Guide-only contracts for the Stage design lab (reimagining pass, step 4).
 * Every direction runs in its own frame with a real viewport. Production
 * frames mount the real Stage source; direction frames paint from the same
 * production seams and are fed the same scripted states.
 */

export type StageLabPaper = "bone" | "tomato" | "mustard" | "plum" | "cobalt" | "pine";

/** How a direction reads against the design bible (`src/style-guide/WIP-bible.md`). */
export interface StageLabBibleReading {
  zone: "Playing zone" | "Brand zone" | "Both zones";
  /** What the Stage is under this direction: the chassis's display, or paper applied to it. */
  role: "Chassis display" | "Applied paper" | "Light";
  fit: "fits" | "caution";
  note: string;
}

export type StageLabUnitId = "stage" | "geometry";

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

/** Stage-layer directions; `production` keeps the real renderer for that unit. */
export type StageLabStageDirection = "production" | "phosphor" | "paste-up" | "led";

/** Harmonic Geometry directions; `production` keeps the real bodies and Merge/Web. */
export type StageLabGeometryDirection = "production" | "facets" | "chord-shape" | "resonance";

export interface StageLabDirection {
  id: string;
  letter: string;
  name: string;
  paper: StageLabPaper;
  /** The idea in two lines. */
  idea: string;
  better: string;
  risks: string;
  /** What each Stage layer or Geometry part becomes under this direction. */
  layers: { name: string; reading: string }[];
  bible: StageLabBibleReading;
}

export interface StageLabUnit {
  id: StageLabUnitId;
  name: string;
  /** Production sources shown on the baseline sheet. */
  source: string;
  /** The unit's place in the bible: which zone, chassis or applied paper. */
  reading: string;
  directions: StageLabDirection[];
  /** What the lab deliberately leaves alone inside this unit, and why. */
  leaveAlone: string;
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
  | { type: "stage-lab:wake" };
