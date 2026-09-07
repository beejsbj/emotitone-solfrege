import { describe, expect, it } from "vitest";
import { createKnobInteraction } from "@/components/primatives/Knob/interaction";
import type {
  KnobInteractionClock,
  KnobInteractionConfiguration,
  KnobInteractionEffect,
  KnobInteractionEvent,
  KnobInteractionValue,
} from "@/types/knobInteraction";

function createClock(startAt = 1_000) {
  let now = startAt;
  let nextId = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const clock: KnobInteractionClock = {
    now: () => now,
    schedule(callback, delay) {
      const id = nextId++;
      timers.set(id, { at: now + delay, callback });
      return id as ReturnType<typeof setTimeout>;
    },
    cancel(handle) {
      timers.delete(handle as number);
    },
  };

  return {
    clock,
    advance(milliseconds: number) {
      now += milliseconds;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
    pending: () => timers.size,
  };
}

function setup(
  overrides: Partial<KnobInteractionConfiguration> = {},
  startAt = 1_000,
) {
  let value: KnobInteractionValue = overrides.value ?? 50;
  const timer = createClock(startAt);
  const configuration: KnobInteractionConfiguration = {
    value,
    kind: "range",
    inert: false,
    min: 0,
    max: 100,
    step: 1,
    sensitivity: 0.05,
    tapThreshold: 5,
    tapDuration: 200,
    options: [],
    ...overrides,
  };
  const interaction = createKnobInteraction(
    () => ({ ...configuration, value }),
    timer.clock,
  );
  const effects: KnobInteractionEffect[] = [];

  const dispatch = (event: KnobInteractionEvent) => {
    const result = interaction.dispatch(event);
    effects.push(...result.effects);
    for (const effect of result.effects) {
      if (effect.type === "value") value = effect.value;
    }
    return result;
  };

  return {
    configuration,
    interaction,
    dispatch,
    effects,
    timer,
    value: () => value,
    setValue: (nextValue: KnobInteractionValue) => {
      value = nextValue;
    },
  };
}

const start = (
  pointer: "mouse" | "touch" = "mouse",
  scrollLeft: number | null = null,
): KnobInteractionEvent => ({
  type: "start",
  pointer,
  point: { x: 100, y: 100 },
  button: pointer === "mouse" ? 0 : undefined,
  scrollLeft,
});

describe("knob interaction interface", () => {
  it("hands horizontal movement to explicit scroll context without changing value", () => {
    const subject = setup();
    subject.dispatch(start("touch", 40));

    const result = subject.dispatch({ type: "move", point: { x: 130, y: 102 } });

    expect(result.consume).toBe(true);
    expect(result.view).toMatchObject({ held: true, dragging: true, gesture: "horizontal_scroll" });
    expect(result.effects).toEqual([{ type: "scroll", left: 10 }]);
    expect(subject.value()).toBe(50);
    expect(subject.effects.some((effect) => effect.type === "haptic")).toBe(false);
  });

  it("gives a vertical gesture value ownership without emitting scroll", () => {
    const subject = setup();
    subject.dispatch(start("touch", 40));
    subject.timer.advance(20);

    const result = subject.dispatch({ type: "move", point: { x: 102, y: 60 } });

    expect(result.view.gesture).toBe("confirmed_drag");
    expect(result.effects).toEqual([
      { type: "value", value: 70 },
      { type: "haptic", pulse: "step" },
    ]);
    expect(subject.value()).toBe(70);
    expect(subject.effects.some((effect) => effect.type === "scroll")).toBe(false);
  });

  it("continues from an authoritative external value change during a drag", () => {
    const subject = setup({ value: 50 });
    subject.dispatch(start());
    subject.timer.advance(20);
    expect(
      subject.dispatch({ type: "move", point: { x: 100, y: 80 } }).effects,
    ).toContainEqual({ type: "value", value: 60 });

    subject.setValue(20);
    subject.timer.advance(20);
    const continued = subject.dispatch({
      type: "move",
      point: { x: 100, y: 60 },
    });

    expect(continued.effects).toContainEqual({ type: "value", value: 30 });
    expect(continued.effects).not.toContainEqual({ type: "value", value: 70 });
  });

  it.each(["cancel", "disable", "blur"])(
    "%s cancellation releases capture and makes late events inert",
    (reason) => {
      const subject = setup();
      subject.dispatch(start("touch"));
      subject.dispatch({ type: "move", point: { x: 100, y: 60 } });
      if (reason === "disable") subject.configuration.inert = true;

      const cancelled = subject.dispatch({ type: "cancel" });
      const lateMove = subject.dispatch({ type: "move", point: { x: 100, y: 20 } });
      const lateEnd = subject.dispatch({ type: "end", pointer: "touch" });

      expect(cancelled.effects).toEqual([{ type: "release" }]);
      expect(cancelled.view).toMatchObject({ held: false, dragging: false, gesture: "idle" });
      expect(lateMove.effects).toEqual([]);
      expect(lateEnd.effects).toEqual([]);
    },
  );

  it("disposal clears suppression clocks and keeps all late input inert", () => {
    const subject = setup({ value: false, kind: "boolean" });
    subject.dispatch(start("touch"));
    subject.timer.advance(20);
    subject.dispatch({ type: "end", pointer: "touch" });
    expect(subject.timer.pending()).toBe(1);

    const disposed = subject.interaction.dispose();
    subject.timer.advance(1_000);

    expect(disposed.view.held).toBe(false);
    expect(subject.timer.pending()).toBe(0);
    expect(subject.interaction.dispatch({ type: "click", keyboard: false }).effects).toEqual([]);
  });

  it("clamps, quantizes decimals, and reverses immediately after movement against a bound", () => {
    const subject = setup({ value: 1, min: 0, max: 1, step: 0.1 });
    subject.dispatch(start());
    subject.timer.advance(20);
    expect(subject.dispatch({ type: "move", point: { x: 100, y: -100 } }).effects).toEqual([]);

    subject.timer.advance(20);
    const reversed = subject.dispatch({ type: "move", point: { x: 100, y: -70 } });

    expect(reversed.effects).toContainEqual({ type: "value", value: 0.8 });
    expect(subject.value()).toBe(0.8);
  });

  it("wraps options in both directions and throttles rapid option changes", () => {
    const options = [{ value: "SIN" }, { value: "TRI" }, { value: "SAW" }];
    const forward = setup({ value: "SAW", kind: "options", options });
    forward.dispatch(start());
    forward.timer.advance(20);
    forward.dispatch({ type: "move", point: { x: 100, y: 80 } });
    expect(forward.value()).toBe("SIN");

    forward.timer.advance(50);
    expect(forward.dispatch({ type: "move", point: { x: 100, y: 60 } }).effects).toEqual([]);
    forward.timer.advance(50);
    forward.dispatch({ type: "move", point: { x: 100, y: 40 } });
    expect(forward.value()).toBe("SAW");

    const backward = setup({ value: "SIN", kind: "options", options });
    backward.dispatch(start());
    backward.timer.advance(20);
    backward.dispatch({ type: "move", point: { x: 100, y: 120 } });
    expect(backward.value()).toBe("SAW");
  });

  it("produces one logical activation for touch and synthesized click", () => {
    const subject = setup({ value: false, kind: "boolean" });
    subject.dispatch(start("touch"));
    subject.timer.advance(20);
    const touchEnd = subject.dispatch({ type: "end", pointer: "touch" });
    const synthesized = subject.dispatch({ type: "click", keyboard: false });

    expect(touchEnd.effects).toEqual([
      { type: "value", value: true },
      { type: "haptic", pulse: "tap" },
      { type: "release" },
    ]);
    expect(synthesized.consume).toBe(true);
    expect(synthesized.effects).toEqual([]);
    expect(subject.value()).toBe(true);
    expect(subject.timer.pending()).toBe(0);
  });

  it("does not let a synthesized click bypass touch movement or duration thresholds", () => {
    const moved = setup({ value: false, kind: "boolean" });
    moved.dispatch(start("touch"));
    moved.dispatch({ type: "move", point: { x: 108, y: 108 } });
    const movedEnd = moved.dispatch({ type: "end", pointer: "touch" });
    const movedClick = moved.dispatch({ type: "click", keyboard: false });
    expect(movedEnd.consume).toBe(true);
    expect(movedEnd.effects).toEqual([{ type: "release" }]);
    expect(movedClick.effects).toEqual([]);
    expect(moved.value()).toBe(false);

    const held = setup({ value: false, kind: "boolean" });
    held.dispatch(start("touch"));
    held.timer.advance(200);
    held.dispatch({ type: "end", pointer: "touch" });
    held.dispatch({ type: "click", keyboard: false });
    expect(held.value()).toBe(false);
  });

  it("suppresses clicks that arrive before an active gesture releases", () => {
    const subject = setup({ value: false, kind: "boolean" });
    subject.dispatch(start());
    subject.dispatch({ type: "move", point: { x: 100, y: 70 } });

    const click = subject.dispatch({ type: "click", keyboard: false });

    expect(click.consume).toBe(true);
    expect(click.effects).toEqual([]);
    expect(subject.value()).toBe(true);
  });

  it("keeps keyboard activation independent without disarming a pending pointer click", () => {
    const subject = setup({ value: false, kind: "boolean" });
    subject.dispatch(start("touch"));
    subject.timer.advance(20);
    subject.dispatch({ type: "end", pointer: "touch" });

    const keyboard = subject.dispatch({ type: "click", keyboard: true });
    const synthesized = subject.dispatch({ type: "click", keyboard: false });

    expect(keyboard.effects).toContainEqual({ type: "value", value: false });
    expect(synthesized.effects).toEqual([]);
    expect(subject.value()).toBe(false);
  });

  it("expires drag click suppression so a later real click is not lost", () => {
    const subject = setup({ value: false, kind: "boolean" });
    subject.dispatch(start());
    subject.dispatch({ type: "move", point: { x: 130, y: 100 } });
    subject.dispatch({ type: "end", pointer: "mouse" });
    expect(subject.timer.pending()).toBe(1);

    subject.timer.advance(500);
    const click = subject.dispatch({ type: "click", keyboard: false });

    expect(click.effects).toContainEqual({ type: "value", value: true });
    expect(subject.timer.pending()).toBe(0);
  });
});
