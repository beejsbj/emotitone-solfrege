<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import TopDrawer from "./TopDrawer.vue";
import LazyPanelLoading from "./LazyPanelLoading.vue";
import LazyPanelError from "./LazyPanelError.vue";
import { useInstrumentStore } from "@/stores/instrument";
import { displayInstrumentName } from "@/data/instruments";
import { instrumentIconFor } from "./primatives/instrumentIcon";

defineProps<{ compact?: boolean; floating?: boolean }>();

const loadPanel = () => import("./InstrumentSelector.vue");
const InstrumentSelector = defineAsyncComponent({ loader: loadPanel, loadingComponent: LazyPanelLoading, errorComponent: LazyPanelError });
const preload = () => { void loadPanel().catch(() => { /* Opening retries via the async component. */ }); };
const drawerContentHeight = ref<number>();
const drawer = ref<InstanceType<typeof TopDrawer> | null>(null);
const instrumentStore = useInstrumentStore();
const instrumentIcon = computed(() => instrumentIconFor(instrumentStore.currentInstrument));
</script>

<template>
  <TopDrawer
    ref="drawer"
    anchor="top-left"
    :content-height="drawerContentHeight"
    aria-label="Instrument"
    :handle-label="displayInstrumentName(instrumentStore.currentInstrument)"
    handle-test-id="instrument-selector-trigger"
    @intent="preload"
  >
    <template v-if="instrumentIcon" #icon><component :is="instrumentIcon" /></template>
    <template #panel="{ close }">
      <InstrumentSelector
        embedded
        :compact="compact"
        :floating="floating"
        :close="close"
        :drawer-session="drawer ?? undefined"
        @content-height="drawerContentHeight = $event"
      />
    </template>
  </TopDrawer>
</template>
