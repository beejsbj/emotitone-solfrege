<script setup lang="ts">
import { provideUIBeat, useUIBeat } from "@/composables/useUIBeat";

/**
 * Guide-only: re-provides the surrounding fixture clock with presentation off,
 * the same seam the app's Visuals-off setting uses. The transport still runs,
 * so every consumer below holds its still downbeat, exactly as under Reduced
 * Motion, without emulating the media query.
 */
const { clock } = useUIBeat();
provideUIBeat({ clock, presentationEnabled: () => false });
</script>

<template>
  <slot />
</template>
