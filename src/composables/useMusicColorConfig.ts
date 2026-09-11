import { getCurrentInstance, inject, provide, type Ref } from "vue";
import type { DynamicColorConfig } from "@/types";
import { useVisualConfig } from "@/composables/useVisualConfig";

const MUSIC_COLOR_CONFIG = Symbol("music-color-config");

interface MusicColorProvider {
  config: Readonly<Ref<DynamicColorConfig>>;
  clockKey: object;
}

export function provideMusicColorConfig(config: Ref<DynamicColorConfig>) {
  provide<MusicColorProvider>(MUSIC_COLOR_CONFIG, {
    config,
    clockKey: config,
  });
}

export function useMusicColorProvider(): MusicColorProvider {
  const provided = getCurrentInstance()
    ? inject<MusicColorProvider | null>(MUSIC_COLOR_CONFIG, null)
    : null;
  if (provided) return provided;

  const visualConfig = useVisualConfig();
  return {
    config: visualConfig.dynamicColorConfig,
    clockKey: visualConfig.config ?? visualConfig.dynamicColorConfig,
  };
}

export function useMusicColorConfig(): Readonly<Ref<DynamicColorConfig>> {
  return useMusicColorProvider().config;
}
