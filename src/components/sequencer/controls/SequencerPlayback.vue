<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { Play, CircleStop, Volume2, VolumeX } from "lucide-vue-next";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

interface Props {
  sequencerId: string;
  themeColors?: {
    primary: string;
    secondary: string;
    accent: string;
  } | null;
}

const props = defineProps<Props>();

// Store
const sequencerStore = useSequencerStore();

// Transport management
let transport: any = null;

// Get current sequencer
const sequencer = computed(() => {
  return sequencerStore.sequencers.find((s) => s.id === props.sequencerId);
});

// Computed properties
const isPlaying = computed(() => sequencer.value?.isPlaying || false);
const isMuted = computed(() => sequencer.value?.isMuted || false);
const beatCount = computed(() => sequencer.value?.beats.length || 0);
const canPlay = computed(() => beatCount.value > 0 && !isMuted.value);

// Methods
const togglePlayback = async () => {
  if (!sequencer.value) return;

  if (isPlaying.value) {
    // Stop playback
    if (transport) {
      transport.stopAll();
      transport.dispose();
      transport = null;
    }
    sequencerStore.stopSequencer(props.sequencerId);
  } else {
    // Start playback
    try {
      const { MultiSequencerTransport } = await import("@/utils/sequencer");
      transport = new MultiSequencerTransport();

      // Update store state first
      sequencerStore.startSequencer(props.sequencerId);

      // Start the transport
      await transport.startSequencer(
        sequencer.value,
        sequencerStore.config.steps
      );
    } catch (error) {
      console.error("Error starting sequencer playback:", error);
      sequencerStore.stopSequencer(props.sequencerId);
    }
  }
  triggerUIHaptic();
};

const toggleMute = () => {
  sequencerStore.toggleSequencerMute(props.sequencerId);
  triggerUIHaptic();
};

// Cleanup on unmount
onUnmounted(() => {
  if (transport) {
    transport.stopAll();
    transport.dispose();
  }
});

// Dynamic play button styling
const getPlayButtonStyles = () => {
  if (!props.themeColors) return {};

  const { primary } = props.themeColors;

  if (!isPlaying.value && canPlay.value) {
    // Play ready state - use primary color with alpha
    const match = primary.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*[\d.]+\)/);
    if (match) {
      const [, h, s, l] = match;
      return {
        background: `hsla(${h}, ${s}%, ${l}%, 0.2)`,
        borderColor: `hsla(${h}, ${s}%, ${l}%, 0.5)`,
        color: primary,
      };
    }
  } else if (isPlaying.value) {
    // Play active state - use red for stop
    return {
      background: "hsla(0, 84%, 60%, 0.2)",
      borderColor: "hsla(0, 84%, 60%, 0.5)",
      color: "hsla(0, 84%, 60%, 1)",
    };
  }

  return {};
};
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      @click="togglePlayback"
      :disabled="!canPlay && !isPlaying"
      class="px-3 py-2 rounded-lg border font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 text-sm"
      :class="{
        'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/30 hover:border-emerald-500/60':
          !isPlaying && canPlay && !themeColors,
        'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30 hover:border-red-500/60':
          isPlaying && !themeColors,
        'bg-gray-500/20 border-gray-500/30 text-gray-500 cursor-not-allowed':
          !canPlay && !isPlaying,
      }"
      :style="getPlayButtonStyles()"
    >
      <CircleStop v-if="isPlaying" :size="16" />
      <Play v-else :size="16" />
      <span>{{ isPlaying ? "Stop" : "Play" }}</span>
    </button>

    <button
      @click="toggleMute"
      class="p-2 rounded-lg border cursor-pointer transition-all duration-200"
      :class="{
        'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white':
          !isMuted && !themeColors,
        'bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30 hover:border-red-500/60':
          isMuted,
        'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40':
          !isMuted && themeColors,
      }"
      :style="!isMuted && themeColors ? { color: themeColors.primary } : {}"
      :title="isMuted ? 'Unmute' : 'Mute'"
    >
      <VolumeX v-if="isMuted" :size="16" />
      <Volume2 v-else :size="16" />
    </button>
  </div>
</template>
