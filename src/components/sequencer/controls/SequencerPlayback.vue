<script setup lang="ts">
import { computed, ref, onUnmounted } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { Knob } from "@/components/knobs";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import { Play, Square, Volume2, VolumeX } from "lucide-vue-next";

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

// Loading state for startup
const isStarting = ref(false);

// Get current sequencer
const sequencer = computed(() => {
  return sequencerStore.sequencers.find((s) => s.id === props.sequencerId);
});

// Computed properties
const isPlaying = computed(() => sequencer.value?.isPlaying || false);
const isMuted = computed(() => sequencer.value?.isMuted || false);
const beatCount = computed(() => sequencer.value?.beats.length || 0);
const canPlay = computed(() => beatCount.value > 0 && !isMuted.value);

// Icon computed properties
const playIcon = computed(() => (isPlaying.value ? Square : Play));
const muteIcon = computed(() => (isMuted.value ? VolumeX : Volume2));

// Methods
const togglePlayback = async () => {
  if (!sequencer.value || isStarting.value) return;

  if (isPlaying.value) {
    // Stop playback - immediate
    if (transport) {
      transport.stopAll();
      transport.dispose();
      transport = null;
    }
    sequencerStore.stopSequencer(props.sequencerId);
  } else {
    // Start playback - show loading during transport setup
    try {
      isStarting.value = true;

      const { MultiSequencerTransport } = await import("@/utils/sequencer");
      transport = new MultiSequencerTransport();

      // Update store state first
      sequencerStore.startSequencer(props.sequencerId);

      // Start the transport
      await transport.startSequencer(
        sequencer.value,
        sequencerStore.config.steps
      );

      isStarting.value = false;
    } catch (error) {
      console.error("Error starting sequencer playback:", error);
      sequencerStore.stopSequencer(props.sequencerId);
      isStarting.value = false;
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
</script>

<template>
  <div class="flex items-center gap-4">
    <!-- Play/Stop Button Knob -->
    <div class="text-center">
      <Knob
        type="button"
        label="Play"
        :icon="playIcon"
        :ready-color="
          canPlay ? 'hsla(120, 70%, 50%, 1)' : 'hsla(0, 0%, 40%, 1)'
        "
        :active-color="'hsla(0, 84%, 60%, 1)'"
        :loading-color="'hsla(43, 96%, 56%, 1)'"
        :is-disabled="!canPlay && !isPlaying"
        :is-loading="isStarting"
        :is-active="isPlaying"
        @click="togglePlayback"
      />
    </div>

    <!-- Mute Boolean Knob -->
    <div class="text-center">
      <Knob
        type="boolean"
        label="Mute"
        :model-value="isMuted"
        :value-label-true="Volume2"
        :value-label-false="VolumeX"
        :theme-color="themeColors?.primary || 'hsla(200, 70%, 50%, 1)'"
        @update:model-value="toggleMute"
      />
    </div>

    <!-- Beat Count Display Knob -->
    <div class="text-center">
      <Knob
        type="range"
        :model-value="beatCount"
        :min="0"
        :max="32"
        :is-display="true"
        label="Beats"
        :theme-color="'hsla(271, 91%, 65%, 1)'"
      />
    </div>
  </div>
</template>
