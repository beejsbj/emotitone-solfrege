import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useLooperRenderer } from "@/composables/canvas/useLooperRenderer";
import {
  NULL_LOOPER_STAGE_SOURCE,
  looperPhase,
  looperTurnMs,
  type LooperStageMember,
  type LooperStageSource,
} from "@/composables/canvas/looperStageSource";
import type { StageComposition } from "@/composables/canvas/stageRuntime";
import type { LooperConfig } from "@/types/visual";

type Call = [string, ...unknown[]];

/** A 2D context that records what reaches the canvas. */
function recordingContext(canvas: HTMLCanvasElement) {
  const log: Call[] = [];
  const gradient = { addColorStop: () => undefined };
  let alpha = 1;
  const ctx = {
    canvas,
    log,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    globalCompositeOperation: "source-over",
    fillStyle: "",
    save: () => log.push(["save"]),
    restore: () => log.push(["restore"]),
    translate: (...args: unknown[]) => log.push(["translate", ...args]),
    rotate: (...args: unknown[]) => log.push(["rotate", ...args]),
    setTransform: (...args: unknown[]) => log.push(["setTransform", ...args]),
    drawImage: (_image: unknown, ...args: unknown[]) => log.push(["drawImage", ...args]),
    fillRect: () => undefined,
    clearRect: () => undefined,
    putImageData: () => undefined,
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createConicGradient: () => gradient,
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
  };
  Object.defineProperty(ctx, "globalAlpha", {
    get: () => alpha,
    set: (value: number) => {
      alpha = value;
      log.push(["alpha", value]);
    },
  });
  return ctx as typeof ctx & CanvasRenderingContext2D & { log: Call[] };
}

const composition: StageComposition = {
  usable: { x: 0, y: 0, width: 390, height: 600 },
  centerX: 195,
  centerY: 300,
  hilbertRadius: 60,
  orbitRadiusX: 150,
  orbitRadiusY: 250,
  blobFitScale: 1,
  suspended: false,
};

const members: readonly LooperStageMember[] = [
  {
    id: "bass",
    bars: 2,
    audible: true,
    notes: [
      { note: "C3", pressTime: 0, duration: 1200 },
      { note: "G2", pressTime: 2500, duration: 1200 },
    ],
  },
  {
    id: "tune",
    bars: 4,
    audible: true,
    notes: [
      { note: "E4", pressTime: 0, duration: 600 },
      { note: "G4", pressTime: 5000, duration: 900 },
    ],
  },
];

function scriptedSource(position: { ms: number }, running = true): LooperStageSource {
  return {
    members,
    bpm: 96,
    running,
    positionMs: () => position.ms,
    heldNotes: () => [],
    pendingNotes: () => [],
  };
}

const config = (overrides: Partial<LooperConfig> = {}): LooperConfig => ({
  ...DEFAULT_CONFIG.looper,
  ...overrides,
});

describe("Looper Stage seam", () => {
  it("is empty and still without a Looper", () => {
    expect(NULL_LOOPER_STAGE_SOURCE.members).toHaveLength(0);
    expect(NULL_LOOPER_STAGE_SOURCE.running).toBe(false);
    expect(NULL_LOOPER_STAGE_SOURCE.heldNotes()).toHaveLength(0);
    expect(NULL_LOOPER_STAGE_SOURCE.pendingNotes()).toBe(NULL_LOOPER_STAGE_SOURCE.pendingNotes());
    expect(looperTurnMs(NULL_LOOPER_STAGE_SOURCE)).toBe(0);
  });

  it("takes one turn from the longest member and wraps phase into it", () => {
    // 96 bpm: one bar is 2500ms, and the 4-bar member sets the turn.
    expect(looperTurnMs({ members, bpm: 96 })).toBe(10_000);
    expect(looperPhase(12_500, 10_000)).toBe(0.25);
    expect(looperPhase(-2_500, 10_000)).toBe(0.75);
    expect(looperPhase(100, 0)).toBe(0);
  });
});

describe("Looper Stage part", () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    setActivePinia(createPinia());
    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement) {
      return recordingContext(this);
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  const frame = (
    render: ReturnType<typeof useLooperRenderer>["renderLooper"],
    source: LooperStageSource,
    options: { reducedMotion?: boolean; now?: number; looper?: LooperConfig } = {},
  ) => {
    const ctx = recordingContext(document.createElement("canvas"));
    render(
      ctx,
      options.looper ?? config(),
      composition,
      source,
      "C",
      "major",
      options.reducedMotion ?? false,
      options.now ?? 1000,
    );
    return ctx.log;
  };

  it("leaves the canvas untouched when no loop is running", () => {
    const { renderLooper } = useLooperRenderer();
    expect(frame(renderLooper, NULL_LOOPER_STAGE_SOURCE)).toEqual([]);
    expect(frame(renderLooper, scriptedSource({ ms: 0 }, false))).toEqual([]);
  });

  it("paints every note's light while a loop runs", () => {
    const { renderLooper } = useLooperRenderer();
    const log = frame(renderLooper, scriptedSource({ ms: 1000 }), { reducedMotion: true });
    const draws = log.filter(([name]) => name === "drawImage");
    // Reduced Motion has no front; each note draws arc pieces and a head,
    // and the upscaled wash lands last.
    expect(draws.length).toBeGreaterThan(members.length * 2);
    expect(log[0]).toEqual(["save"]);
    expect(log.at(-1)).toEqual(["restore"]);
    expect(log.some(([name]) => name === "rotate")).toBe(false);
  });

  it("turns the front with the loop's phase once present", () => {
    const { renderLooper } = useLooperRenderer();
    const position = { ms: 0 };
    const source = scriptedSource(position);
    for (let now = 16; now < 2000; now += 16) frame(renderLooper, source, { now });
    position.ms = 2500;
    const log = frame(renderLooper, source, { now: 2016 });
    const rotate = log.find(([name]) => name === "rotate");
    // A quarter of the way through a 10s turn, clockwise from twelve.
    expect(rotate?.[1]).toBeCloseTo(0);
  });

  it("holds completely still under Reduced Motion while the loop turns", () => {
    const { renderLooper } = useLooperRenderer();
    const position = { ms: 100 };
    const source = scriptedSource(position);
    const first = frame(renderLooper, source, { reducedMotion: true, now: 1000 });
    position.ms = 3100;
    const later = frame(renderLooper, source, { reducedMotion: true, now: 4000 });
    expect(later).toEqual(first);

    const live = useLooperRenderer().renderLooper;
    const settle = (ms: number, now: number) => {
      position.ms = ms;
      return frame(live, source, { now });
    };
    for (let now = 16; now < 2000; now += 16) settle(100, now);
    expect(settle(3100, 2016)).not.toEqual(settle(100, 2032));
  });

  it("paints nothing at zero Strength or while the Stage is suspended", () => {
    const { renderLooper } = useLooperRenderer();
    const source = scriptedSource({ ms: 0 });
    expect(frame(renderLooper, source, {
      reducedMotion: true,
      looper: config({ strength: 0, isEnabled: false }),
    })).toEqual([]);
    const ctx = recordingContext(document.createElement("canvas"));
    renderLooper(ctx, config(), { ...composition, suspended: true }, source, "C", "major", true, 1);
    expect(ctx.log).toEqual([]);
  });

  it("draws held and pending notes live on the outer orbit", () => {
    const { renderLooper } = useLooperRenderer();
    const quiet = frame(renderLooper, scriptedSource({ ms: 0 }), { reducedMotion: true });
    const pending = [{ note: "A4", pressTime: 7000, duration: 400 }];
    const playing: LooperStageSource = {
      ...scriptedSource({ ms: 0 }),
      heldNotes: () => [{ note: "B4", pressTime: 8000, duration: 300 }],
      pendingNotes: () => pending,
    };
    const live = frame(renderLooper, playing, { reducedMotion: true });
    expect(live.filter(([name]) => name === "drawImage").length)
      .toBeGreaterThan(quiet.filter(([name]) => name === "drawImage").length);
  });
});
