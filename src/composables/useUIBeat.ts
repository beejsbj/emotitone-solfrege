import {
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  watch,
  type InjectionKey,
  type Ref,
} from "vue";

export type UIBeatStatus = "idle" | "arming" | "running" | "unavailable";

export interface UIBeatMeter {
  beatsPerBar: number;
  beatUnit: number;
}

export interface UIBeatRun {
  mappingAvailable: boolean;
  bpm?: number;
  meter?: UIBeatMeter;
}

export interface UIBeatFrame {
  rawPosition: number;
  barPosition?: number;
}

export interface UIBeatSnapshot {
  generation: number;
  status: UIBeatStatus;
  mappingAvailable: boolean;
  rawPosition: number | null;
  barPosition: number | null;
  barIndex: number | null;
  beatIndex: number | null;
  beatPhase: number;
  bpm: number | null;
  meter: UIBeatMeter | null;
  presenting: boolean;
}

export type UIBeatListener = (snapshot: UIBeatSnapshot) => void;

export interface UIBeatScaleOptions {
  restScale?: number;
  peakScale?: number;
  downbeatPeakScale?: number;
}

export interface UIBeatProvider {
  clock: UIBeatClock;
  presentationEnabled: () => boolean;
}

interface UIBeatSubscriber {
  listener: UIBeatListener;
  visible: boolean;
  wasPresenting: boolean;
  element?: Element;
}

export interface UIBeatClockOptions {
  reducedMotion?: () => boolean;
  documentVisible?: () => boolean;
  observeEnvironment?: boolean;
}

const idleSnapshot = (generation: number): UIBeatSnapshot => ({
  generation,
  status: "idle",
  mappingAvailable: false,
  rawPosition: null,
  barPosition: null,
  barIndex: null,
  beatIndex: null,
  beatPhase: 0,
  bpm: null,
  meter: null,
  presenting: false,
});

const validMeter = (meter: UIBeatMeter | undefined): meter is UIBeatMeter =>
  Boolean(
    meter &&
    Number.isInteger(meter.beatsPerBar) &&
    meter.beatsPerBar > 0 &&
    Number.isInteger(meter.beatUnit) &&
    meter.beatUnit > 0,
  );

const runtimeReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const runtimeDocumentVisible = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

const modulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

/**
 * Canonical UIBeat scale contour, normalized to 0..1 for consumer-owned
 * amplitude. It preserves the retired BeatingShapes rhythm: compact on the
 * boundary, a fast swell at 14%, a long settling body, then a late tuck.
 */
export function uiBeatScaleSwell(beatPhase: number): number {
  const phase = Math.max(0, Math.min(1, Number(beatPhase) || 0));

  if (phase < 0.14) {
    return easeOutCubic(phase / 0.14);
  }

  if (phase < 0.96) {
    const release = easeOutCubic((phase - 0.14) / 0.82);
    return 1 - release / 3;
  }

  return Math.max(0, (2 / 3) * (1 - (phase - 0.96) / 0.04));
}

const validScale = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;

const scaleBindings = new WeakSet<HTMLElement>();

/**
 * Binds UIBeat's shared swell directly to any real DOM element. The CSS
 * individual `scale` property composes with component-owned `transform`
 * gestures, so beat motion does not erase press, drag, tilt, or rebound.
 */
export function bindUIBeatScale(
  clock: UIBeatClock,
  element: HTMLElement,
  options: UIBeatScaleOptions = {},
): () => void {
  if (scaleBindings.has(element)) {
    throw new Error("UIBeat scale already has an owner for this element");
  }
  scaleBindings.add(element);

  const restScale = validScale(options.restScale, 0.8);
  const peakScale = validScale(options.peakScale, 1.1);
  const downbeatPeakScale = validScale(
    options.downbeatPeakScale,
    peakScale,
  );
  const previousScale = element.style.getPropertyValue("scale");
  const previousScalePriority = element.style.getPropertyPriority("scale");
  const previousState = element.getAttribute("data-ui-beat-state");
  const previousBinding = element.getAttribute("data-ui-beat-scale");

  element.setAttribute("data-ui-beat-scale", "");

  const unsubscribe = clock.subscribe((snapshot) => {
    if (!snapshot.presenting) {
      element.setAttribute("data-ui-beat-state", "idle");
      element.style.setProperty("scale", "1");
      return;
    }

    const swell = uiBeatScaleSwell(snapshot.beatPhase);
    const peak = snapshot.beatIndex === 0
      ? downbeatPeakScale
      : peakScale;
    const scale = restScale + swell * (peak - restScale);

    element.setAttribute("data-ui-beat-state", "running");
    element.style.setProperty("scale", scale.toFixed(3));
  }, element);

  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    scaleBindings.delete(element);

    if (previousScale) {
      element.style.setProperty(
        "scale",
        previousScale,
        previousScalePriority,
      );
    }
    else element.style.removeProperty("scale");

    if (previousState === null) element.removeAttribute("data-ui-beat-state");
    else element.setAttribute("data-ui-beat-state", previousState);

    if (previousBinding === null) element.removeAttribute("data-ui-beat-scale");
    else element.setAttribute("data-ui-beat-scale", previousBinding);
  };
}

/**
 * Converts Strudel's scheduler cycles into cycles of a generated bar pattern.
 * This mapping is valid only when the adapter knows the sounding pattern was
 * generated with `.cpm(bpm / beatsPerBar)`.
 */
export function generatedStrudelBarPosition(
  rawCycle: number,
  bpm: number,
  beatsPerBar: number,
  schedulerCps: number,
): number | null {
  if (
    !Number.isFinite(rawCycle) ||
    !Number.isFinite(bpm) ||
    bpm <= 0 ||
    !Number.isInteger(beatsPerBar) ||
    beatsPerBar <= 0 ||
    !Number.isFinite(schedulerCps) ||
    schedulerCps <= 0
  ) {
    return null;
  }

  const generatedBarCps = bpm / beatsPerBar / 60;
  return rawCycle * generatedBarCps / schedulerCps;
}

/**
 * One UIBeat clock owns transport state and fan-out. Production publishes
 * Strudel frames into the singleton; guide specimens inject an isolated clock.
 */
export class UIBeatClock {
  private state = idleSnapshot(0);
  private subscribers = new Set<UIBeatSubscriber>();
  private visibilityObserver?: IntersectionObserver;
  private subscribersByElement = new Map<Element, Set<UIBeatSubscriber>>();
  private readonly reducedMotion: () => boolean;
  private readonly documentVisible: () => boolean;
  private mediaQuery?: MediaQueryList;
  private readonly handleMotionPreference = () => this.refreshPresentation();
  private readonly handleVisibility = () => {
    if (!this.documentVisible() || this.state.status !== "running") {
      this.refreshPresentation();
    }
  };

  constructor(options: UIBeatClockOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? runtimeReducedMotion;
    this.documentVisible = options.documentVisible ?? runtimeDocumentVisible;

    if (options.observeEnvironment === false || typeof window === "undefined") {
      return;
    }

    this.mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.mediaQuery?.addEventListener?.("change", this.handleMotionPreference);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibility);
    }
  }

  get snapshot(): UIBeatSnapshot {
    return this.presentedSnapshot(true);
  }

  arm(run: UIBeatRun): number {
    const generation = this.state.generation + 1;
    const mappingAvailable =
      run.mappingAvailable &&
      Number.isFinite(run.bpm) &&
      Number(run.bpm) > 0 &&
      validMeter(run.meter);

    this.state = {
      generation,
      status: "arming",
      mappingAvailable,
      rawPosition: null,
      barPosition: null,
      barIndex: null,
      beatIndex: null,
      beatPhase: 0,
      bpm: mappingAvailable ? Number(run.bpm) : null,
      meter: mappingAvailable ? { ...run.meter! } : null,
      presenting: false,
    };
    this.notify(true);
    return generation;
  }

  publish(generation: number, frame: UIBeatFrame): boolean {
    if (
      generation !== this.state.generation ||
      this.state.status === "idle" ||
      !Number.isFinite(frame.rawPosition)
    ) {
      return false;
    }

    if (
      !this.state.mappingAvailable ||
      !this.state.meter ||
      !Number.isFinite(frame.barPosition)
    ) {
      this.state = {
        ...this.state,
        status: "unavailable",
        rawPosition: frame.rawPosition,
        barPosition: null,
        barIndex: null,
        beatIndex: null,
        beatPhase: 0,
        presenting: false,
      };
      this.notify();
      return true;
    }

    const barPosition = Math.max(0, Number(frame.barPosition));
    const absoluteBeat = barPosition * this.state.meter.beatsPerBar;
    this.state = {
      ...this.state,
      status: "running",
      rawPosition: frame.rawPosition,
      barPosition,
      barIndex: Math.floor(barPosition),
      beatIndex: Math.floor(modulo(absoluteBeat, this.state.meter.beatsPerBar)),
      beatPhase: modulo(absoluteBeat, 1),
      presenting: false,
    };
    this.notify();
    return true;
  }

  retime(generation: number, bpm: number): boolean {
    if (
      generation !== this.state.generation ||
      this.state.status === "idle" ||
      !this.state.mappingAvailable ||
      !this.state.meter ||
      !Number.isFinite(bpm) ||
      bpm <= 0
    ) {
      return false;
    }

    this.state = {
      ...this.state,
      bpm,
    };
    this.notify(true);
    return true;
  }

  suspend(generation: number): boolean {
    if (
      generation !== this.state.generation ||
      this.state.status === "idle"
    ) {
      return false;
    }

    this.state = {
      ...this.state,
      status: "arming",
      rawPosition: null,
      barPosition: null,
      barIndex: null,
      beatIndex: null,
      beatPhase: 0,
      presenting: false,
    };
    this.notify(true);
    return true;
  }

  stop(generation?: number): boolean {
    if (generation !== undefined && generation !== this.state.generation) {
      return false;
    }

    this.state = idleSnapshot(this.state.generation + 1);
    this.notify(true);
    return true;
  }

  subscribe(listener: UIBeatListener, element?: Element | null): () => void {
    const subscriber: UIBeatSubscriber = {
      listener,
      visible: true,
      wasPresenting: false,
    };

    if (element && typeof IntersectionObserver !== "undefined") {
      this.observeSubscriber(subscriber, element);
    }

    this.subscribers.add(subscriber);
    this.deliver(subscriber, true);

    return () => {
      this.unobserveSubscriber(subscriber);
      this.subscribers.delete(subscriber);
    };
  }

  refreshPresentation(): void {
    this.notify(true);
  }

  destroy(): void {
    this.mediaQuery?.removeEventListener?.("change", this.handleMotionPreference);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = undefined;
    this.subscribersByElement.clear();
    this.subscribers.clear();
  }

  private observeSubscriber(
    subscriber: UIBeatSubscriber,
    element: Element,
  ): void {
    this.visibilityObserver ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        for (const observed of this.subscribersByElement.get(entry.target) ?? []) {
          observed.visible = entry.isIntersecting;
          this.deliver(observed, true);
        }
      }
    });

    const observed = this.subscribersByElement.get(element) ?? new Set();
    if (observed.size === 0) this.visibilityObserver.observe(element);
    observed.add(subscriber);
    this.subscribersByElement.set(element, observed);
    subscriber.element = element;
  }

  private unobserveSubscriber(subscriber: UIBeatSubscriber): void {
    const element = subscriber.element;
    if (!element) return;

    const observed = this.subscribersByElement.get(element);
    observed?.delete(subscriber);
    if (observed?.size === 0) {
      this.visibilityObserver?.unobserve(element);
      this.subscribersByElement.delete(element);
    }
    subscriber.element = undefined;
  }

  private presentedSnapshot(surfaceVisible: boolean): UIBeatSnapshot {
    const presenting =
      surfaceVisible &&
      this.state.status === "running" &&
      this.state.mappingAvailable &&
      this.documentVisible() &&
      !this.reducedMotion();
    return { ...this.state, presenting };
  }

  private deliver(subscriber: UIBeatSubscriber, force = false): void {
    const snapshot = this.presentedSnapshot(subscriber.visible);
    if (!force && !snapshot.presenting && !subscriber.wasPresenting) return;
    subscriber.listener(snapshot);
    subscriber.wasPresenting = snapshot.presenting;
  }

  private notify(force = false): void {
    for (const subscriber of this.subscribers) {
      this.deliver(subscriber, force);
    }
  }
}

export const uiBeatClock = new UIBeatClock();

const UI_BEAT_PROVIDER: InjectionKey<UIBeatProvider> = Symbol("UIBeatProvider");
const DEFAULT_UI_BEAT_PROVIDER: UIBeatProvider = {
  clock: uiBeatClock,
  presentationEnabled: () => true,
};

export function provideUIBeat(provider: UIBeatProvider): void {
  provide(UI_BEAT_PROVIDER, provider);
}

export function useUIBeat(): UIBeatProvider {
  return inject(UI_BEAT_PROVIDER, DEFAULT_UI_BEAT_PROVIDER);
}

/**
 * Vue lifecycle wrapper for the general DOM binding. Consumers opt their real
 * UI element in; disabling or unmounting restores its pre-binding scale.
 */
export function useUIBeatScale(
  element: Ref<HTMLElement | null | undefined>,
  enabled: () => boolean,
  options: UIBeatScaleOptions = {},
): void {
  const provider = useUIBeat();
  const presentationEnabled = () => enabled() && provider.presentationEnabled();
  let dispose: (() => void) | undefined;

  const syncBinding = (
    target = element.value,
    shouldBind = presentationEnabled(),
  ) => {
    dispose?.();
    dispose = undefined;
    if (target && shouldBind) {
      dispose = bindUIBeatScale(provider.clock, target, options);
    }
  };

  watch(
    [element, presentationEnabled],
    ([target, shouldBind]) => syncBinding(target, shouldBind),
    { flush: "post" },
  );

  onMounted(() => syncBinding());
  onBeforeUnmount(() => dispose?.());
}
