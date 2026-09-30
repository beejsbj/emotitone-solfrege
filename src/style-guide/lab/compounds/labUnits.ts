import type { LabCompoundUnit } from "@/types/compoundsLab";
import { beatIndicatorUnit } from "./beat-indicator/unit";
import { chordUnit } from "./chord/unit";
import { codeStripBarUnit } from "./code-strip-bar/unit";
import { controlBarUnit } from "./control-bar/unit";
import { keyUnit } from "./key/unit";
import { keyboardUnit } from "./keyboard/unit";
import { overlayHeaderUnit } from "./overlay-header/unit";
import { patternReelUnit } from "./pattern-reel/unit";

/*
 * The Compounds lab registry. Each unit lives in its own folder with its
 * bench, skins and `unit.ts`, so units can be built and iterated separately.
 */
export const COMPOUND_LAB_UNITS: LabCompoundUnit[] = [
  keyUnit,
  chordUnit,
  keyboardUnit,
  beatIndicatorUnit,
  patternReelUnit,
  overlayHeaderUnit,
  controlBarUnit,
  codeStripBarUnit,
];
