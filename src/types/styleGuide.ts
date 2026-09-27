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
