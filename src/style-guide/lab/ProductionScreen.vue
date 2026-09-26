<script setup lang="ts">
import LoadingScreen from "@/components/compositions/LoadingScreen.vue";
import type { LabLoadingScreenProps } from "@/types/styleGuide";

/** The accepted Loading Screen, mounted from its real source and fed the lab rehearsal. */
const props = withDefaults(defineProps<LabLoadingScreenProps>(), { still: false });
const emit = defineEmits<{ start: [] }>();
</script>

<template>
  <LoadingScreen
    class="production-screen"
    :class="{ 'production-screen--still': props.still }"
    mode="specimen"
    :progress="percent"
    :stages="stages"
    :phase="phase"
    :message="message"
    :is-complete="ready"
    @start="emit('start')"
  />
</template>

<style scoped>
.production-screen--still,
.production-screen--still :deep(*),
.production-screen--still :deep(*::after) { animation: none !important; transition: none !important; }
.production-screen--still :deep(.converged-loader__completion-action) { opacity: 1; }
.production-screen--still :deep(.converged-loader__lane-bar),
.production-screen--still :deep(.converged-loader__lane-peek) { opacity: 1; transform: none; }
</style>
