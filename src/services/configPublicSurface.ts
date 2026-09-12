import type {
  DynamicColorConfig,
  MusicColorMode,
  VisualEffectsConfig,
} from "@/types/visual";

export type GlobalControlId =
  | "musicColorMapping"
  | "colorIntensity"
  | "colorMotion"
  | "uiRhythm";

export type DeckControlId =
  | "notation"
  | "keyboardLabels"
  | "keyboardSpacing"
  | "noteSurface"
  | "touchFeedback"
  | "codeStrip"
  | "showRests";

export type ColorIntensity = "muted" | "balanced" | "vivid";
export type ColorMotion = "off" | "gentle" | "lively";
export type DeckNotation = "solfege" | "degree" | "pitch";
export type KeyboardSpacing = "compact" | "balanced" | "open";

export interface GlobalControls {
  musicColorMapping: MusicColorMode;
  colorIntensity: ColorIntensity;
  colorMotion: ColorMotion;
  uiRhythm: boolean;
}

export interface DeckControls {
  notation: DeckNotation;
  keyboardLabels: boolean;
  keyboardSpacing: KeyboardSpacing;
  noteSurface: VisualEffectsConfig["keyboard"]["surfaceStyle"];
  touchFeedback: boolean;
  codeStrip: boolean;
  showRests: boolean;
}

type ConfigOption = {
  label: string;
  value: string;
};

export interface PublicConfigControlDefinition<Id extends string> {
  id: Id;
  label: string;
  type: "boolean" | "options";
  options?: ConfigOption[];
}

export interface PublicConfigControlGroup<Id extends string> {
  label: string;
  description: string;
  controls: PublicConfigControlDefinition<Id>[];
}

export const GLOBAL_CONTROL_GROUPS: PublicConfigControlGroup<GlobalControlId>[] = [
  {
    label: "Music Color",
    description: "Choose how pitch becomes color, how saturated it feels, and how much it moves.",
    controls: [
      {
        id: "musicColorMapping",
        label: "Mapping",
        type: "options",
        options: [
          { label: "Fixed Pitch", value: "fixed" },
          { label: "Scale Order", value: "movable-ordinal" },
          { label: "Tonic-relative Pitch", value: "movable-relative" },
        ],
      },
      {
        id: "colorIntensity",
        label: "Color Intensity",
        type: "options",
        options: [
          { label: "Muted", value: "muted" },
          { label: "Balanced", value: "balanced" },
          { label: "Vivid", value: "vivid" },
        ],
      },
      {
        id: "colorMotion",
        label: "Color Motion",
        type: "options",
        options: [
          { label: "Off", value: "off" },
          { label: "Gentle", value: "gentle" },
          { label: "Lively", value: "lively" },
        ],
      },
    ],
  },
  {
    label: "UI Rhythm",
    description: "Let interface controls follow the sounding transport.",
    controls: [
      {
        id: "uiRhythm",
        label: "UI Rhythm",
        type: "boolean",
      },
    ],
  },
];

export const DECK_CONTROL_GROUPS: PublicConfigControlGroup<DeckControlId>[] = [
  {
    label: "Notation",
    description: "One musical naming system across the Keyboard and Code Strip.",
    controls: [
      {
        id: "notation",
        label: "Notation",
        type: "options",
        options: [
          { label: "Solfège", value: "solfege" },
          { label: "Scale Degree", value: "degree" },
          { label: "Pitch", value: "pitch" },
        ],
      },
      {
        id: "keyboardLabels",
        label: "Keyboard Labels",
        type: "boolean",
      },
    ],
  },
  {
    label: "Keyboard",
    description: "Shape the playable surface without exposing renderer calibration.",
    controls: [
      {
        id: "keyboardSpacing",
        label: "Spacing",
        type: "options",
        options: [
          { label: "Compact", value: "compact" },
          { label: "Balanced", value: "balanced" },
          { label: "Open", value: "open" },
        ],
      },
      {
        id: "noteSurface",
        label: "Note Surface",
        type: "options",
        options: [
          { label: "Color", value: "colored" },
          { label: "Monochrome", value: "monochrome" },
        ],
      },
      {
        id: "touchFeedback",
        label: "Touch Feedback",
        type: "boolean",
      },
    ],
  },
  {
    label: "Code Strip",
    description: "Keep the editable music line available and decide whether rests stay visible.",
    controls: [
      {
        id: "codeStrip",
        label: "Code Strip",
        type: "boolean",
      },
      {
        id: "showRests",
        label: "Show Rests",
        type: "boolean",
      },
    ],
  },
];

const INTENSITY_CHROMA: Record<ColorIntensity, number> = {
  muted: 0.12,
  balanced: 0.18,
  vivid: 0.24,
};

const MOTION_SPEED: Record<Exclude<ColorMotion, "off">, number> = {
  gentle: 0.6,
  lively: 1.4,
};

const DECK_NOTATION = {
  solfege: { keyboard: "syllable", codeStrip: "solfege" },
  degree: { keyboard: "degree", codeStrip: "degree" },
  pitch: { keyboard: "raw", codeStrip: "note" },
} as const;

const KEYBOARD_SPACING = {
  compact: { keyGaps: "none", keyboardPadding: false },
  balanced: { keyGaps: "small", keyboardPadding: false },
  open: { keyGaps: "medium", keyboardPadding: true },
} as const;

function readColorIntensity(chroma: number): ColorIntensity {
  if (chroma < 0.15) return "muted";
  if (chroma < 0.22) return "balanced";
  return "vivid";
}

function readColorMotion(config: DynamicColorConfig): ColorMotion {
  if (!config.hueMotionEnabled) return "off";
  return config.animationSpeed <= 1 ? "gentle" : "lively";
}

function readDeckNotation(
  primaryLabel: VisualEffectsConfig["keyboard"]["primaryLabel"],
): DeckNotation {
  if (primaryLabel === "degree") return "degree";
  if (primaryLabel === "raw") return "pitch";
  return "solfege";
}

function readKeyboardSpacing(
  keyboard: VisualEffectsConfig["keyboard"],
): KeyboardSpacing {
  if (keyboard.keyGaps === "none" && !keyboard.keyboardPadding) return "compact";
  if (keyboard.keyGaps === "medium" || keyboard.keyboardPadding) return "open";
  return "balanced";
}

export function readGlobalControls(config: VisualEffectsConfig): GlobalControls {
  return {
    musicColorMapping: config.dynamicColors.musicColorMode,
    colorIntensity: readColorIntensity(config.dynamicColors.chroma),
    colorMotion: readColorMotion(config.dynamicColors),
    uiRhythm: config.uiBeat.isEnabled,
  };
}

export function readDeckControls(config: VisualEffectsConfig): DeckControls {
  return {
    notation: readDeckNotation(config.keyboard.primaryLabel),
    keyboardLabels: config.keyboard.showLabels,
    keyboardSpacing: readKeyboardSpacing(config.keyboard),
    noteSurface: config.keyboard.surfaceStyle,
    touchFeedback: config.keyboard.hapticFeedback,
    codeStrip: config.codeStrip.enabled,
    showRests: config.codeStrip.showRests,
  };
}

export function updateGlobalControl(
  config: VisualEffectsConfig,
  control: GlobalControlId,
  value: string | boolean,
) {
  switch (control) {
    case "musicColorMapping":
      if (value === "fixed" || value === "movable-ordinal" || value === "movable-relative") {
        config.dynamicColors.musicColorMode = value;
      }
      break;
    case "colorIntensity":
      if (value === "muted" || value === "balanced" || value === "vivid") {
        config.dynamicColors.chroma = INTENSITY_CHROMA[value];
      }
      break;
    case "colorMotion":
      if (value === "off") {
        config.dynamicColors.hueMotionEnabled = false;
      } else if (value === "gentle" || value === "lively") {
        config.dynamicColors.hueMotionEnabled = true;
        config.dynamicColors.animationSpeed = MOTION_SPEED[value];
      }
      break;
    case "uiRhythm":
      if (typeof value === "boolean") config.uiBeat.isEnabled = value;
      break;
  }
}

export function updateDeckControl(
  config: VisualEffectsConfig,
  control: DeckControlId,
  value: string | boolean,
) {
  switch (control) {
    case "notation":
      if (value === "solfege" || value === "degree" || value === "pitch") {
        config.keyboard.primaryLabel = DECK_NOTATION[value].keyboard;
        config.codeStrip.notation = DECK_NOTATION[value].codeStrip;
      }
      break;
    case "keyboardLabels":
      if (typeof value === "boolean") config.keyboard.showLabels = value;
      break;
    case "keyboardSpacing":
      if (value === "compact" || value === "balanced" || value === "open") {
        Object.assign(config.keyboard, KEYBOARD_SPACING[value]);
      }
      break;
    case "noteSurface":
      if (value === "colored" || value === "monochrome") {
        config.keyboard.surfaceStyle = value;
      }
      break;
    case "touchFeedback":
      if (typeof value === "boolean") config.keyboard.hapticFeedback = value;
      break;
    case "codeStrip":
      if (typeof value === "boolean") config.codeStrip.enabled = value;
      break;
    case "showRests":
      if (typeof value === "boolean") config.codeStrip.showRests = value;
      break;
  }
}
