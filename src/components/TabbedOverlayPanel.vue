<script setup lang="ts">
import { computed, provide, type Component } from "vue";
import Tabs, { type TabItem } from "@/components/primatives/Tabs.vue";
import OverlayPanelShell from "./OverlayPanelShell.vue";

export interface TabbedOverlayTab {
  value: string;
  label: string;
  shortLabel: string;
  icon?: Component;
}

interface Props {
  embedded?: boolean;
  modelValue: string;
  tabs: TabbedOverlayTab[];
  width?: string;
  height?: string;
  maxHeight?: string;
  bodyClass?: string;
  tabTestIdPrefix?: string;
  tabsAriaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: "min(46rem, calc(100vw - 1.5rem))",
  height: "",
  maxHeight: "min(62vh, 36rem)",
  bodyClass: "",
  tabTestIdPrefix: "panel-tab",
  tabsAriaLabel: "Panel sections",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  contentHeight: [height: number];
}>();

const activeValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const tabItems = computed<TabItem[]>(() =>
  props.tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    shortLabel: tab.shortLabel,
    icon: tab.icon,
    testId: `${props.tabTestIdPrefix}-${tab.value}`,
  })),
);

provide("tabs-context", { value: activeValue });
</script>

<template>
  <div class="flex min-w-0 w-full flex-col" :class="{ 'h-full min-h-0': embedded }">
    <OverlayPanelShell
      :embedded="embedded"
      @content-height="emit('contentHeight', $event)"
      :width="width"
      :height="height"
      :max-height="maxHeight"
      :body-class="bodyClass"
    >
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>

      <template v-if="$slots.toolbar" #toolbar>
        <slot name="toolbar" />
      </template>

      <slot />

      <template v-if="tabs.length > 0" #footer>
        <Tabs
          v-model="activeValue"
          :tabs="tabItems"
          density="compact"
          layout="scroll"
          :aria-label="tabsAriaLabel"
        />
      </template>
    </OverlayPanelShell>
  </div>
</template>
