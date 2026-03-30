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
        "border-[#423617] bg-[#131008] text-[#c8bf9b] hover:border-[#7d6825] hover:text-[#f5edd9] data-[state=active]:border-[#f7b22c] data-[state=active]:bg-[#f7b22c] data-[state=active]:text-[#18120a]",
      red:
        "border-[#402019] bg-[#131008] text-[#c8bf9b] hover:border-[#8b392d] hover:text-[#f5edd9] data-[state=active]:border-[#e53d2d] data-[state=active]:bg-[#e53d2d] data-[state=active]:text-white",
      violet:
        "border-[#2b2248] bg-[#131008] text-[#c8bf9b] hover:border-[#5a4295] hover:text-[#f5edd9] data-[state=active]:border-[#5a4295] data-[state=active]:bg-[#5a4295] data-[state=active]:text-white",
      cream:
        "border-[#4a4333] bg-[#131008] text-[#c8bf9b] hover:border-[#a79b7a] hover:text-[#f5edd9] data-[state=active]:border-[#efe5cf] data-[state=active]:bg-[#efe5cf] data-[state=active]:text-[#17120a]",
      green:
        "border-[#1c3429] bg-[#131008] text-[#c8bf9b] hover:border-[#2faa72] hover:text-[#f5edd9] data-[state=active]:border-[#34c97f] data-[state=active]:bg-[#34c97f] data-[state=active]:text-[#07110d]",
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
