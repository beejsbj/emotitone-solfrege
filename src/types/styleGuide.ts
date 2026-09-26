import type { Component } from "vue";
import type { MarkName } from "@/components/primatives/marks";

export type GuideLayerId =
  | "tokens"
  | "primitives"
  | "compounds"
  | "uniques"
  | "compositions"
  | "systems";

/** Brand colour that identifies a layer across the guide. Guide-only flair. */
export type GuideLayerColor = "bone" | "tomato" | "mustard" | "plum" | "cobalt" | "pine";

/** Simple units show key facts; complex units show their full anatomy. */
export type GuideUnitDensity = "short" | "detailed";

export interface GuideUnit {
  id: string;
  name: string;
  density: GuideUnitDensity;
  /** Lazy loader for the real-source specimen rendered inline on the layer page. */
  specimen?: () => Promise<{ default: Component }>;
  /** Dedicated route for units too large to live inline. */
  focusedHref?: string;
  /** One line shown when the unit only links out. */
  summary?: string;
}

export interface GuideLayer {
  id: GuideLayerId;
  number: string;
  title: string;
  color: GuideLayerColor;
  mark: MarkName;
  blurb: string;
  units: GuideUnit[];
}

/** Loading-stage shape shared by the production Loading Screen and the design lab. */
export interface LabLoadingStage {
  label: string;
  complete: boolean;
  active: boolean;
  icon?: "midi";
  detail?: string;
  stamp?: string;
  /** Optional stages never hold the Play gate. */
  optional?: boolean;
}

/** Truthful MIDI outcomes the lab can rehearse. */
export type LabMidiOutcome = "set" | "skip" | "na";

/** Props every lab Loading Screen direction receives from the shared rehearsal. */
export interface LabLoadingScreenProps {
  stages: LabLoadingStage[];
  percent: number;
  /** 0–1 progress inside the active required stage. */
  stageFraction: number;
  phase: string;
  message: string;
  ready: boolean;
  /** Composed still frame: the Reduced Motion rendering, forced for review. */
  still?: boolean;
}

/** Shared contract for the lab's Brand Logo directions. */
export interface LabLogoProps {
  surface?: "ink" | "bone";
  /** "icon" drops the fine Marks so the mark survives 48px. */
  variant?: "full" | "icon";
  /** Mark plus wordmark, side by side. */
  lockup?: boolean;
  /** CSS width of the mark. */
  size?: string;
  /** Idle motion; the loading screens turn it on. */
  live?: boolean;
}
