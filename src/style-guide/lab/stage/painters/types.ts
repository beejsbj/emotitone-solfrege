import type { ActiveNote } from "@/types/music";
import type { HarmonicGeometryScene, PreparedBlobFrame } from "@/types/canvas";
import type { VibratingStringConfig } from "@/types/visual";
import type { StageAudioFrame, StageComposition } from "@/composables/canvas/stageRuntime";

/** Design tokens read from the guide root, so painters never hard-code chrome colour. */
export interface LabTokens {
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  ink5: string;
  ivory: string;
  ivory2: string;
  ivory3: string;
  ivory4: string;
  display: string;
  mono: string;
}

/** Music Color for one note through the production numeric authority, optionally tuned. */
export type LabNoteColor = (
  note: Pick<ActiveNote, "pitchClassIndex" | "octave">,
  tune?: { l?: number; c?: number; alpha?: number },
) => string;

export interface LabFrame {
  ctx: CanvasRenderingContext2D;
  /** Canvas size in CSS pixels; painters draw in CSS pixels. */
  width: number;
  height: number;
  /** Seconds since the loop started. */
  elapsed: number;
  /** Seconds since the previous frame, clamped. */
  dt: number;
  composition: StageComposition;
  audio: StageAudioFrame;
  reducedMotion: boolean;
  notes: readonly ActiveNote[];
  /** The production Hilbert pair's analytic signal, when audio is running. */
  wave: { x: Float32Array; y: Float32Array } | null;
  tokens: LabTokens;
  noteColor: LabNoteColor;
  /** The scope's colour note: the first sounding note, else the last one seen, else the tonic. */
  leadNote: Pick<ActiveNote, "pitchClassIndex" | "octave">;
}

/** A Stage direction replaces the four non-body layers. */
export interface StageDirectionPainter {
  atmosphere(frame: LabFrame): void;
  /** Production owns which Strings exist and which sound; the painter owns how they look. */
  strings(frame: LabFrame, strings: readonly VibratingStringConfig[]): void;
  scope(frame: LabFrame): void;
  attack(frame: LabFrame, note: ActiveNote): void;
  flecks(frame: LabFrame): void;
  clear(): void;
}

/** A Geometry direction replaces body and relationship material; lettering stays production. */
export interface GeometryDirectionPainter {
  bodies(
    frame: LabFrame,
    bodies: readonly PreparedBlobFrame[],
    scene: HarmonicGeometryScene | null,
    mode: "merge" | "web",
  ): void;
  clear(): void;
}
