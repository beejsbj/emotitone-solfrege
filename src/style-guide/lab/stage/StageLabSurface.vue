<script setup lang="ts">
import { ref, toRef, watch } from "vue";
import { useStageHostLayout } from "@/composables/useStageHostLayout";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { StageLabGeometryDirection, StageLabStageDirection } from "@/types/stageLab";
import type { StageLabConductor } from "./labConductor";
import { useStageLabLoop } from "./useStageLabLoop";

/*
 * A direction's Stage surface. Mounted inside its own app and Pinia by the
 * frame, like the real specimen, so production renderers read ephemeral
 * canonical configuration and never touch saved settings.
 */
const props = defineProps<{
  stage: StageLabStageDirection;
  geometry: StageLabGeometryDirection;
  mode: "merge" | "web";
  conductor: StageLabConductor;
}>();

const back = ref<HTMLCanvasElement | null>(null);
const middle = ref<HTMLCanvasElement | null>(null);
const front = ref<HTMLCanvasElement | null>(null);
const visualConfig = useVisualConfigStore();
visualConfig.useEphemeralDefaults();
const mode = toRef(props, "mode");
watch(mode, (value) => { visualConfig.config.blobs.connectionMode = value; }, { immediate: true });

const { usableRect, reducedMotion } = useStageHostLayout(back);
useStageLabLoop({ back, middle, front }, {
  stage: props.stage,
  geometry: props.geometry,
  mode,
  conductor: props.conductor,
  usableRect,
  reducedMotion,
});
</script>

<template>
  <div class="stage-lab-surface" aria-hidden="true">
    <canvas ref="back" />
    <canvas ref="middle" />
    <canvas ref="front" />
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
