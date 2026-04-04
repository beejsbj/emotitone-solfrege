<script setup lang="ts">
import { computed, type Component } from "vue";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui";
import OverlayPanelShell from "./OverlayPanelShell.vue";

export type TabbedOverlayTone =
  | "amber"
  | "red"
  | "violet"
  | "cream"
  | "green";

export interface TabbedOverlayTab {
  value: string;
  label: string;
  shortLabel: string;
  tone: TabbedOverlayTone;
  icon?: Component;
}

interface Props {
  modelValue: string;
  tabs: TabbedOverlayTab[];
  width?: string;
  height?: string;
  maxHeight?: string;
  bodyClass?: string;
  activeTabWidthClass?: string;
  inactiveTabWidthClass?: string;
  tabTestIdPrefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: "min(46rem, calc(100vw - 1.5rem))",
  height: "",
  maxHeight: "min(62vh, 36rem)",
  bodyClass: "",
  activeTabWidthClass: "min-w-[8.75rem] max-w-[12rem]",
  inactiveTabWidthClass: "min-w-[3.8rem] max-w-[3.8rem]",
  tabTestIdPrefix: "panel-tab",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const activeValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const tabTriggerToneClass = (tone: TabbedOverlayTone) =>
  (
    {
      amber:
        "border-[#3e3e3e] bg-[#131313] text-[#c8c8c8] hover:border-[#6f6f6f] hover:text-[#f2f2f2] data-[state=active]:border-[#b8b8b8] data-[state=active]:bg-[#b8b8b8] data-[state=active]:text-[#121212]",
      red:
        "border-[#3d3c3c] bg-[#131313] text-[#c8c8c8] hover:border-[#6d6a6a] hover:text-[#f2f2f2] data-[state=active]:border-[#a8a4a4] data-[state=active]:bg-[#a8a4a4] data-[state=active]:text-[#121212]",
      violet:
        "border-[#383943] bg-[#131313] text-[#c8c8c8] hover:border-[#666874] hover:text-[#f2f2f2] data-[state=active]:border-[#a9abb5] data-[state=active]:bg-[#a9abb5] data-[state=active]:text-[#121212]",
      cream:
        "border-[#43413d] bg-[#131313] text-[#c8c8c8] hover:border-[#72706b] hover:text-[#f2f2f2] data-[state=active]:border-[#d3d0ca] data-[state=active]:bg-[#d3d0ca] data-[state=active]:text-[#121212]",
      green:
        "border-[#39403a] bg-[#131313] text-[#c8c8c8] hover:border-[#676d67] hover:text-[#f2f2f2] data-[state=active]:border-[#b0b6b0] data-[state=active]:bg-[#b0b6b0] data-[state=active]:text-[#121212]",
    } as const
  )[tone];
</script>

<template>
  <Tabs :value="activeValue" @update:value="activeValue = $event">
    <OverlayPanelShell
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
        <TabsList
          class="w-full justify-start gap-1 overflow-x-auto border-0 bg-transparent p-0"
        >
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.value"
            :value="tab.value"
            :data-testid="`${tabTestIdPrefix}-${tab.value}`"
            class="h-9 shrink-0 overflow-hidden border px-2 text-[8px] font-semibold uppercase tracking-[0.2em] transition-[min-width,max-width,padding,background-color,border-color,color] duration-200 [clip-path:polygon(10%_0,100%_0,90%_100%,0_100%)] data-[state=active]:px-3"
            :class="[
              tabTriggerToneClass(tab.tone),
              activeValue === tab.value
                ? activeTabWidthClass
                : inactiveTabWidthClass,
            ]"
          >
            <span
              v-if="tab.icon && activeValue === tab.value"
              class="inline-flex items-center gap-1.5"
            >
              <component :is="tab.icon" class="h-3 w-3 shrink-0" />
              <span class="block truncate">
                {{ tab.label }}
              </span>
            </span>

            <span
              v-else-if="tab.icon"
              class="inline-flex items-center justify-center"
            >
              <component :is="tab.icon" class="h-3 w-3 shrink-0" />
              <span class="sr-only">{{ tab.label }}</span>
            </span>

            <span v-else class="block truncate">
              {{ activeValue === tab.value ? tab.label : tab.shortLabel }}
            </span>
          </TabsTrigger>
        </TabsList>
      </template>
    </OverlayPanelShell>
  </Tabs>
</template>
