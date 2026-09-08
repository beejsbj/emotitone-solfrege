<template>
  <Sticker
    class="mark-sticker"
    :variant="variant"
    :color="color"
    :role="hasText ? undefined : 'img'"
    :aria-label="hasText ? undefined : ariaLabel"
  >
    <span class="mark-sticker__content">
      <Mark v-if="showMark" :name="mark" tone="inherit" :size="markSize" />
      <span v-if="hasText" class="mark-sticker__label">
        <slot>{{ label }}</slot>
      </span>
    </span>
  </Sticker>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";
import Mark from "@/components/primatives/Mark.vue";
import type { MarkName } from "@/components/primatives/marks";
import Sticker from "@/components/primatives/Sticker.vue";
import type { StickerColor, StickerVariant } from "@/components/primatives/Sticker.vue";

const props = withDefaults(
  defineProps<{
    mark?: MarkName;
    variant?: Exclude<StickerVariant, "badge">;
    color?: StickerColor;
    markSize?: number | string;
    showMark?: boolean;
    label?: string;
    ariaLabel?: string;
  }>(),
  {
    mark: "triangle",
    variant: "fill",
    color: "tomato",
    markSize: 14,
    showMark: true,
    label: undefined,
    ariaLabel: "Mark sticker",
  },
);

const slots = useSlots();
const hasText = computed(() => Boolean(props.label) || Boolean(slots.default));
</script>

<style scoped>
.mark-sticker__content {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.mark-sticker__label {
  display: block;
  transform: translateY(1px);
}
</style>
