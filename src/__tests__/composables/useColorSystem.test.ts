import { describe, expect, it, vi } from "vitest";

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");

  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

import { ref } from "vue";

Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  writable: true,
  value: vi.fn(() => 1),
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

vi.unmock("@/data");

const dynamicColorConfig = ref({
  isEnabled: true,
  chromaticMapping: false,
  hueAnimationAmplitude: 15,
  animationSpeed: 1,
  saturation: 0.8,
  baseLightness: 0.5,
  lightnessRange: 0.7,
});

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: () => ({
    dynamicColorConfig,
  }),
}));

import { useColorSystem } from "@/composables/useColorSystem";

describe("useColorSystem", () => {
  it("rotates dynamic hues by key and degree count", () => {
    dynamicColorConfig.value.chromaticMapping = false;
    const colorSystem = useColorSystem();

    const cMajorDo = colorSystem.getStaticPrimaryColorByScaleIndex(
      0,
      "major",
      "C",
      3
    );
    const dMajorDo = colorSystem.getStaticPrimaryColorByScaleIndex(
      0,
      "major",
      "D",
      3
    );
    const cPentatonicLa = colorSystem.getStaticPrimaryColorByScaleIndex(
      4,
      "major pentatonic",
      "C",
      3
    );
    const cMajorTi = colorSystem.getStaticPrimaryColorByScaleIndex(
      6,
      "major",
      "C",
      3
    );

    expect(cMajorDo).not.toBe(dMajorDo);
    expect(cPentatonicLa).not.toBe(cMajorTi);
  });

  it("uses static pitch-class colors when chromatic mapping is enabled", () => {
    dynamicColorConfig.value.chromaticMapping = true;
    const colorSystem = useColorSystem();

    const minorBluesSe = colorSystem.getStaticPrimaryColorByScaleIndex(
      3,
      "minor blues",
      "C",
      3
    );
    const chromaticFs = colorSystem.getStaticPrimaryColorByScaleIndex(
      6,
      "chromatic",
      "C",
      3
    );

    expect(minorBluesSe).toBe(chromaticFs);
  });

  it("resolves altered syllables without falling back to the default error color", () => {
    dynamicColorConfig.value.chromaticMapping = false;
    const colorSystem = useColorSystem();

    const fi = colorSystem.getStaticPrimaryColor("Fi", "lydian", 3, "C");
    const se = colorSystem.getStaticPrimaryColor("Se", "minor blues", 3, "C");

    expect(fi).not.toBe("hsla(0, 80%, 50%, 1)");
    expect(se).not.toBe("hsla(0, 80%, 50%, 1)");
  });
});
