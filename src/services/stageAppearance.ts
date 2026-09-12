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
}

type StageLookSection =
  | "blobs"
  | "ambient"
  | "particles"
  | "strings"
  | "hilbertScope";

export const STAGE_LOOK_PREFERENCE_FIELDS = [
  "connectionMode",
  "fieldSoftness",
  "fusionStrength",
  "webOpacity",
  "showChordLabel",
  "showIntervalLabels",
  "showEmotionLabel",
  "labelOpacity",
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
    description: "Circle-of-Fifths support bodies around the Scope.",
    controls: [
      { id: "bodiesVisible", label: "Show Bodies", type: "boolean" },
      { id: "bodySize", label: "Size", type: "range", min: 0.05, max: 0.3, step: 0.01, format: percent },
      { id: "bodyStrength", label: "Strength", type: "range", min: 0, max: 1, step: 0.05, format: percent },
      { id: "bodyMotion", label: "Motion", type: "range", min: 0, max: 1, step: 0.05, format: percent },
    ],
  },
  {
    label: "Connections",
    description: "How simultaneous note bodies relate.",
    controls: [
      { id: "connectionMode", label: "Mode", type: "options", options: ["off", "merge", "web"] },
      { id: "connectionStrength", label: "Strength", type: "range", min: 0, max: 1, step: 0.05, format: percent },
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
      { id: "fleckAmount", label: "Amount", type: "range", min: 0, max: 40, step: 2, format: (value) => `${Math.round(value)}` },
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
    for (const field of STAGE_LOOK_FIELDS[section]) {
      if (field in incoming) accepted[field] = incoming[field];
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
  const next = sanitizeStageLookPatch(patch);
  const nextBlobs = {
    ...next.blobs,
  } as Record<string, unknown>;
  const currentBlobs = currentConfig.blobs as unknown as Record<string, unknown>;

  for (const field of STAGE_LOOK_PREFERENCE_FIELDS) {
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
    clamp((config.blobs.fieldSoftness - 4) / 28) +
    clamp((config.blobs.webOpacity - 0.15) / 0.75)
  ) / 3;

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
    bodySize: clamp(config.blobs.baseSizeRatio, 0.05, 0.3),
    bodyStrength: clamp(config.blobs.opacity),
    bodyMotion,
    connectionMode: config.blobs.connectionMode,
    connectionStrength,
    atmosphereStrength: config.ambient.isEnabled
      ? clamp((config.ambient.opacityMajor + config.ambient.opacityMinor) / 1.72)
      : 0,
    atmosphereColorDepth: clamp(
      (config.ambient.saturationMajor + config.ambient.saturationMinor) / 1.75,
    ),
    stringPresence: config.strings.isEnabled
      ? clamp(config.strings.activeOpacity)
      : 0,
    stringResponse: clamp((config.strings.maxAmplitude - 5) / 45),
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
      next.blobs.baseSizeRatio = clamp(value, 0.05, 0.3);
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
      if (rawValue === "off" || rawValue === "merge" || rawValue === "web") {
        next.blobs.connectionMode = rawValue;
      }
      break;
    case "connectionStrength": {
      const amount = clamp(value);
      next.blobs.fusionStrength = amount;
      next.blobs.fieldSoftness = 4 + amount * 28;
      next.blobs.webOpacity = 0.15 + amount * 0.75;
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
      next.strings.isEnabled = amount > 0.01;
      next.strings.baseOpacity = amount * 0.12;
      next.strings.activeOpacity = amount;
      break;
    }
    case "stringResponse": {
      const amount = clamp(value);
      next.strings.maxAmplitude = 5 + amount * 45;
      next.strings.dampingFactor = 0.14 - amount * 0.1;
      next.strings.interpolationSpeed = 0.05 + amount * 0.2;
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

export function createSeededStageLook(
  seed: string,
  looks: readonly StageLook[],
): TransientStageLook {
  if (looks.length === 0) {
    return { seed, name: "New Look", patch: {} };
  }

  const random = seededRandom(seed);
  const source = looks[Math.floor(random() * looks.length)] ?? looks[0];
  const patch = sanitizeStageLookPatch(source.patch);
  const varied = applyNumericVariation(patch, random);
  if (varied.blobs) {
    // Launch variation changes appearance, not the learner's relationship or
    // explanation choices.
    delete varied.blobs.connectionMode;
    delete varied.blobs.fusionStrength;
    delete varied.blobs.fieldSoftness;
    delete varied.blobs.webOpacity;
    delete varied.blobs.showChordLabel;
    delete varied.blobs.showIntervalLabels;
    delete varied.blobs.showEmotionLabel;
    delete varied.blobs.labelOpacity;
  }

  return {
    seed,
    name: `${source.name} · ${seed.slice(0, 4).toUpperCase()}`,
    patch: varied,
  };
}

function applyNumericVariation(
  patch: StageLookPatch,
  random: () => number,
): StageLookPatch {
  const varied = sanitizeStageLookPatch(patch);
  const scale = (value: number, spread: number, min: number, max: number) =>
    clamp(value * (1 + (random() * 2 - 1) * spread), min, max);

  if (varied.hilbertScope) {
    if (typeof varied.hilbertScope.sizeRatio === "number") varied.hilbertScope.sizeRatio = scale(varied.hilbertScope.sizeRatio, 0.1, 0.15, 1.5);
    if (typeof varied.hilbertScope.opacity === "number") varied.hilbertScope.opacity = scale(varied.hilbertScope.opacity, 0.12, 0, 1);
    if (typeof varied.hilbertScope.thickness === "number") varied.hilbertScope.thickness = scale(varied.hilbertScope.thickness, 0.16, 0.01, 10);
    if (typeof varied.hilbertScope.glowIntensity === "number") varied.hilbertScope.glowIntensity = scale(varied.hilbertScope.glowIntensity, 0.15, 0, 50);
    if (typeof varied.hilbertScope.history === "number") varied.hilbertScope.history = scale(varied.hilbertScope.history, 0.16, 0, 0.95);
  }
  if (varied.blobs) {
    if (typeof varied.blobs.baseSizeRatio === "number") varied.blobs.baseSizeRatio = scale(varied.blobs.baseSizeRatio, 0.12, 0.05, 0.3);
    if (typeof varied.blobs.opacity === "number") varied.blobs.opacity = scale(varied.blobs.opacity, 0.12, 0, 1);
    if (typeof varied.blobs.blurRadius === "number") varied.blobs.blurRadius = scale(varied.blobs.blurRadius, 0.16, 0, 100);
  }
  if (varied.ambient) {
    if (typeof varied.ambient.opacityMajor === "number") varied.ambient.opacityMajor = scale(varied.ambient.opacityMajor, 0.12, 0, 1);
    if (typeof varied.ambient.opacityMinor === "number") varied.ambient.opacityMinor = scale(varied.ambient.opacityMinor, 0.12, 0, 1);
  }
  if (varied.strings) {
    if (typeof varied.strings.activeOpacity === "number") varied.strings.activeOpacity = scale(varied.strings.activeOpacity, 0.14, 0, 1);
    if (typeof varied.strings.maxAmplitude === "number") varied.strings.maxAmplitude = scale(varied.strings.maxAmplitude, 0.14, 1, 100);
  }
  if (varied.particles) {
    if (typeof varied.particles.count === "number") varied.particles.count = Math.round(scale(varied.particles.count, 0.18, 0, 40));
    if (typeof varied.particles.speed === "number") varied.particles.speed = scale(varied.particles.speed, 0.15, 0, 20);
  }

  return varied;
}
