import type {
  BlobConnectionMode,
  VisualEffectsConfig,
} from "@/types/visual";

export type StageControlId =
  | "stageEnabled"
  | "scopeSize"
  | "scopeStrength"
  | "scopeLineWeight"
  | "scopeGlow"
  | "scopeTrail"
  | "bodiesVisible"
  | "bodySize"
  | "bodyStrength"
  | "bodyMotion"
  | "connectionMode"
  | "connectionStrength"
  | "connectionSoftness"
  | "atmosphereStrength"
  | "atmosphereColorDepth"
  | "stringPresence"
  | "stringResponse"
  | "fleckAmount"
  | "fleckEnergy"
  | "showChords"
  | "showIntervals"
  | "showEmotion"
  | "labelStrength";

export interface StageControls {
  stageEnabled: boolean;
  scopeSize: number;
  scopeStrength: number;
  scopeLineWeight: number;
  scopeGlow: number;
  scopeTrail: number;
  bodiesVisible: boolean;
  bodySize: number;
  bodyStrength: number;
  bodyMotion: number;
  connectionMode: BlobConnectionMode;
  connectionStrength: number;
  connectionSoftness: number;
  atmosphereStrength: number;
  atmosphereColorDepth: number;
  stringPresence: number;
  stringResponse: number;
  fleckAmount: number;
  fleckEnergy: number;
  showChords: boolean;
  showIntervals: boolean;
  showEmotion: boolean;
  labelStrength: number;
}

export interface StageControlDefinition {
  id: StageControlId;
  label: string;
  type: "boolean" | "range" | "options";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  format?: (value: number) => string;
}

export interface StageControlGroup {
  label: string;
  description: string;
  controls: StageControlDefinition[];
}

export type StageLookPatch = Partial<{
  [K in StageLookSection]: Partial<VisualEffectsConfig[K]>;
}>;

export interface StageLook {
  id: string;
  name: string;
  description: string;
  patch: StageLookPatch;
}

export interface TransientStageLook {
  seed: string;
  name: string;
  patch: StageLookPatch;
  variationRoot?: {
    name: string;
    patch: StageLookPatch;
  };
}

type StageLookSection =
  | "blobs"
  | "ambient"
  | "particles"
  | "strings"
  | "hilbertScope";

export const STAGE_LOOK_PREFERENCE_FIELDS = [
  "connectionMode",
  "fusionStrength",
  "webOpacity",
  "showChordLabel",
  "showIntervalLabels",
  "showEmotionLabel",
  "labelOpacity",
] as const;

export const STAGE_VARIATION_PREFERENCE_FIELDS = [
  ...STAGE_LOOK_PREFERENCE_FIELDS,
  "blurRadius",
  "fieldSoftness",
] as const;

const STAGE_LOOK_FIELDS: Record<StageLookSection, readonly string[]> = {
  blobs: [
    "isEnabled",
    "baseSizeRatio",
    "opacity",
    "blurRadius",
    "oscillationAmplitude",
    "driftSpeed",
    "vibrationAmplitude",
    "glowEnabled",
    "glowIntensity",
    "connectionMode",
    "fieldSoftness",
    "fusionStrength",
    "webOpacity",
    "showChordLabel",
    "showIntervalLabels",
    "showEmotionLabel",
    "labelOpacity",
  ],
  ambient: [
    "isEnabled",
    "opacityMajor",
    "opacityMinor",
    "brightnessMajor",
    "brightnessMinor",
    "saturationMajor",
    "saturationMinor",
  ],
  particles: ["isEnabled", "count", "speed", "gravity", "airResistance"],
  strings: [
    "isEnabled",
    "baseOpacity",
    "activeOpacity",
    "maxAmplitude",
    "dampingFactor",
    "interpolationSpeed",
    "opacityInterpolationSpeed",
  ],
  hilbertScope: [
    "sizeRatio",
    "opacity",
    "glowEnabled",
    "glowIntensity",
    "smear",
    "history",
    "thickness",
  ],
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const CONNECTION_SOFTNESS_FIELD_MAX = 50;
const CONNECTION_SOFTNESS_BLUR_MAX = 40;

/**
 * The original 10% body proportion remains the renderer calibration baseline.
 * The public control can now enlarge bodies up to 5× that baseline while
 * Stage fitting keeps them inside the usable canvas.
 */
export const STAGE_BODY_SIZE_BASE_RATIO = 0.1;
export const STAGE_BODY_SIZE_MIN_RATIO = 0.05;
export const STAGE_BODY_SIZE_MAX_RATIO = 0.5;

export const STAGE_MASTER_CONTROL: StageControlDefinition = {
  id: "stageEnabled",
  label: "Stage",
  type: "boolean",
};

export const STAGE_CONTROL_GROUPS: StageControlGroup[] = [
  {
    label: "Scope",
    description: "The primary musical body and the only raw-waveform surface.",
    controls: [
      { id: "scopeSize", label: "Size", type: "range", min: 0.15, max: 1.5, step: 0.05, format: percent },
      { id: "scopeStrength", label: "Strength", type: "range", min: 0, max: 1, step: 0.05, format: percent },
      { id: "scopeLineWeight", label: "Line Weight", type: "range", min: 0.01, max: 10, step: 0.05, format: (value) => `${Number(value.toFixed(2))}px` },
      { id: "scopeGlow", label: "Glow", type: "range", min: 0, max: 1, step: 0.05, format: percent },
      { id: "scopeTrail", label: "Trail", type: "range", min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
  {
    label: "Note Bodies",
    description: "Circle-of-Fifths bodies and how simultaneous notes join around the Scope.",
   controls: [
     { id: "bodiesVisible", label: "Show Bodies", type: "boolean" },
     { id: "bodySize", label: "Size", type: "range", min: STAGE_BODY_SIZE_MIN_RATIO, max: STAGE_BODY_SIZE_MAX_RATIO, step: 0.01, format: percent },
     { id: "bodyStrength", label: "Strength", type: "range", min: 0, max: 1, step: 0.05, format: percent },
     { id: "connectionMode", label: "Connections", type: "options", options: ["merge", "web"] },
     { id: "connectionStrength", label: "Connection Strength", type: "range", min: 0, max: 1, step: 0.05, format: percent },
     { id: "connectionSoftness", label: "Softness", type: "range", min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
  {
    label: "Atmosphere",
    description: "The low, breathing field behind the musical bodies.",
    controls: [
      { id: "atmosphereStrength", label: "Strength", type: "range", min: 0, max: 1, step: 0.05, format: percent },
      { id: "atmosphereColorDepth", label: "Color Depth", type: "range", min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
  {
    label: "Pitch Strings",
    description: "Exact-pitch lines driven by the shared live envelope.",
    controls: [
      { id: "stringPresence", label: "Presence", type: "range", min: 0, max: 1, step: 0.05, format: percent },
      { id: "stringResponse", label: "Response", type: "range", min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
  {
    label: "Note Flecks",
    description: "Brief Mark fragments released by note events.",
    controls: [
      { id: "fleckAmount", label: "Amount", type: "range", min: 0, max: 40, step: 1, format: (value) => `${Math.round(value)}` },
      { id: "fleckEnergy", label: "Energy", type: "range", min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
  {
    label: "Explanations",
    description: "Learning labels layered over musical relationships.",
    controls: [
      { id: "showChords", label: "Chords", type: "boolean" },
      { id: "showIntervals", label: "Intervals", type: "boolean" },
      { id: "showEmotion", label: "Emotion", type: "boolean" },
      { id: "labelStrength", label: "Label Strength", type: "range", min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
];

export const STAGE_CONTROL_DEFINITIONS: StageControlDefinition[] = [
  STAGE_MASTER_CONTROL,
  ...STAGE_CONTROL_GROUPS.flatMap((group) => group.controls),
];

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function readStringResponse(config: VisualEffectsConfig["strings"]) {
  return clamp((config.maxAmplitude - 5) / 45);
}

function cloneConfig(config: VisualEffectsConfig): VisualEffectsConfig {
  return {
    ...config,
    stage: { ...config.stage },
    blobs: { ...config.blobs },
    ambient: { ...config.ambient },
    particles: { ...config.particles },
    strings: { ...config.strings },
    hilbertScope: { ...config.hilbertScope },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeStageLookPatch(patch: unknown): StageLookPatch {
  if (!isRecord(patch)) return {};

  const sanitized: StageLookPatch = {};
  for (const section of Object.keys(STAGE_LOOK_FIELDS) as StageLookSection[]) {
    const incoming = patch[section];
    if (!isRecord(incoming)) continue;

    const accepted: Record<string, unknown> = {};
    const retiredOff = section === "blobs" && incoming.connectionMode === "off";
    for (const field of STAGE_LOOK_FIELDS[section]) {
      if (!(field in incoming)) continue;
      const value = incoming[field];
      accepted[field] = section === "blobs"
        && field === "connectionMode"
        && value !== "merge"
        && value !== "web"
        ? "merge"
        : value;
    }
    if (retiredOff) {
      accepted.connectionMode = "merge";
      accepted.fusionStrength = 0;
      accepted.webOpacity = 0;
    }
    if (Object.keys(accepted).length > 0) {
      (sanitized as Record<string, unknown>)[section] = accepted;
    }
  }
  return sanitized;
}

/** Carry learner-owned relationship and explanation choices between previews. */
export function preserveStageLookPreferences(
  patch: StageLookPatch,
  currentConfig: VisualEffectsConfig,
): StageLookPatch {
  return preserveBlobPreferences(
    patch,
    currentConfig,
    STAGE_LOOK_PREFERENCE_FIELDS,
  );
}

export function preserveStageVariationPreferences(
  patch: StageLookPatch,
  currentConfig: VisualEffectsConfig,
): StageLookPatch {
  return preserveBlobPreferences(
    patch,
    currentConfig,
    STAGE_VARIATION_PREFERENCE_FIELDS,
  );
}

function preserveBlobPreferences(
  patch: StageLookPatch,
  currentConfig: VisualEffectsConfig,
  fields: readonly string[],
): StageLookPatch {
  const next = sanitizeStageLookPatch(patch);
  const nextBlobs = {
    ...next.blobs,
  } as Record<string, unknown>;
  const currentBlobs = currentConfig.blobs as unknown as Record<string, unknown>;

  for (const field of fields) {
    nextBlobs[field] = currentBlobs[field];
  }
  next.blobs = nextBlobs;
  return next;
}

export function applyStageLook(
  backingConfig: VisualEffectsConfig,
  lookPatch: StageLookPatch | null | undefined,
): VisualEffectsConfig {
  const next = cloneConfig(backingConfig);
  const patch = sanitizeStageLookPatch(lookPatch);

  for (const section of Object.keys(patch) as StageLookSection[]) {
    Object.assign(next[section], patch[section]);
  }
  return next;
}

export function resolveStageConfig(
  backingConfig: VisualEffectsConfig,
  transientLook?: StageLookPatch | null,
): VisualEffectsConfig {
  const effective = applyStageLook(backingConfig, transientLook);
  const stageEnabled = effective.stage.isEnabled;

  // Hilbert is the Stage's primary body. Its legacy switch remains in saved
  // data for compatibility, but it is not a second public master.
  effective.hilbertScope.isEnabled = stageEnabled;
  // The retired Strings master is also compatibility data. Presence owns the
  // idle field, including a blank zero state; Stage owns whether played notes
  // may reveal their exact-pitch Strings.
  effective.strings.isEnabled = stageEnabled;
  effective.strings.activeOpacity = readStringResponse(effective.strings);
  if (!stageEnabled) {
    effective.blobs.isEnabled = false;
    effective.ambient.isEnabled = false;
    effective.particles.isEnabled = false;
    effective.strings.isEnabled = false;
  }

  return effective;
}

export function readStageControls(config: VisualEffectsConfig): StageControls {
  const bodyMotion = (
    clamp(config.blobs.oscillationAmplitude) +
    clamp(config.blobs.driftSpeed / 20) +
    clamp(config.blobs.vibrationAmplitude / 25)
  ) / 3;
  const connectionStrength = (
    clamp(config.blobs.fusionStrength) +
    clamp((config.blobs.webOpacity - 0.15) / 0.75)
  ) / 2;
  const connectionSoftness = (
    clamp(config.blobs.fieldSoftness / CONNECTION_SOFTNESS_FIELD_MAX) +
    clamp(config.blobs.blurRadius / CONNECTION_SOFTNESS_BLUR_MAX)
  ) / 2;

  return {
    stageEnabled: config.stage.isEnabled,
    scopeSize: clamp(config.hilbertScope.sizeRatio, 0.15, 1.5),
    scopeStrength: clamp(config.hilbertScope.opacity),
    scopeLineWeight: clamp(config.hilbertScope.thickness, 0.01, 10),
    scopeGlow: config.hilbertScope.glowEnabled
      ? clamp(config.hilbertScope.glowIntensity / 50)
      : 0,
    scopeTrail: Math.max(
      clamp(config.hilbertScope.history / 0.95),
      clamp(config.hilbertScope.smear),
    ),
    bodiesVisible: config.blobs.isEnabled,
    bodySize: clamp(
      config.blobs.baseSizeRatio,
      STAGE_BODY_SIZE_MIN_RATIO,
      STAGE_BODY_SIZE_MAX_RATIO,
    ),
    bodyStrength: clamp(config.blobs.opacity),
    bodyMotion,
    connectionMode: config.blobs.connectionMode,
    connectionStrength,
    connectionSoftness,
    atmosphereStrength: config.ambient.isEnabled
      ? clamp((config.ambient.opacityMajor + config.ambient.opacityMinor) / 1.72)
      : 0,
    atmosphereColorDepth: clamp(
      (config.ambient.saturationMajor + config.ambient.saturationMinor) / 1.75,
    ),
    stringPresence: config.strings.isEnabled
      ? clamp(config.strings.baseOpacity / 0.12)
      : 0,
    stringResponse: readStringResponse(config.strings),
    fleckAmount: config.particles.isEnabled
      ? clamp(config.particles.count, 0, 40)
      : 0,
    fleckEnergy: clamp(config.particles.speed / 12),
    showChords: config.blobs.showChordLabel,
    showIntervals: config.blobs.showIntervalLabels,
    showEmotion: config.blobs.showEmotionLabel,
    labelStrength: clamp(config.blobs.labelOpacity),
  };
}

export function patchStageControl(
  backingConfig: VisualEffectsConfig,
  control: StageControlId,
  rawValue: string | number | boolean,
): VisualEffectsConfig {
  const next = cloneConfig(backingConfig);
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);

  switch (control) {
    case "stageEnabled":
      next.stage.isEnabled = Boolean(rawValue);
      break;
    case "scopeSize":
      next.hilbertScope.sizeRatio = clamp(value, 0.15, 1.5);
      break;
    case "scopeStrength":
      next.hilbertScope.opacity = clamp(value);
      break;
    case "scopeLineWeight":
      next.hilbertScope.thickness = clamp(value, 0.01, 10);
      break;
    case "scopeGlow": {
      const amount = clamp(value);
      next.hilbertScope.glowEnabled = amount > 0;
      next.hilbertScope.glowIntensity = amount * 50;
      break;
    }
    case "scopeTrail": {
      const amount = clamp(value);
      // History supplies the whole range; smear joins only in the upper half.
      // Existing independent values are preserved until this public control is edited.
      next.hilbertScope.history = amount * 0.95;
      next.hilbertScope.smear = clamp((amount - 0.55) / 0.45);
      break;
    }
    case "bodiesVisible":
      next.blobs.isEnabled = Boolean(rawValue);
      break;
    case "bodySize":
      next.blobs.baseSizeRatio = clamp(
        value,
        STAGE_BODY_SIZE_MIN_RATIO,
        STAGE_BODY_SIZE_MAX_RATIO,
      );
      break;
    case "bodyStrength":
      next.blobs.opacity = clamp(value);
      break;
    case "bodyMotion": {
      const amount = clamp(value);
      next.blobs.oscillationAmplitude = amount;
      next.blobs.driftSpeed = amount * 20;
      next.blobs.vibrationAmplitude = amount * 25;
      break;
    }
    case "connectionMode":
      if (rawValue === "merge" || rawValue === "web") {
        next.blobs.connectionMode = rawValue;
      }
      break;
    case "connectionStrength": {
      const amount = clamp(value);
      next.blobs.fusionStrength = amount;
      // Web keeps its calibrated visible range above zero, while the exact
      // zero endpoint is a truthful absence of connections in either mode.
      next.blobs.webOpacity = amount === 0 ? 0 : 0.15 + amount * 0.75;
      break;
    }
    case "connectionSoftness": {
      const amount = clamp(value);
      next.blobs.fieldSoftness = amount * CONNECTION_SOFTNESS_FIELD_MAX;
      next.blobs.blurRadius = amount * CONNECTION_SOFTNESS_BLUR_MAX;
      break;
    }
    case "atmosphereStrength": {
      const amount = clamp(value);
      next.ambient.isEnabled = amount > 0.01;
      next.ambient.opacityMajor = amount;
      next.ambient.opacityMinor = amount * 0.72;
      next.ambient.brightnessMajor = 0.35 + amount * 0.35;
      next.ambient.brightnessMinor = 0.2 + amount * 0.3;
      break;
    }
    case "atmosphereColorDepth": {
      const amount = clamp(value);
      next.ambient.saturationMajor = amount;
      next.ambient.saturationMinor = amount * 0.75;
      break;
    }
    case "stringPresence": {
      const amount = clamp(value);
      // Presence describes only the idle field. Effective Stage resolution
      // keeps exact-pitch activation available without rewriting the retired
      // Strings master in persisted compatibility data.
      next.strings.baseOpacity = amount * 0.12;
      break;
    }
    case "stringResponse": {
      const amount = clamp(value);
      next.strings.activeOpacity = amount;
      next.strings.maxAmplitude = 5 + amount * 45;
      next.strings.dampingFactor = 0.14 - amount * 0.1;
      next.strings.interpolationSpeed = 0.05 + amount * 0.25;
      next.strings.opacityInterpolationSpeed = 0.05 + amount * 0.15;
      break;
    }
    case "fleckAmount": {
      const amount = Math.round(clamp(value, 0, 40));
      next.particles.isEnabled = amount > 0;
      next.particles.count = amount;
      break;
    }
    case "fleckEnergy": {
      const amount = clamp(value);
      next.particles.speed = amount * 12;
      next.particles.gravity = amount * 0.5;
      next.particles.airResistance = 0.97 + amount * 0.025;
      break;
    }
    case "showChords":
      next.blobs.showChordLabel = Boolean(rawValue);
      break;
    case "showIntervals":
      next.blobs.showIntervalLabels = Boolean(rawValue);
      break;
    case "showEmotion":
      next.blobs.showEmotionLabel = Boolean(rawValue);
      break;
    case "labelStrength":
      next.blobs.labelOpacity = clamp(value);
      break;
  }

  return next;
}

export function stageLookFromConfig(config: VisualEffectsConfig): StageLookPatch {
  const patch: StageLookPatch = {};
  for (const section of Object.keys(STAGE_LOOK_FIELDS) as StageLookSection[]) {
    const values: Record<string, unknown> = {};
    for (const field of STAGE_LOOK_FIELDS[section]) {
      values[field] = (config[section] as unknown as Record<string, unknown>)[field];
    }
    (patch as Record<string, unknown>)[section] = values;
  }
  return patch;
}

export function diffStageLook(
  backingConfig: VisualEffectsConfig,
  effectiveConfig: VisualEffectsConfig,
): StageLookPatch {
  const patch: StageLookPatch = {};
  for (const section of Object.keys(STAGE_LOOK_FIELDS) as StageLookSection[]) {
    const changed: Record<string, unknown> = {};
    for (const field of STAGE_LOOK_FIELDS[section]) {
      const before = (backingConfig[section] as unknown as Record<string, unknown>)[field];
      const after = (effectiveConfig[section] as unknown as Record<string, unknown>)[field];
      if (before !== after) changed[field] = after;
    }
    if (Object.keys(changed).length > 0) {
      (patch as Record<string, unknown>)[section] = changed;
    }
  }
  return patch;
}

function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededStageVariation(
  seed: string,
  rootConfig: VisualEffectsConfig,
  rootName = "Current",
): TransientStageLook {
  const random = seededRandom(seed);
  const rootPatch = stageLookFromConfig(rootConfig);
  const varied = applyNumericVariation(rootConfig, random);

  return {
    seed,
    name: `${rootName} · Variation ${seed.slice(0, 4).toUpperCase()}`,
    patch: stageLookFromConfig(varied),
    variationRoot: {
      name: rootName,
      patch: rootPatch,
    },
  };
}

function applyNumericVariation(
  rootConfig: VisualEffectsConfig,
  random: () => number,
): VisualEffectsConfig {
  let varied = cloneConfig(rootConfig);
  const controls = readStageControls(rootConfig);
  const scale = (value: number, spread: number, min: number, max: number) =>
    clamp(value * (1 + (random() * 2 - 1) * spread), min, max);

  const vary = (
    control: StageControlId,
    value: number,
    spread: number,
    min = 0,
    max = 1,
  ) => {
    varied = patchStageControl(varied, control, scale(value, spread, min, max));
  };

  // Vary the public correlated controls so a variation never tears apart the
  // raw fields that one Knob intentionally owns. Relationship mode/strength,
  // explanations, and enabled states stay anchored to the root Look.
  vary("scopeSize", controls.scopeSize, 0.08, 0.15, 1.5);
  vary("scopeStrength", controls.scopeStrength, 0.08);
  vary("scopeLineWeight", controls.scopeLineWeight, 0.12, 0.01, 10);
  vary("scopeGlow", controls.scopeGlow, 0.1);
  vary("scopeTrail", controls.scopeTrail, 0.1);
  vary("bodySize", controls.bodySize, 0.08, STAGE_BODY_SIZE_MIN_RATIO, STAGE_BODY_SIZE_MAX_RATIO);
  vary("bodyStrength", controls.bodyStrength, 0.08);
  vary("bodyMotion", controls.bodyMotion, 0.08);
  vary("atmosphereStrength", controls.atmosphereStrength, 0.08);
  vary("atmosphereColorDepth", controls.atmosphereColorDepth, 0.08);
  vary("stringPresence", controls.stringPresence, 0.1);
  vary("stringResponse", controls.stringResponse, 0.08);
  vary("fleckAmount", controls.fleckAmount, 0.18, 0, 40);
  vary("fleckEnergy", controls.fleckEnergy, 0.1);

  return varied;
}
