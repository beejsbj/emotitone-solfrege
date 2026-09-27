<script setup lang="ts">
import { ref, type Component } from "vue";
import type { TabItem } from "@/components/primatives/Tabs.vue";
import LabCell from "../LabCell.vue";

/**
 * The real destinations Tabs serves: the four-tab specimen, Instrument
 * Picker's Brass Shape destination, Config's eight-destination scroll rail,
 * and a disabled tab. `pinned` passes production's explicit edition props.
 */
defineProps<{ component: Component; pinned?: Record<string, string> }>();

const four: TabItem[] = [
  { label: "Anim", value: "anim" },
  { label: "Freq", value: "freq" },
  { label: "Color", value: "color" },
  { label: "Scope", value: "scope" },
];
const picker: TabItem[] = [
  { label: "Shape", value: "shape", tone: "brass" },
  { label: "Keys", value: "keys" },
  { label: "Strings", value: "strings" },
  { label: "Drums", value: "drums" },
];
const config: TabItem[] = ["Global", "Stage", "Scope", "Bodies", "Relations", "Layers", "Deck", "MIDI"]
  .map((label) => ({ label, value: label.toLowerCase() }));
const withDisabled: TabItem[] = [
  { label: "Anim", value: "anim" },
  { label: "Freq", value: "freq" },
  { label: "Color", value: "color", disabled: true },
];

const a = ref("freq");
const b = ref("shape");
const c = ref("bodies");
const d = ref("anim");
</script>

<template>
  <div class="plab-bench plab-bench--stack">
    <LabCell caption="Four equal destinations · arrows, Home, End" wide>
      <component :is="component" v-model="a" :tabs="four" aria-label="Specimen tabs" v-bind="pinned" />
    </LabCell>
    <LabCell caption="Instrument Picker · Shape carries Brass on its own tab" wide>
      <component :is="component" v-model="b" :tabs="picker" aria-label="Instrument banks" v-bind="pinned" />
    </LabCell>
    <LabCell caption="Config Menu · eight destinations, compact scroll rail" wide>
      <component :is="component" v-model="c" :tabs="config" density="compact" layout="scroll" aria-label="Config destinations" v-bind="pinned" />
    </LabCell>
    <LabCell caption="Disabled destination · skipped by arrows" wide>
      <component :is="component" v-model="d" :tabs="withDisabled" aria-label="Tabs with a disabled destination" v-bind="pinned" />
    </LabCell>
  </div>
</template>

<style scoped>
.plab-bench--stack :deep(.plab-cell__stage) { display: block; }
</style>
