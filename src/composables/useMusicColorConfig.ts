import { getCurrentInstance, inject, provide, type Ref } from "vue";
import type { DynamicColorConfig } from "@/types";
import { useVisualConfig } from "@/composables/useVisualConfig";

const MUSIC_COLOR_CONFIG = Symbol("music-color-config");

export function provideMusicColorConfig(config: Ref<DynamicColorConfig>) {
  provide(MUSIC_COLOR_CONFIG, config);
}

export function useMusicColorConfig(): Readonly<Ref<DynamicColorConfig>> {
  const provided = getCurrentInstance()
    ? inject<Ref<DynamicColorConfig> | null>(MUSIC_COLOR_CONFIG, null)
    : null;
  return provided ?? useVisualConfig().dynamicColorConfig;
}
