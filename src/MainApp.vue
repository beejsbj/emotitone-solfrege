<template>
  <div id="app" class="min-h-screen">
    <LoadingSplash />
    <SaveFailureNotice />

    <div v-if="!isLoading" class="relative isolate">
      <!-- Unmounted (not hidden) when Visuals is off, so its animation loop ends. -->
      <UnifiedVisualEffects v-if="visualConfigStore.visualsEnabled" class="z-0" />
    </div>

    <ConfigPanel v-if="!isLoading" />
    <InstrumentSelector v-if="!isLoading" :compact="true" :floating="true" />

    <div v-if="!isLoading" class="pointer-events-none relative z-50 min-h-screen flex flex-col">
      <PerformanceDeck />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppLoading } from "@/composables/useAppLoading";
import { useMidiControls } from "@/composables/useMidiControls";
import { provideUIBeat, uiBeatClock } from "@/composables/useUIBeat";
import ConfigPanel from "@/components/ConfigPanel.vue";
import PerformanceDeck from "@/components/PerformanceDeck.vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import LoadingSplash from "@/components/LoadingSplash.vue";
import SaveFailureNotice from "@/components/ui/SaveFailureNotice.vue";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";

useMusicStore();
usePhrasesStore();
const visualConfigStore = useVisualConfigStore();
provideUIBeat({
  clock: uiBeatClock,
  presentationEnabled: () =>
    visualConfigStore.visualsEnabled && visualConfigStore.config.uiBeat.isEnabled,
});
const { isLoading } = useAppLoading();
useMidiControls();
</script>
