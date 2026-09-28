import type { Component } from "vue";
import type { MarkName } from "@/components/primatives/marks";
import type { TabItem } from "@/components/primatives/Tabs.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";

/*
 * Guide-only contracts for the Primitives design lab. Each lab direction
 * accepts the same public props as the production primitive it competes with,
 * so one bench can mount production and every direction side by side.
 */

export type LabButtonTone = "ink" | "ivory" | "brass";
export type LabButtonSize = "sm" | "md" | "lg";

export interface LabButtonProps {
  size?: LabButtonSize;
  tone?: LabButtonTone;
  loading?: boolean;
  disabled?: boolean;
  uiBeat?: boolean;
  haptic?: boolean;
  type?: "button" | "submit" | "reset";
  accessibleName: string;
  title?: string;
}

export type LabStickerColor =
  | "ink" | "ink-5" | "ivory" | "brass" | "brass-sheen" | "brass-glow" | "brass-sheen-glow"
  | "tomato" | "pine" | "plum" | "bone" | "mustard";

export interface LabStickerProps {
  variant?: "outline" | "fill" | "badge";
  color?: LabStickerColor;
  mark?: MarkName;
  markPosition?: "before" | "after";
  /** Default-off; production opts only the selected current-instrument Sticker in. */
  uiBeat?: boolean;
}

export type LabNoteLabel = "syllable" | "degree" | "raw";
export type LabNoteProportion = "glyph" | "tall" | "medium" | "stocky" | "wide";

export interface LabNoteProps {
  syllable?: string;
  degree?: string;
  rawPitch?: string;
  primary?: LabNoteLabel;
  visibleLabels?: LabNoteLabel[];
  proportion?: LabNoteProportion;
  pitchClassIndex?: number;
  octave?: number;
  mode?: MusicalMode;
  musicKey?: ChromaticNote;
  accidental?: boolean | null;
  sounding?: boolean;
}

export type LabKnobRole = "range" | "boolean" | "options";

/** Everything a lab Knob face needs; the real Knob still owns every gesture. */
export interface LabKnobFaceProps {
  role: LabKnobRole;
  tone: "ivory" | "brass";
  /** Normalized 0–1 range position. */
  value: number;
  /** Formatted number without its unit. */
  display: string;
  unit: string;
  active: boolean;
  optionIndex: number;
  optionLabels: string[];
}

/** The floating value's paper: what DragValue carries above the finger. */
export interface LabDragPaperProps {
  value: string;
  /** Ivory for everyday Knobs, Brass Badge for masters, Ivory-latched for a committed Joystick. */
  tone: "ivory" | "brass" | "ivory-badge";
}

export interface LabBarTapeSegment {
  color: string;
  durationMs: number;
  /** Diatonic height (octave × 7 + scale index) for directions that draw contour. */
  height: number;
}

export interface LabTabsProps {
  tabs: TabItem[];
  modelValue: string;
  tone?: "ivory" | "brass";
  density?: "comfortable" | "compact";
  layout?: "equal" | "scroll";
  ariaLabel?: string;
}

export type LabPaper = "bone" | "tomato" | "mustard" | "plum" | "cobalt" | "pine";

/** How a direction reads against the design bible (`src/style-guide/WIP-bible.md`). */
export interface LabBibleReading {
  zone: "Playing zone" | "Brand zone" | "Both zones";
  /** Chassis (hardware) or applied paper stuck onto it. */
  role: "Chassis" | "Applied paper" | "Seam";
  fit: "fits" | "caution";
  note: string;
}

export interface LabPrimitiveDirection {
  id: string;
  letter: string;
  name: string;
  paper: LabPaper;
  /** The idea in two lines. */
  idea: string;
  better: string;
  risks: string;
  bible: LabBibleReading;
  component: Component;
}

export interface LabPrimitiveUnit {
  id: string;
  name: string;
  /** Production source path shown on the baseline sheet. */
  source: string;
  /** Bench that mounts a component through every state the unit owns. */
  bench: Component;
  production: Component | null;
  directions: LabPrimitiveDirection[];
  /** The unit's place in the bible: which zone, chassis or applied paper. */
  reading: string;
  /** Present when the lab deliberately leaves the unit alone. */
  leaveAlone?: string;
}
