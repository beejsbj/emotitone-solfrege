<template>
  <AnatomyDisplay
    title="Tabs &middot; Chip-Slide Primitive"
    :features="features"
    caption="Chip-slide is the sole tab presentation: a single chip tracks the active label while a dark streak holds the rail together. The source owns the rail, chip, streak, selected and disabled states, equal and scrolling layouts, density, and the shared page-load edition. Explicit specimens stay pinned; the specimen owns explanatory groupings only."
  >
    <template #hero>
      <div class="hero-stage">
        <Tabs v-model="heroValue" :tabs="tabs" aria-label="Hero chip tabs" />
      </div>
    </template>

    <VariantGrid title="Chip Geometry">
      <VariantCell
        v-for="variant in geometryVariants"
        :key="`${variant.geometry}-${variant.tone ?? 'ivory'}`"
        :caption="variant.label"
        stage="ink3"
      >
        <Tabs
          :tabs="shortTabs"
          :default-value="shortTabs[0].value"
          :geometry="variant.geometry"
          :tone="variant.tone"
          :aria-label="`${variant.label} chip tabs`"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Density">
      <VariantCell caption="Comfortable / 4 tabs" stage="ink3">
        <Tabs
          :tabs="tabs"
          default-value="anim"
          aria-label="Comfortable chip tabs"
        />
      </VariantCell>
      <VariantCell caption="Compact / 5 tabs" stage="ink3">
        <Tabs
          :tabs="denseTabs"
          default-value="anim"
          density="compact"
          aria-label="Compact chip tabs"
        />
      </VariantCell>
      <VariantCell caption="Disabled tab" stage="ink3">
        <Tabs
          :tabs="disabledTabs"
          default-value="anim"
          geometry="offcut"
          aria-label="Disabled chip tabs"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Tabs from "../../components/primatives/Tabs.vue";
import type {
  TabItem,
  TabsGeometry,
  TabsTone,
} from "../../components/primatives/Tabs.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface GeometryExample {
  geometry: TabsGeometry;
  tone?: TabsTone;
  label: string;
}

const heroValue = ref("anim");

const tabs: TabItem[] = [
  { label: "Anim", value: "anim" },
  { label: "Freq", value: "freq" },
  { label: "Color", value: "color" },
  { label: "Scope", value: "scope" },
];

const shortTabs: TabItem[] = [
  { label: "Anim", value: "anim" },
  { label: "Freq", value: "freq" },
  { label: "Color", value: "color" },
];

const denseTabs: TabItem[] = [
  ...tabs,
  { label: "Keys", value: "keys" },
];

const disabledTabs: TabItem[] = [
  { label: "Anim", value: "anim" },
  { label: "Freq", value: "freq" },
  { label: "Color", value: "color", disabled: true },
];

const geometryVariants: GeometryExample[] = [
  { geometry: "tab", label: "Tab / clip-tab" },
  { geometry: "offcut", label: "Offcut / clip-offcut" },
  { geometry: "tile", label: "Tile / clip-tile" },
  { geometry: "sharp", label: "Sharp / no clip" },
  { geometry: "rip", label: "Paper rip" },
  { geometry: "tab", tone: "brass", label: "Brass chip" },
];

const features = [
  { label: "Rail", value: "ink-2 shell with ink streak behind all labels" },
  { label: "Chip", value: "sliding active surface measured from the selected tab" },
  { label: "Motion", value: "var(--dur-ui) with ease-swing; smear is transient" },
  { label: "Geometry", value: "tab, offcut, tile, sharp, or paper-rip chip" },
  { label: "Tone", value: "ivory by default; brass is an ink-and-ivory instrument-metal treatment" },
  { label: "Density", value: "comfortable or compact label rhythm" },
  { label: "Layout", value: "equal-width or horizontally scrolling without changing the chip mechanic" },
  { label: "Edition", value: "one guide variant shared by every unpinned Tabs instance per page load" },
  { label: "State", value: "selected and disabled are source-owned tab states" },
  { label: "Boundary", value: "TabsContent retains content coordination; Tabs owns all presentation" },
];
</script>

<style scoped>
.hero-stage {
  width: min(100%, 420px);
  padding: 0 18px;
}
</style>
