import { describe, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePatternsStore } from "@/stores/patterns";
import { serializePatternsState } from "@/services/patternPersistence";

describe("pattern persistence benchmark", () => {
  it("compares legacy and optimized JSON on a 512-note reactive Pinia state", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = usePatternsStore();
    store.loggedNotes = Array.from({ length: 512 }, (_, index) => ({
      id: `note-${index}`, note: "C4", key: "C", mode: "major", scaleDegree: 1,
      scaleIndex: 0, solfege: { name: "Do", number: 1, emotion: "curious", description: "Bright forward motion", texture: "glossy" },
      octave: 4, frequency: 261.63, instrument: "piano", bpm: 120, velocity: 0.8,
      pressTime: index * 500, releaseTime: index * 500 + 300, duration: 300,
      sessionId: "bench", isStartingNewPattern: index === 0,
    }));

    for (let i = 0; i < 10; i++) {
      JSON.stringify(store.$state);
      serializePatternsState(store.$state);
    }
    const iterations = 50;
    const legacyStart = performance.now();
    for (let i = 0; i < iterations; i++) JSON.stringify(store.$state);
    const legacyMs = performance.now() - legacyStart;
    const optimizedStart = performance.now();
    for (let i = 0; i < iterations; i++) serializePatternsState(store.$state);
    const optimizedMs = performance.now() - optimizedStart;
    const stateSize = JSON.stringify(store.$state).length;
    console.info(JSON.stringify({
      iterations,
      legacyMs: Number(legacyMs.toFixed(2)),
      optimizedMs: Number(optimizedMs.toFixed(2)),
      improvementPercent: Number(((1 - optimizedMs / legacyMs) * 100).toFixed(1)),
      stateSizeBytes: stateSize,
      noteCount: store.loggedNotes.length,
    }));
  });
});
