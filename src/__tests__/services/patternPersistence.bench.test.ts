import { describe, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePhrasesStore } from "@/stores/phrases";
import { serializePatternsState } from "@/services/patternPersistence";

describe("pattern persistence benchmark", () => {
  it("compares native and optimized JSON on a 512-note reactive Pinia state", () => {
    setActivePinia(createPinia());
    const store = usePhrasesStore();
    store.take.notes.push(...Array.from({ length: 512 }, (_, index) => ({
      id: `note-${index}`, note: "C4", scaleDegree: 1, scaleIndex: 0,
      octave: 4, frequency: 261.63, velocity: 0.8,
      pressTime: index * 500, releaseTime: index * 500 + 300, duration: 300,
    })));
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
      noteCount: store.takeNotes.length,
    }));
    store.removeEventListeners();
  });
});
