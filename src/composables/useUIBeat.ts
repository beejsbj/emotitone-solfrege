import { inject, provide, type InjectionKey } from "vue";

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

interface UIBeatSubscriber {
  listener: UIBeatListener;
  visible: boolean;
  wasPresenting: boolean;
  observer?: IntersectionObserver;
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
      subscriber.observer = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        subscriber.visible = entry.isIntersecting;
        this.deliver(subscriber, true);
      });
      subscriber.observer.observe(element);
    }

    this.subscribers.add(subscriber);
    this.deliver(subscriber, true);

    return () => {
      subscriber.observer?.disconnect();
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
    for (const subscriber of this.subscribers) subscriber.observer?.disconnect();
    this.subscribers.clear();
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

const UI_BEAT_CLOCK: InjectionKey<UIBeatClock> = Symbol("UIBeatClock");

export function provideUIBeatClock(clock: UIBeatClock): void {
  provide(UI_BEAT_CLOCK, clock);
}

export function useUIBeatClock(): UIBeatClock {
  return inject(UI_BEAT_CLOCK, uiBeatClock);
}
