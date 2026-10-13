import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { effectScope, isReactive, nextTick, watchEffect } from "vue";
import { useStringRenderer } from "@/composables/canvas/useStringRenderer";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";

describe("string simulation", () => {
  let pinia: ReturnType<typeof createPinia>;
  let scope: ReturnType<typeof effectScope>;
  let renderer: ReturnType<typeof useStringRenderer>;
  let music: ReturnType<typeof useMusicStore>;
  const stringConfig = { ...DEFAULT_CONFIG.strings, isEnabled: true };
  const animationConfig = DEFAULT_CONFIG.animation;

  beforeEach(() => {
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
    scope = effectScope();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    scope.run(() => {
      const visualConfig = useVisualConfigStore();
      visualConfig.useEphemeralDefaults();
      visualConfig.config.keyboard.mainOctave = 4;
      visualConfig.config.keyboard.rowCount = 3;
      music = useMusicStore();
      renderer = useStringRenderer(() => false);
      renderer.initializeStrings(stringConfig, 390, 600, music.solfegeData);
    });
  });

  afterEach(() => {
    renderer.clearAllStrings();
    renderer.removeEventListeners();
    scope.stop();
    disposePinia(pinia);
    vi.restoreAllMocks();
  });

  function play(degree = 0, noteId = "held") {
    renderer.handleNotePlayed(new CustomEvent("note-played", {
      detail: {
        noteId, solfegeIndex: degree, octave: 4,
        frequency: music.getNoteFrequency(degree, 4),
        mode: "major", key: "C",
      },
    }));
  }

  function update() {
    renderer.updateStringProperties(stringConfig, animationConfig, music, {
      envelope: 0.75, hasSignal: true,
    }, false, [], 1 / 60);
  }

  it("keeps the simulation collection and its per-frame objects outside deep reactivity", () => {
    play();
    update();
    expect(renderer.strings.value).toHaveLength(21);
    expect(isReactive(renderer.strings.value)).toBe(false);
    expect(renderer.strings.value.every(string => !isReactive(string))).toBe(true);
    expect(renderer.getActiveStringCount()).toBe(1);
  });

  it("publishes completed frames, release, reinitialization and clearing to reactive readers", async () => {
    let observed = { count: 0, active: 0, amplitude: 0 };
    const stop = scope.run(() => watchEffect(() => {
      observed = {
        count: renderer.strings.value.length,
        active: renderer.getActiveStringCount(),
        amplitude: renderer.strings.value.find(s => s.noteIndex === 0 && s.octave === 4)?.amplitude ?? 0,
      };
    }))!;
    expect(observed).toEqual({ count: 21, active: 0, amplitude: 0 });

    play();
    update();
    await nextTick();
    expect(observed.active).toBe(1);
    expect(observed.amplitude).toBeGreaterThan(0);
    const previousAmplitude = observed.amplitude;
    update();
    await nextTick();
    expect(observed.amplitude).toBeGreaterThan(previousAmplitude);
    const amplitudeBeforeRelease = observed.amplitude;

    renderer.handleNoteReleased(new CustomEvent("note-released", { detail: { noteId: "held" } }));
    update();
    await nextTick();
    expect(observed.active).toBe(0);
    expect(observed.amplitude).toBeLessThan(amplitudeBeforeRelease);

    renderer.initializeStrings(stringConfig, 390, 600, music.solfegeData.slice(0, 2));
    await nextTick();
    expect(observed).toEqual({ count: 6, active: 0, amplitude: 0 });
    renderer.clearAllStrings();
    await nextTick();
    expect(observed).toEqual({ count: 0, active: 0, amplitude: 0 });
    expect(renderer.hasPendingAnimation(stringConfig)).toBe(false);
    stop();
  });

  // Opt-in measurement: no timing threshold and no extra benchmark work in CI.
  if (process.env.BJS516_STRING_BENCH === "1") {
    it("measures a fixed 21-string frame update with three sustained activations", () => {
      [0, 2, 4].forEach(degree => play(degree, `held-${degree}`));
      for (let frame = 0; frame < 1_000; frame++) update();
      const framesPerBatch = 2_000;
      const samplesMs: number[] = [];
      for (let batch = 0; batch < 9; batch++) {
        const start = performance.now();
        for (let frame = 0; frame < framesPerBatch; frame++) update();
        samplesMs.push((performance.now() - start) / framesPerBatch);
      }
      expect(renderer.getActiveStringCount()).toBe(3);
      expect(renderer.strings.value).toHaveLength(21);

      // Fingerprint the actual drawing commands and state outside the timed loop.
      const drawing: unknown[] = [];
      const ctx = {
        canvas: { width: 390, height: 600 },
        globalAlpha: 1, strokeStyle: "", lineWidth: 0, shadowColor: "", shadowBlur: 0,
        beginPath() { drawing.push([this.globalAlpha, this.strokeStyle, this.lineWidth]); },
        moveTo(x: number, y: number) { drawing.push(["move", x, y]); },
        lineTo(x: number, y: number) { drawing.push(["line", x, y]); },
        stroke() { drawing.push(["stroke", this.shadowColor, this.shadowBlur]); },
      };
      renderer.renderStrings(ctx as unknown as CanvasRenderingContext2D, 5, 600);
      const fingerprint = createHash("sha256")
        .update(JSON.stringify({ strings: renderer.strings.value, drawing })).digest("hex");
      console.info(JSON.stringify({
        scene: "C major, 390x600, 21 strings, 3 held event notes, envelope 0.75, 60 Hz delta",
        warmupFrames: 1_000, framesPerBatch, batches: samplesMs.length,
        samplesMs, medianMs: [...samplesMs].sort((a, b) => a - b)[4], fingerprint,
      }));
    }, 30_000);
  }
});
