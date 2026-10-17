import { createCanvas } from "@napi-rs/canvas";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: () => ({ getPrimaryColor: () => "#fff" }),
}));
vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({ getActiveNotes: () => [], solfegeData: [], currentMode: "major", currentKey: "C" }),
}));

import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useHilbertScopeRenderer } from "@/composables/canvas/useHilbertScopeRenderer";
import { resolveStageComposition } from "@/composables/canvas/stageRuntime";

const renderers: ReturnType<typeof useHilbertScopeRenderer>[] = [];
afterEach(() => {
  for (const renderer of renderers.splice(0)) renderer.cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function scope(historyAmount: number, smear: number, dpr = 1, waveform = false) {
  vi.stubGlobal("devicePixelRatio", dpr);
  const history = createCanvas(100, 100);
  const swap = createCanvas(100, 100);
  const main = createCanvas(100, 100);
  const surfaces = [history, swap];
  const create = vi.spyOn(document, "createElement").mockImplementation(() => surfaces.shift()! as unknown as HTMLCanvasElement);
  const renderer = useHilbertScopeRenderer();
  renderers.push(renderer);
  const config = { ...DEFAULT_CONFIG.hilbertScope, history: historyAmount, smear, glowEnabled: false, scaleInDuration: 0.1 };
  let analyserIndex = 0;
  const context = {
    sampleRate: 48000,
    createAnalyser: () => {
      const phase = analyserIndex++ * Math.PI / 2;
      return {
        connect() {}, disconnect() {},
        getFloatTimeDomainData(data: Float32Array) {
          for (let i = 0; i < data.length; i++) data[i] = Math.sin(i / data.length * Math.PI * 2 + phase);
        },
      };
    },
    createBuffer: () => ({ copyToChannel() {} }),
    createConvolver: () => ({ connect() {}, disconnect() {} }),
    createDelay: () => ({ connect() {}, disconnect() {}, delayTime: { value: 0 } }),
  };
  await renderer.initializeHilbertScope(100, 100, config, waveform
    ? { context, connect() {}, disconnect() {} } as unknown as AudioNode : undefined);
  create.mockRestore();
  const draw = (envelope: number, dt: number, composition?: ReturnType<typeof resolveStageComposition>, reducedMotion = false) => {
    main.getContext("2d").clearRect(0, 0, 100, 100);
    renderer.renderHilbertScope(main.getContext("2d") as unknown as CanvasRenderingContext2D,
      0, config, 100, 100, composition, { envelope, hasSignal: envelope > 0 }, reducedMotion, [], dt);
  };
  const pixels = () => history.getContext("2d").getImageData(0, 0, history.width, history.height).data;
  const peakAlpha = () => {
    let peak = 0;
    const data = pixels();
    for (let i = 3; i < data.length; i += 4) peak = Math.max(peak, data[i]);
    return peak;
  };
  const seed = (uniform = true) => {
    draw(1, 0);
    const ctx = history.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(uniform ? 0 : 35, uniform ? 0 : 35, uniform ? 100 : 30, uniform ? 100 : 30);
  };
  return { renderer, config, history, draw, pixels, peakAlpha, seed };
}

function expectEqualRaster(first: Uint8ClampedArray, second: Uint8ClampedArray, tolerance = 1) {
  expect(first.length).toBe(second.length);
  let difference = 0;
  for (let i = 0; i < first.length; i++) difference = Math.max(difference, Math.abs(first[i] - second[i]));
  expect(difference).toBeLessThanOrEqual(tolerance);
}

describe("Scope trail raster and idle lifetime", () => {
  it.each([
    ["Luminous", 0.82, 0.6],
    ["maximum Trail", 0.95, 1],
    ["maximum history with a balanced direct/smear release", 0.95, 0.025],
  ] as const)("%s decays equally at 60/120 Hz and never clears visible residue", async (_name, history, smear) => {
    const results = [];
    for (const hz of [60, 120]) {
      const view = await scope(history, smear);
      view.seed();
      let before = view.peakAlpha();
      let quarterSecond = 0;
      let oneSecond = 0;
      let frames = 0;
      while (view.renderer.hasPendingAnimation() && frames < hz * 4) {
        before = view.peakAlpha();
        view.draw(0, 1 / hz);
        frames++;
        if (frames === hz / 4) quarterSecond = view.peakAlpha();
        if (frames === hz) oneSecond = view.peakAlpha();
        if (view.peakAlpha() > 1) expect(view.renderer.hasPendingAnimation()).toBe(true);
      }
      expect(view.renderer.hasPendingAnimation()).toBe(false);
      expect(before).toBeLessThanOrEqual(1);
      expect(view.peakAlpha()).toBe(0);
      results.push({ quarterSecond, oneSecond, stopTime: frames / hz });
    }
    expect(Math.abs(results[0].quarterSecond - results[1].quarterSecond)).toBeLessThanOrEqual(1);
    expect(Math.abs(results[0].oneSecond - results[1].oneSecond)).toBeLessThanOrEqual(1);
    expect(Math.abs(results[0].stopTime - results[1].stopTime)).toBeLessThanOrEqual(1 / 60);
  });

  it.each([1, 2])("fades and smears a localized raster by elapsed time at DPR %s", async dpr => {
    const rasters = [];
    // The third clock alternates long/short frames, with the same elapsed second.
    for (const steps of [Array(60).fill(1 / 60), Array(120).fill(1 / 120), Array.from({ length: 60 }, (_, i) => i % 2 ? 1 / 120 : 1 / 40)]) {
      const view = await scope(0.95, 1, dpr);
      view.seed(false);
      for (const dt of steps) view.draw(0, dt);
      expect(view.renderer.hasPendingAnimation()).toBe(true);
      rasters.push(view.pixels());
    }
    expectEqualRaster(rasters[0], rasters[1]);
    expectEqualRaster(rasters[0], rasters[2]);
  });

  it("does not consume or brighten trail pixels when no time passes", async () => {
    const view = await scope(0.95, 1);
    view.seed(false);
    const original = view.pixels();
    for (let i = 0; i < 10; i++) view.draw(0, 0);
    expectEqualRaster(original, view.pixels(), 0);
  });

  it("deposits a held waveform with equal raster brightness at 60/120 Hz", async () => {
    const brightness = [];
    for (const hz of [60, 120]) {
      const view = await scope(0.95, 1, 1, true);
      for (let i = 0; i < hz * 3; i++) view.draw(1, 1 / hz);
      const data = view.pixels();
      let total = 0;
      for (let i = 3; i < data.length; i += 4) total += data[i];
      brightness.push(total);
    }
    expect(Math.abs(brightness[0] - brightness[1]) / Math.max(...brightness)).toBeLessThan(0.02);
  });

  it("retains the release snapshot through a layout shift and resets it on wake", async () => {
    const view = await scope(0.95, 0);
    view.seed(false);
    view.draw(0, 0.1);
    const shifted = resolveStageComposition({ x: 10, y: 0, width: 100, height: 100 }, 10, 0.65);
    view.draw(0, 0, shifted);
    expect(view.history.getContext("2d").getImageData(40, 50, 1, 1).data[3]).toBe(0);
    const shiftedAlpha = view.history.getContext("2d").getImageData(60, 50, 1, 1).data[3];
    view.draw(0, 0, shifted);
    expect(view.history.getContext("2d").getImageData(60, 50, 1, 1).data[3]).toBe(shiftedAlpha);
    view.draw(1, 1 / 60, shifted);
    // Simulate a fresh opaque waveform region after wake; old release age must not apply.
    view.history.getContext("2d").fillRect(45, 35, 30, 30);
    view.draw(0, 1 / 60, shifted);
    expect(view.peakAlpha()).toBeGreaterThan(240);
  });

  it.each(["clear", "resize", "reduced motion"] as const)("%s discards the release snapshot", async action => {
    const view = await scope(0.95, 1);
    view.seed(false);
    view.draw(0, 0.1);
    if (action === "clear") view.renderer.clearHistory();
    if (action === "resize") view.renderer.resizeHilbertScope(100, 100, view.config);
    if (action === "reduced motion") view.draw(0, 1 / 60, undefined, true);
    view.draw(0, 1 / 60);
    expect(view.peakAlpha()).toBe(0);
    expect(view.renderer.hasPendingAnimation()).toBe(false);
  });
});
