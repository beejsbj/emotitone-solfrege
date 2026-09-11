<template>
  <div id="app" class="min-h-screen">
    <LoadingSplash />

    <div v-if="!isLoading" class="relative isolate">
      <UnifiedVisualEffects class="z-0" />
    </div>

    <ConfigPanel v-if="!isLoading" />
    <InstrumentSelector v-if="!isLoading" :compact="true" :floating="true" />

    <div v-if="!isLoading" class="pointer-events-none relative z-50 min-h-screen flex flex-col">
      <PerformanceDeck />
    </div>

    <TooltipRenderer
      :tooltip-state="globalTooltip.tooltipState.value"
      :rotation="globalTooltip.rotation.value"
      :translation="globalTooltip.translation.value"
    />
  </div>
</template>

<script setup lang="ts">
import { useAppLoading } from "@/composables/useAppLoading";
import { useMidiControls } from "@/composables/useMidiControls";
import ConfigPanel from "@/components/ConfigPanel.vue";
import PerformanceDeck from "@/components/PerformanceDeck.vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import LoadingSplash from "@/components/LoadingSplash.vue";
import TooltipRenderer from "@/components/TooltipRenderer.vue";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import { globalTooltip } from "@/directives/tooltip";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";

useMusicStore();
usePatternsStore();
const { isLoading } = useAppLoading();
useMidiControls();
</script>
