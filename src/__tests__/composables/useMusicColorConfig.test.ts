import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

const rootConfig = {};
const dynamicColorConfig = ref({
  recipeVersion: 1 as const,
  musicColorMode: "movable-ordinal" as const,
  hueMotionEnabled: true,
  animationSpeed: 1,
  chroma: 0.18,
  lightnessCenter: 0.575,
  lightnessSpan: 0.6,
});

vi.mock("@/composables/useVisualConfig", () => ({
  useVisualConfig: () => ({ rootConfig, config: rootConfig, dynamicColorConfig }),
}));

import { useMusicColorProvider } from "@/composables/useMusicColorConfig";

describe("useMusicColorProvider", () => {
  it("keeps the production clock key stable when the color config is replaced", () => {
    const first = useMusicColorProvider();
    dynamicColorConfig.value = {
      ...dynamicColorConfig.value,
      animationSpeed: 2,
    };
    const second = useMusicColorProvider();

    expect(first.clockKey).toBe(rootConfig);
    expect(second.clockKey).toBe(first.clockKey);
    expect(first.config.value.animationSpeed).toBe(2);
  });
});
