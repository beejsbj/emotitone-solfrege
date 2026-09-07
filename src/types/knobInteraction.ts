export type KnobInteractionValue = string | number | boolean;

export type KnobInteractionKind = "range" | "boolean" | "options";
export type KnobPointerKind = "mouse" | "touch";
export type KnobGestureState =
  | "idle"
  | "potential_tap"
  | "horizontal_scroll"
  | "confirmed_drag";

export interface KnobInteractionOption {
  value: string | number;
}

export interface KnobInteractionConfiguration {
  value: KnobInteractionValue;
  kind: KnobInteractionKind;
  inert: boolean;
  min: number;
  max: number;
  step: number;
  sensitivity: number;
  tapThreshold: number;
  tapDuration: number;
  options: readonly KnobInteractionOption[];
}

export interface KnobInteractionPoint {
  x: number;
  y: number;
}

export interface KnobInteractionContact {
  id: number | null;
  point: KnobInteractionPoint;
}

export type KnobInteractionEvent =
  | {
      type: "start";
      pointer: KnobPointerKind;
      contact: KnobInteractionContact;
      button?: number;
      scrollLeft: number | null;
    }
  | { type: "move"; contacts: readonly KnobInteractionContact[] }
  | {
      type: "end";
      pointer: KnobPointerKind;
      endedContactIds: readonly number[];
      cancelled?: boolean;
    }
  | { type: "click"; keyboard: boolean }
  | { type: "cancel" };

export type KnobInteractionEffect =
  | { type: "capture"; pointer: KnobPointerKind }
  | { type: "release" }
  | { type: "value"; value: KnobInteractionValue }
  | { type: "scroll"; left: number }
  | { type: "haptic"; pulse: "tap" | "step" };

export interface KnobInteractionView {
  held: boolean;
  dragging: boolean;
  gesture: KnobGestureState;
  point: KnobInteractionPoint;
}

export interface KnobInteractionOutcome {
  consume: boolean;
  effects: KnobInteractionEffect[];
  view: KnobInteractionView;
}

export interface KnobInteractionClock {
  now(): number;
  schedule(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  cancel(handle: ReturnType<typeof setTimeout>): void;
}

export interface KnobInteraction {
  dispatch(event: KnobInteractionEvent): KnobInteractionOutcome;
  dispose(): KnobInteractionOutcome;
}

export interface KnobScrollContext {
  read(): number;
  write(left: number): void;
}
