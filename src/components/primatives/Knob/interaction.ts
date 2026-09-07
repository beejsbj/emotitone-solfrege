import type { InjectionKey } from "vue";
import type {
  KnobGestureState,
  KnobInteraction,
  KnobInteractionClock,
  KnobInteractionContact,
  KnobInteractionConfiguration,
  KnobInteractionEffect,
  KnobInteractionEvent,
  KnobInteractionOutcome,
  KnobInteractionPoint,
  KnobInteractionValue,
  KnobPointerKind,
  KnobScrollContext,
} from "@/types/knobInteraction";

const HORIZONTAL_DOMINANCE = 1.15;
const VERTICAL_DOMINANCE = 1.05;
const BOOLEAN_TOGGLE_THRESHOLD = 15;
const OPTION_CYCLE_THRESHOLD = 15;
const OPTION_CYCLE_INTERVAL = 100;
const HAPTIC_INTERVAL = 50;
const COMPATIBILITY_CLICK_WINDOW = 500;

const systemClock: KnobInteractionClock = {
  now: () => Date.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: (handle) => clearTimeout(handle),
};

export const knobScrollContextKey: InjectionKey<KnobScrollContext> = Symbol(
  "knob-scroll-context",
);

export function createKnobInteraction(
  readConfiguration: () => KnobInteractionConfiguration,
  clock: KnobInteractionClock = systemClock,
): KnobInteraction {
  let disposed = false;
  let held = false;
  let dragging = false;
  let gesture: KnobGestureState = "idle";
  let pointer: KnobPointerKind | null = null;
  let activeContactId: number | null = null;
  let startPoint: KnobInteractionPoint = { x: 0, y: 0 };
  let point: KnobInteractionPoint = { x: 0, y: 0 };
  let startTime = 0;
  let totalMovement = 0;
  let velocity = 0;
  let startScrollLeft: number | null = null;
  let workingValue: KnobInteractionValue = 0;
  let valueAccumulator = 0;
  let optionAccumulator = 0;
  let lastOptionChange: number | undefined;
  let lastHaptic: number | undefined;
  let movementBuffer: Array<{ y: number; time: number }> = [];
  let suppressPointerClick = false;
  let suppressionTimer: ReturnType<typeof setTimeout> | undefined;

  const view = () => ({
    held,
    dragging,
    gesture,
    point: { ...point },
  });

  const outcome = (
    effects: KnobInteractionEffect[] = [],
    consume = false,
  ): KnobInteractionOutcome => ({ effects, consume, view: view() });

  const clearClickSuppression = () => {
    suppressPointerClick = false;
    if (suppressionTimer !== undefined) {
      clock.cancel(suppressionTimer);
      suppressionTimer = undefined;
    }
  };

  const armClickSuppression = () => {
    clearClickSuppression();
    suppressPointerClick = true;
    suppressionTimer = clock.schedule(() => {
      suppressPointerClick = false;
      suppressionTimer = undefined;
    }, COMPATIBILITY_CLICK_WINDOW);
  };

  const resetGesture = () => {
    held = false;
    dragging = false;
    gesture = "idle";
    pointer = null;
    activeContactId = null;
    valueAccumulator = 0;
    optionAccumulator = 0;
    lastOptionChange = undefined;
    movementBuffer = [];
    totalMovement = 0;
    velocity = 0;
    startScrollLeft = null;
  };

  const cancel = () => {
    const effects: KnobInteractionEffect[] = held ? [{ type: "release" }] : [];
    clearClickSuppression();
    resetGesture();
    return outcome(effects);
  };

  const hapticEffect = (now: number): KnobInteractionEffect[] => {
    if (lastHaptic === undefined || now - lastHaptic >= HAPTIC_INTERVAL) {
      lastHaptic = now;
      return [{ type: "haptic", pulse: "step" }];
    }
    return [];
  };

  const valueEffect = (
    value: KnobInteractionValue,
    now: number,
  ): KnobInteractionEffect[] => {
    if (value === workingValue) return [];
    workingValue = value;
    return [{ type: "value", value }, ...hapticEffect(now)];
  };

  const reconcileValue = (configuration: KnobInteractionConfiguration) => {
    if (configuration.value === workingValue) return;

    // A caller may replace the model while a gesture is active (automation,
    // reset, preset, normalization, or rejection). The controlled value stays
    // authoritative; equality naturally acknowledges the module's last effect.
    workingValue = configuration.value;
    valueAccumulator = 0;
    optionAccumulator = 0;
    lastOptionChange = undefined;
  };

  const optionIndex = (
    options: readonly { value: string | number }[],
    value: KnobInteractionValue,
  ) => options.findIndex((option) => option.value === value);

  const tapEffects = (
    configuration: KnobInteractionConfiguration,
  ): KnobInteractionEffect[] => {
    let nextValue: KnobInteractionValue;
    if (configuration.kind === "boolean") {
      nextValue = !Boolean(workingValue);
    } else if (
      configuration.kind === "options" &&
      configuration.options.length > 0
    ) {
      const currentIndex = optionIndex(configuration.options, workingValue);
      const nextIndex = (currentIndex + 1) % configuration.options.length;
      nextValue = configuration.options[nextIndex].value;
    } else {
      return [];
    }

    if (nextValue === workingValue) return [];
    workingValue = nextValue;
    return [
      { type: "value", value: nextValue },
      { type: "haptic", pulse: "tap" },
    ];
  };

  const decimalPlaces = (value: number) => {
    const text = String(value).toLowerCase();
    if (text.includes("e-")) {
      const [coefficient, exponent] = text.split("e-");
      return Number(exponent) + (coefficient.split(".")[1]?.length ?? 0);
    }
    return text.split(".")[1]?.length ?? 0;
  };

  const quantize = (value: number, min: number, max: number, step: number) => {
    const clamped = Math.max(min, Math.min(max, value));
    if (step <= 0) return clamped;
    const stepped = min + Math.round((clamped - min) / step) * step;
    const precision = Math.min(12, Math.max(decimalPlaces(min), decimalPlaces(step)));
    return Math.max(min, Math.min(max, Number(stepped.toFixed(precision))));
  };

  const rangeEffects = (
    configuration: KnobInteractionConfiguration,
    deltaY: number,
    now: number,
  ) => {
    const range = configuration.max - configuration.min;
    let sensitivity = configuration.sensitivity * 0.25;
    if (range < 1) sensitivity *= 0.4;
    else if (range > 100) sensitivity *= 1.2;

    const velocityFactor = Math.min(Math.abs(velocity) * 0.02, 0.3);
    const rawChange = deltaY * sensitivity * (1 + velocityFactor) * range * 0.4;
    valueAccumulator += rawChange;

    const threshold = configuration.step > 0 ? configuration.step * 0.6 : 0;
    if (Math.abs(valueAccumulator) < threshold) return [];

    const current = Number(workingValue);
    const next = quantize(
      current + valueAccumulator,
      configuration.min,
      configuration.max,
      configuration.step,
    );

    // Discard movement consumed against a bound. Retaining it makes reversing
    // direction feel stuck until the entire out-of-range distance is repaid.
    valueAccumulator = 0;
    return valueEffect(next, now);
  };

  const booleanEffects = (deltaY: number, now: number) => {
    if (Math.abs(deltaY) < BOOLEAN_TOGGLE_THRESHOLD) return [];
    return valueEffect(deltaY > 0, now);
  };

  const optionsEffects = (
    configuration: KnobInteractionConfiguration,
    deltaY: number,
    now: number,
  ) => {
    const options = configuration.options;
    if (options.length === 0) return [];
    optionAccumulator += deltaY;
    if (Math.abs(optionAccumulator) < OPTION_CYCLE_THRESHOLD) return [];
    if (
      lastOptionChange !== undefined &&
      now - lastOptionChange < OPTION_CYCLE_INTERVAL
    ) {
      return [];
    }

    const currentIndex = optionIndex(options, workingValue);
    const direction = optionAccumulator > 0 ? 1 : -1;
    const steps = Math.floor(
      Math.abs(optionAccumulator) / OPTION_CYCLE_THRESHOLD,
    );
    const nextIndex =
      (currentIndex + direction * steps + options.length * (steps + 1)) %
      options.length;
    optionAccumulator = 0;

    const effects = valueEffect(options[nextIndex].value, now);
    if (effects.some((effect) => effect.type === "value")) {
      lastOptionChange = now;
    }
    return effects;
  };

  const start = (
    event: Extract<KnobInteractionEvent, { type: "start" }>,
  ) => {
    const configuration = readConfiguration();
    if (
      configuration.inert ||
      held ||
      (event.pointer === "mouse" && event.button !== undefined && event.button !== 0)
    ) {
      return outcome();
    }

    const effects: KnobInteractionEffect[] = held ? [{ type: "release" }] : [];
    clearClickSuppression();
    held = true;
    dragging = false;
    gesture = "potential_tap";
    pointer = event.pointer;
    activeContactId = event.contact.id;
    startPoint = { ...event.contact.point };
    point = { ...event.contact.point };
    startTime = clock.now();
    totalMovement = 0;
    velocity = 0;
    startScrollLeft = event.scrollLeft;
    workingValue = configuration.value;
    valueAccumulator = 0;
    optionAccumulator = 0;
    lastOptionChange = undefined;
    movementBuffer = [];
    effects.push({ type: "capture", pointer: event.pointer });
    return outcome(effects, true);
  };

  const move = (event: Extract<KnobInteractionEvent, { type: "move" }>) => {
    const configuration = readConfiguration();
    if (!held) return outcome();
    if (configuration.inert) return cancel();
    reconcileValue(configuration);

    const activeContact = event.contacts.find(
      (contact: KnobInteractionContact) => contact.id === activeContactId,
    );
    if (!activeContact) return outcome();

    const now = clock.now();
    const previousY = point.y;
    const deltaY = previousY - activeContact.point.y;
    const deltaFromStartX = activeContact.point.x - startPoint.x;
    const deltaFromStartY = activeContact.point.y - startPoint.y;
    point = { ...activeContact.point };
    totalMovement = Math.hypot(deltaFromStartX, deltaFromStartY);

    movementBuffer.push({ y: point.y, time: now });
    if (movementBuffer.length > 5) movementBuffer.shift();
    if (movementBuffer.length >= 2) {
      const previous = movementBuffer[movementBuffer.length - 2];
      const recent = movementBuffer[movementBuffer.length - 1];
      const elapsed = recent.time - previous.time;
      if (elapsed > 0) velocity = (previous.y - recent.y) / elapsed;
    }

    if (gesture === "potential_tap" && totalMovement > configuration.tapThreshold) {
      const absX = Math.abs(deltaFromStartX);
      const absY = Math.abs(deltaFromStartY);
      if (absX > absY * HORIZONTAL_DOMINANCE) {
        gesture = "horizontal_scroll";
        dragging = true;
      } else if (absY > absX * VERTICAL_DOMINANCE) {
        gesture = "confirmed_drag";
        dragging = true;
      } else {
        return outcome();
      }
    }

    if (gesture === "horizontal_scroll") {
      const effects: KnobInteractionEffect[] = [];
      if (startScrollLeft !== null) {
        effects.push({
          type: "scroll",
          left: startScrollLeft - deltaFromStartX,
        });
      }
      return outcome(effects, true);
    }
    if (gesture !== "confirmed_drag") return outcome();

    if (configuration.kind === "range") {
      return outcome(rangeEffects(configuration, deltaY, now), true);
    }
    if (configuration.kind === "boolean") {
      return outcome(booleanEffects(deltaY, now), true);
    }
    return outcome(optionsEffects(configuration, deltaY, now), true);
  };

  const end = (event: Extract<KnobInteractionEvent, { type: "end" }>) => {
    if (!held || pointer !== event.pointer) return outcome();
    if (
      event.pointer === "touch" &&
      (activeContactId === null ||
        !event.endedContactIds.includes(activeContactId))
    ) {
      return outcome();
    }
    if (event.cancelled) return cancel();
    const configuration = readConfiguration();
    if (configuration.inert) return cancel();
    reconcileValue(configuration);

    const now = clock.now();
    const consume =
      gesture !== "potential_tap" ||
      totalMovement > configuration.tapThreshold;
    const effects: KnobInteractionEffect[] = [];
    const isTouchTap =
      event.pointer === "touch" &&
      gesture === "potential_tap" &&
      now - startTime < configuration.tapDuration &&
      totalMovement <= configuration.tapThreshold;
    if (isTouchTap) {
      effects.push(...tapEffects(configuration));
    }
    if (event.pointer === "touch") {
      // A touch sequence may synthesize a later click whether or not it met
      // the tap thresholds. Keep that compatibility click from bypassing the
      // movement and duration decisions made here.
      armClickSuppression();
    } else if (consume) {
      armClickSuppression();
    }

    resetGesture();
    effects.push({ type: "release" });
    return outcome(effects, consume);
  };

  const click = (event: Extract<KnobInteractionEvent, { type: "click" }>) => {
    const configuration = readConfiguration();
    if (configuration.inert) return outcome();
    if (held) return outcome([], true);
    if (suppressPointerClick && !event.keyboard) {
      clearClickSuppression();
      return outcome([], true);
    }

    if (!event.keyboard) clearClickSuppression();
    workingValue = configuration.value;
    return outcome(tapEffects(configuration), true);
  };

  return {
    dispatch(event) {
      if (disposed) return outcome();
      if (event.type === "start") return start(event);
      if (event.type === "move") return move(event);
      if (event.type === "end") return end(event);
      if (event.type === "click") return click(event);
      return cancel();
    },
    dispose() {
      if (disposed) return outcome();
      const result = cancel();
      disposed = true;
      return result;
    },
  };
}
