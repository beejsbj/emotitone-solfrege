<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import TopDrawer from "./TopDrawer.vue";
import MidiSettingsIcon from "./primatives/MidiSettingsIcon.vue";
import LazyPanelLoading from "./LazyPanelLoading.vue";
import LazyPanelError from "./LazyPanelError.vue";
import { useConfigMidiStatus } from "@/composables/useConfigMidiStatus";

const loadPanel = () => import("./ConfigPanel.vue");
const ConfigPanel = defineAsyncComponent({ loader: loadPanel, loadingComponent: LazyPanelLoading, errorComponent: LazyPanelError });
const preload = () => { void loadPanel().catch(() => { /* Opening retries via the async component. */ }); };
const drawerContentHeight = ref<number>();
const { midiStatusState, midiTriggerLabel } = useConfigMidiStatus();
</script>

<template>
  <TopDrawer
    anchor="top-right"
    :content-height="drawerContentHeight"
    :aria-label="midiTriggerLabel"
    handle-test-id="config-panel-trigger"
    @intent="preload"
  >
    <template #icon>
      <span class="flex" :title="midiTriggerLabel"><MidiSettingsIcon :state="midiStatusState" /></span>
    </template>
    <template #panel="{ close }">
      <ConfigPanel embedded :close="close" @content-height="drawerContentHeight = $event" />
    </template>
  </TopDrawer>
</template>
