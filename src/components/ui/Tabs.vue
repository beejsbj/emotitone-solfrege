<script setup lang="ts">
import { computed, provide, type ComputedRef } from "vue";

interface Props {
  value: string;
}

const props = defineProps<Props>();
const currentValue = computed(() => props.value);

provide("tabs-context", {
  value: currentValue,
});

export interface TabsContext {
  value: ComputedRef<string>;
}
</script>

<template>
  <div class="flex flex-col">
    <slot />
  </div>
</template>
