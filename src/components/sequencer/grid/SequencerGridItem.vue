<script setup lang="ts">
import { computed } from "vue";
import CircularSequencer from "../../CircularSequencer.vue";
import { Volume2, VolumeX } from "lucide-vue-next";

interface Props {
  sequencer: any;
  isActive: boolean;
  isPressed: boolean;
  getThemeColor: (paletteId?: string) => string | null;
  getSequencerIcon: (sequencer: any) => string;
  onPressStart?: (sequencerId: string, event: Event) => void;
  onPressEnd?: (sequencerId: string) => void;
}

const props = defineProps<Props>();

// Dynamic styling based on sequencer state
const cardStyle = computed(() => {
  const baseStyle = {
    transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  if (props.sequencer.color && props.getThemeColor(props.sequencer.color)) {
    const themeColor = props.getThemeColor(props.sequencer.color)!;
    return {
      ...baseStyle,
      backgroundColor: props.isPressed
        ? themeColor.replace("1)", "0.25)")
        : themeColor.replace("1)", "0.15)"),
      borderColor: themeColor.replace("1)", props.isPressed ? "0.8)" : "0.6)"),
      boxShadow: props.isPressed
        ? `inset 0 2px 8px ${themeColor.replace("1)", "0.4)")}`
        : props.isActive
        ? `0 0 20px ${themeColor.replace("1)", "0.3)")}`
        : `0 0 10px ${themeColor.replace("1)", "0.2)")}`,
      transform: props.isPressed ? "translateY(1px)" : "translateY(0px)",
    };
  } else {
    return {
      ...baseStyle,
      backgroundColor: props.isPressed
        ? "rgba(255,255,255,0.2)"
        : props.isActive
        ? "rgba(255,255,255,0.1)"
        : "rgba(31, 41, 55, 0.6)",
      borderColor: props.isPressed
        ? "rgba(255,255,255,0.8)"
        : props.isActive
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.2)",
      boxShadow: props.isPressed
        ? "inset 0 2px 8px rgba(0,0,0,0.3)"
        : props.isActive
        ? "0 0 20px rgba(255,255,255,0.1)"
        : "none",
      transform: props.isPressed ? "translateY(1px)" : "translateY(0px)",
    };
  }
});

// Event handlers
const handlePressStart = (event: Event) => {
  props.onPressStart?.(props.sequencer.id, event);
};

const handlePressEnd = () => {
  props.onPressEnd?.(props.sequencer.id);
};
</script>

<template>
  <div
    class="border rounded-sm p-1 backdrop-blur-sm transition-all duration-150 ease-out aspect-square flex flex-col relative"
    :class="[
      isActive
        ? 'border-2'
        : sequencer.color
        ? 'border'
        : 'border border-white/20',
      isPressed ? 'scale-95 shadow-inner' : 'hover:scale-105 shadow-sm',
    ]"
    :style="cardStyle"
    @mousedown.stop="handlePressStart"
    @mouseup.stop="handlePressEnd"
    @mouseleave="handlePressEnd"
    @touchstart.stop.prevent="handlePressStart"
    @touchend.stop.prevent="handlePressEnd"
  >
    <!-- Icon -->

    <span
      class="text-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
      >{{ getSequencerIcon(sequencer) }}</span
    >

    <!-- Compact Circular Sequencer -->
    <CircularSequencer
      class="pointer-events-none"
      :sequencer-id="sequencer.id"
      :compact="true"
      :key="`compact-${sequencer.id}`"
    />

    <!-- Status Indicator -->
    <div
      class="w-1.5 h-1.5 rounded-full transition-colors absolute top-1 left-1"
      :class="{
        'bg-green-400': sequencer.isPlaying && !sequencer.isMuted,
        'bg-red-400': sequencer.isMuted,
        'bg-gray-500': !sequencer.isPlaying && !sequencer.isMuted,
      }"
    />

    <!-- Mute/Unmute Indicator (top right) -->
    <div
      class="absolute top-1 right-1 transition-colors"
      :title="sequencer.isMuted ? 'Muted' : 'Unmuted'"
    >
      <VolumeX v-if="sequencer.isMuted" :size="8" class="text-red-500" />
      <Volume2 v-else :size="8" class="text-green-500/70" />
    </div>

    <!-- Octave Number (bottom left) -->
    <div
      class="absolute bottom-1 left-1 text-[8px] font-bold text-white/60 leading-none"
    >
      {{ sequencer.octave }}
    </div>
  </div>
</template>
