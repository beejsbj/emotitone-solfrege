import type { HarmonyAlteration } from "@/domain/harmony";

export interface JoystickOption {
  value: HarmonyAlteration;
  position:
    | "up-left"
    | "up"
    | "up-right"
    | "left"
    | "center"
    | "right"
    | "down-left"
    | "down"
    | "down-right";
  glyph: string;
  label: string;
  description: string;
}

/** HiChord default-mode directions, with center reserved for EmotiTone Auto. */
export const JOYSTICK_OPTIONS: readonly JoystickOption[] = [
  { value: "augmented", position: "up-left", glyph: "↖", label: "Dreamy", description: "Augmented chord" },
  { value: "flip", position: "up", glyph: "↑", label: "Flip", description: "Switch major and minor character" },
  { value: "dominant7", position: "up-right", glyph: "↗", label: "Bluesy", description: "Dominant seventh chord" },
  { value: "dark", position: "left", glyph: "←", label: "Dark", description: "Minor or diminished chord" },
  { value: "auto", position: "center", glyph: "•", label: "Automatic", description: "Scale-derived harmony" },
  { value: "jazzy7", position: "right", glyph: "→", label: "Jazzy", description: "Major or minor seventh chord" },
  { value: "sweet", position: "down-left", glyph: "↙", label: "Sweet", description: "Sixth or suspended second chord" },
  { value: "sus4", position: "down", glyph: "↓", label: "Open", description: "Suspended fourth chord" },
  { value: "lush9", position: "down-right", glyph: "↘", label: "Lush", description: "Major or minor ninth chord" },
];

/** Screen-space octants, clockwise from right; radius is normalized to travel. */
export function directionFromVector(x: number, y: number): HarmonyAlteration {
  if (Math.hypot(x, y) < 0.24) return "auto";
  const octants: HarmonyAlteration[] = ["jazzy7", "lush9", "sus4", "sweet", "dark", "augmented", "flip", "dominant7"];
  return octants[(Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8];
}

export function vectorFromDirection(value: HarmonyAlteration) {
  const index = JOYSTICK_OPTIONS.findIndex((option) => option.value === value);
  const x = index % 3 - 1;
  const y = Math.floor(index / 3) - 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
