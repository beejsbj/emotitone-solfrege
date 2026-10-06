<template>
  <div ref="mountPoint" class="looper-specimen-canvas" data-testid="looper-specimen-canvas" />
</template>

<script setup lang="ts">
import {
  createApp,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type App,
} from "vue";
import { createPinia, disposePinia, type Pinia } from "pinia";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { readStageControls, type StageControlId } from "@/services/stageAppearance";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { LooperStageSource } from "@/composables/canvas/looperStageSource";
import type { StageAudioFeatures } from "@/services/stageAudio";

/**
 * The production Stage, isolated, fed a scripted Looper. Solo silences every
 * other Stage part through its own public control, so the strip shows only
 * the Looper; off, the Looper turns over the idle Stage it lives in.
 */
const props = defineProps<{
  source: LooperStageSource;
  strength: number;
  definition: number;
  spread: number;
  solo: boolean;
}>();

/** The other parts' public controls, and the values that silence them. */
const SILENCED: ReadonlyArray<readonly [StageControlId, number | boolean]> = [
  ["atmosphereStrength", 0],
  ["scopeStrength", 0],
  ["stringPresence", 0],
  ["bodiesVisible", false],
  ["fleckAmount", 0],
];

const mountPoint = ref<HTMLElement | null>(null);
let specimenApp: App<Element> | null = null;
let specimenPinia: Pinia | null = null;
// No sound: the Looper reads only its source, and the rest of the Stage idles.
const silence: StageAudioFeatures = {
  initialize: () => null,
  sample: () => ({ envelope: 0, hasSignal: false }),
  cleanup: () => undefined,
};
const noteEvents = new EventTarget();

onMounted(() => {
  if (!mountPoint.value) return;
  specimenPinia = createPinia();
  const canonical = readStageControls(DEFAULT_CONFIG);

  specimenApp = createApp(defineComponent({
    name: "IsolatedLooperSpecimen",
    setup() {
      const visualConfig = useVisualConfigStore();
      visualConfig.useEphemeralDefaults();

      watch(
        () => [props.strength, props.definition, props.spread] as const,
        ([strength, definition, spread]) => {
          visualConfig.updateStageControl("looperStrength", strength);
          visualConfig.updateStageControl("looperDefinition", definition);
          visualConfig.updateStageControl("looperSpread", spread);
        },
        { immediate: true },
      );
      watch(
        () => props.solo,
        (solo) => {
          for (const [control, silent] of SILENCED) {
            visualConfig.updateStageControl(control, solo ? silent : canonical[control]);
          }
        },
        { immediate: true },
      );

      return () => h(UnifiedVisualEffects, {
        audioFeatures: silence,
        activeNotes: [],
        eventTarget: noteEvents,
        looperSource: props.source,
      });
    },
  }));
  specimenApp.use(specimenPinia);
  specimenApp.mount(mountPoint.value);
});

onBeforeUnmount(() => {
  specimenApp?.unmount();
  specimenApp = null;
  if (specimenPinia) disposePinia(specimenPinia);
  specimenPinia = null;
});
</script>

<style scoped>
/* The Looper is playing-zone light: judge it on the Stage's Ink. */
.looper-specimen-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: var(--ink);
  pointer-events: none;
}
</style>
