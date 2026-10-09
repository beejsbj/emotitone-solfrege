<script setup lang="ts">
import { Settings } from "lucide-vue-next";

withDefaults(defineProps<{
  state?: "idle" | "connecting" | "connected" | "error";
}>(), { state: "idle" });
</script>

<template>
  <Settings
    aria-hidden="true"
    class="midi-settings-icon"
    :class="[
      `midi-settings-icon--${state}`,
      { 'animate-pulse motion-reduce:animate-none': state === 'connecting' },
    ]"
  />
</template>

<style scoped>
/* The gear's centre is a status LED: dim Ivory when off, Ivory while connecting,
   Brass when a controller is live (the instrument-metal "on"), Tomato on error. */
.midi-settings-icon { --midi-led: var(--ivory-4); }
.midi-settings-icon--connecting { --midi-led: var(--ivory-2); --midi-glow: color-mix(in srgb, var(--ivory-2) 55%, transparent); }
.midi-settings-icon--connected { --midi-led: var(--brass); --midi-glow: color-mix(in srgb, var(--brass) 45%, transparent); }
.midi-settings-icon--error { --midi-led: var(--tomato); --midi-glow: color-mix(in srgb, var(--tomato) 45%, transparent); }
.midi-settings-icon:not(.midi-settings-icon--idle) { filter: drop-shadow(0 0 5px var(--midi-glow)); }
.midi-settings-icon :deep(circle) { fill: var(--midi-led); stroke: var(--midi-led); }
@media (forced-colors: active) {
  .midi-settings-icon:not(.midi-settings-icon--idle) { filter: none; }
  .midi-settings-icon :deep(circle) { fill: ButtonText; stroke: ButtonText; }
}
</style>
