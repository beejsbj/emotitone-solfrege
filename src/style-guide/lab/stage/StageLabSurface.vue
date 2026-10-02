<script setup lang="ts">
import { ref, toRef, watch } from "vue";
import { useStageHostLayout } from "@/composables/useStageHostLayout";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { StageLabSelection, StageLabUnitId } from "@/types/stageLab";
import type { StageLabConductor } from "./labConductor";
import { useStageLabLoop } from "./useStageLabLoop";

/*
 * A lab Stage surface: one canvas per Stage part, back to front. Mounted in
 * its own app and Pinia by the frame, like the real specimen, so production
 * renderers read ephemeral canonical configuration and never touch saved
 * settings.
 */
const props = defineProps<{
  selection: StageLabSelection;
  mode: "merge" | "web";
  /** Muted or un-soloed parts keep painting so they rejoin mid-motion; they are only not shown. */
  hidden?: readonly StageLabUnitId[];
  conductor: StageLabConductor;
}>();
const shown = (unit: StageLabUnitId) => (props.hidden?.includes(unit) ? { visibility: "hidden" as const } : undefined);

const canvases = {
  atmosphere: ref<HTMLCanvasElement | null>(null),
  strings: ref<HTMLCanvasElement | null>(null),
  scope: ref<HTMLCanvasElement | null>(null),
  bodies: ref<HTMLCanvasElement | null>(null),
  flecks: ref<HTMLCanvasElement | null>(null),
  lettering: ref<HTMLCanvasElement | null>(null),
};
const { atmosphere, strings, scope, bodies, flecks, lettering } = canvases;
const visualConfig = useVisualConfigStore();
visualConfig.useEphemeralDefaults();
const mode = toRef(props, "mode");
watch(mode, (value) => { visualConfig.config.blobs.connectionMode = value; }, { immediate: true });

const { usableRect, reducedMotion } = useStageHostLayout(atmosphere);
useStageLabLoop(canvases, {
  selection: props.selection,
  mode,
  conductor: props.conductor,
  usableRect,
  reducedMotion,
});
</script>

<template>
  <div class="stage-lab-surface" aria-hidden="true">
    <canvas ref="atmosphere" :style="shown('atmosphere')" />
    <canvas ref="strings" :style="shown('strings')" />
    <canvas ref="scope" :style="shown('scope')" />
    <canvas ref="bodies" :style="shown('bodies')" />
    <canvas ref="flecks" :style="shown('flecks')" />
    <canvas ref="lettering" :style="shown('lettering')" />
  </div>
</template>

<style scoped>
.stage-lab-surface {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.stage-lab-surface canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
