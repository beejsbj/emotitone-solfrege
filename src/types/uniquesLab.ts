import type { Component } from "vue";
import type { JoystickVisual } from "@/components/uniques/Joystick/edition";
import type { HarmonyAlteration } from "@/domain/harmony";

/*
 * Guide-only contracts for the Uniques design lab. Uniques carry deep
 * behaviour, so every direction keeps the real production component mounted:
 * Joystick directions repaint its face from the state it publishes, and
 * Drawer and Code Strip directions are skins applied around the real source.
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

/** What the real Joystick publishes through its DOM, read by a lab face. */
export interface LabJoystickFaceProps {
  visual: JoystickVisual;
  /** Stick position, -1 to 1 on each axis, exactly where production draws it. */
  x: number;
  y: number;
  latched: HarmonyAlteration;
  effective: HarmonyAlteration;
  /** A pointer is down on the face. */
  active: boolean;
  /** Held past the hold threshold: release restores the latch. */
  momentary: boolean;
}

export interface LabUniqueDirection {
  id: string;
  letter: string;
  name: string;
  paper: LabPaper;
  /** The idea in two lines. */
  idea: string;
  better: string;
  risks: string;
  bible: LabBibleReading;
  /** Joystick: a face component. Drawer and Code Strip: omitted, the bench applies `skin`. */
  face?: Component;
  /** Class suffix the bench applies around the real component. */
  skin?: string;
  /** Joystick editions this direction is proposed for. */
  editions?: JoystickVisual[];
}

export interface LabUniqueUnit {
  id: string;
  name: string;
  /** Production source path shown on the baseline sheet. */
  source: string;
  /** Bench that mounts the real component through every state the unit owns. */
  bench: Component;
  directions: LabUniqueDirection[];
  /** The unit's place in the bible: which zone, chassis or applied paper. */
  reading: string;
  /** Burooj's recorded response to the directions, once given. */
  verdict?: string;
  /** Present when the lab deliberately leaves the unit alone. */
  leaveAlone?: string;
}
