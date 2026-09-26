<template>
  <GuideShell :active-layer="activeLayer">
    <TabsPage v-if="page === 'tabs'" />
    <InstrumentPickerPage v-else-if="page === 'instrument-picker'" />
    <ConfigMenuPage v-else-if="page === 'config-menu'" />
    <PatternReelPage v-else-if="page === 'pattern-reel'" />
    <StagePage v-else-if="page === 'stage'" />
    <PerformanceDeckPage v-else-if="page === 'performance-deck'" />
    <GuideLayerPage v-else-if="layer" :key="layer.id" :layer="layer" />
    <GuideIndex v-else />
  </GuideShell>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted } from "vue";
import type { GuideLayerId } from "@/types/styleGuide";
import "./preview-card.css";
import "./shell/guide-paper.css";
import { guideLayer } from "./guideCatalog";
import GuideShell from "./shell/GuideShell.vue";
import GuideIndex from "./shell/GuideIndex.vue";
import GuideLayerPage from "./shell/GuideLayerPage.vue";

type FocusedPage = "tabs" | "instrument-picker" | "config-menu" | "pattern-reel" | "stage" | "performance-deck";

const props = defineProps<{
  page?: FocusedPage | GuideLayerId;
}>();

const FOCUSED_PAGE_LAYERS: Record<FocusedPage, GuideLayerId> = {
  tabs: "primitives",
  "pattern-reel": "compounds",
  "instrument-picker": "compositions",
  "config-menu": "compositions",
  stage: "compositions",
  "performance-deck": "compositions",
};

const layer = computed(() => (props.page ? guideLayer(props.page as GuideLayerId) : undefined));
const activeLayer = computed<GuideLayerId | undefined>(() => {
  if (!props.page) return undefined;
  if (layer.value) return layer.value.id;
  return FOCUSED_PAGE_LAYERS[props.page as FocusedPage];
});

const TabsPage = defineAsyncComponent(() => import("./TabsPage.vue"));
const InstrumentPickerPage = defineAsyncComponent(() => import("./InstrumentPickerPage.vue"));
const ConfigMenuPage = defineAsyncComponent(() => import("./ConfigMenuPage.vue"));
const PatternReelPage = defineAsyncComponent(() => import("./PatternReelPage.vue"));
const StagePage = defineAsyncComponent(() => import("./StagePage.vue"));
const PerformanceDeckPage = defineAsyncComponent(() => import("./PerformanceDeckPage.vue"));

// Unit specimens load asynchronously, so retry the hash target briefly.
const scrollToHash = async () => {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  await nextTick();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView();
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
};

onMounted(() => {
  void scrollToHash();
  window.addEventListener("hashchange", scrollToHash);
});

onBeforeUnmount(() => window.removeEventListener("hashchange", scrollToHash));
</script>
