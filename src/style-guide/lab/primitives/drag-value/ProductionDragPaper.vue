<script setup lang="ts">
import Sticker from "@/components/primatives/Sticker";
import type { LabDragPaperProps } from "@/types/primitivesLab";

/** The accepted paper, composed exactly as production `DragValue.vue` composes Sticker. */
defineProps<LabDragPaperProps>();
</script>

<template>
  <Sticker
    :variant="tone === 'ivory' ? 'fill' : 'badge'"
    :color="tone === 'brass' ? 'brass-sheen' : 'ivory'"
    class="production-drag-paper"
    :class="{ 'production-drag-paper--fill': tone === 'ivory' }"
  >{{ value }}</Sticker>
</template>

<style scoped>
.production-drag-paper { font-variant-numeric: tabular-nums; }
.production-drag-paper--fill { font-size: 20px; text-transform: none; }
</style>
