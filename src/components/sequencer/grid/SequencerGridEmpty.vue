<script setup lang="ts">
import { useSequencerInteraction } from "@/composables/sequencer/useSequencerInteraction";

interface Props {
  canAdd: boolean;
  onAdd?: () => void;
}

const props = defineProps<Props>();

// Use the existing double-tap detection
const { isDoubleTap } = useSequencerInteraction();

const handleClick = () => {
  if (!props.canAdd) return;

  if (isDoubleTap()) {
    props.onAdd?.();
  }
};
</script>

<template>
  <div
    class="border-2 border-dashed border-white/20 rounded-lg p-1 backdrop-blur-sm transition-all duration-200 hover:border-white/40 hover:bg-white/5 aspect-square flex flex-col items-center justify-center cursor-pointer"
    :class="!canAdd ? 'opacity-50 cursor-not-allowed' : ''"
    @click.stop="handleClick"
  >
    <div class="text-white/40 text-2xl">+</div>
    <div class="text-white/30 text-[8px] mt-1">Double-click</div>
  </div>
</template>
