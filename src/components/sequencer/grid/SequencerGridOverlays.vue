<script setup lang="ts">
interface Props {
  sequencer: any;
  isActive: boolean;
  isPressed: boolean;
  getThemeColor: (paletteId?: string) => string | null;
}

const props = defineProps<Props>();
</script>

<template>
  <!-- Selection Overlay -->
  <div
    v-if="isActive"
    class="absolute inset-0 rounded-lg pointer-events-none"
    :style="{
      background:
        sequencer.color && getThemeColor(sequencer.color)
          ? `linear-gradient(135deg, ${getThemeColor(sequencer.color)?.replace(
              '1)',
              '0.2)'
            )}, ${getThemeColor(sequencer.color)?.replace('1)', '0.1)')})`
          : 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
      boxShadow:
        sequencer.color && getThemeColor(sequencer.color)
          ? `inset 0 0 20px ${getThemeColor(sequencer.color)?.replace(
              '1)',
              '0.3)'
            )}`
          : 'inset 0 0 20px rgba(255,255,255,0.1)',
    }"
  />

  <!-- Press State Overlay -->
  <div
    v-if="isPressed"
    class="absolute inset-0 bg-white/20 rounded-lg pointer-events-none transition-opacity duration-100"
  />
</template>
