import type { BarTapeSegment } from "@/components/primatives/BarTape.vue";

export type PatternReelPrototypeVariant = "wheel" | "steps" | "cassette";
export type PatternReelPrototypeInput =
  | "initial"
  | "drag"
  | "wheel"
  | "tap"
  | "keyboard"
  | "control";

export interface PatternReelPrototypeItem {
  id: string;
  name: string;
  rootPitchClass: number;
  rootOctave: number;
  rootLabel: string;
  barTape: BarTapeSegment[];
  codeTokens: string[];
  isLive?: boolean;
}

export interface PatternReelPrototypeState {
  input: PatternReelPrototypeInput;
  previewId: string;
  settling: boolean;
  posture: "deck" | "unwinding" | "unwound" | "fixed";
}
