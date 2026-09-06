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
.midi-settings-icon { --midi-led: #5e5e5e; }
.midi-settings-icon--connected { --midi-led: #d7d7d7; --midi-glow: rgb(215 215 215 / 45%); }
.midi-settings-icon--connecting { --midi-led: #bdbdbd; --midi-glow: rgb(189 189 189 / 55%); }
.midi-settings-icon--error { --midi-led: #8a8a8a; --midi-glow: rgb(138 138 138 / 45%); }
.midi-settings-icon:not(.midi-settings-icon--idle) { filter: drop-shadow(0 0 5px var(--midi-glow)); }
.midi-settings-icon :deep(circle) { fill: var(--midi-led); stroke: var(--midi-led); }
@media (forced-colors: active) {
  .midi-settings-icon:not(.midi-settings-icon--idle) { filter: none; }
  .midi-settings-icon :deep(circle) { fill: ButtonText; stroke: ButtonText; }
}
</style>
