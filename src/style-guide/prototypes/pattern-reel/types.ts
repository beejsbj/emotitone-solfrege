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
  ordinal: string;
  name: string;
  label: string;
  metadata: string;
  context: string;
  spine: string;
  barTape: BarTapeSegment[];
  codeTokens: string[];
  isLive?: boolean;
}

export interface PatternReelPrototypeState {
  input: PatternReelPrototypeInput;
  previewId: string;
  settling: boolean;
  posture: "deck" | "unwound" | "fixed";
}
