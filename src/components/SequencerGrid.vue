<script setup lang="ts">
import { ref, computed } from "vue";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import { AVAILABLE_INSTRUMENTS } from "@/data/instruments";
import CircularSequencer from "./CircularSequencer.vue";
import SequencerInstanceControls from "./SequencerInstanceControls.vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// Store
const multiSequencerStore = useMultiSequencerStore();

// Computed
const sequencers = computed(() => multiSequencerStore.sequencers);
const activeSequencer = computed(() => multiSequencerStore.activeSequencer);

// Define slot types
interface SequencerSlot {
  type: "sequencer";
  sequencer: any;
  index: number;
}

interface EmptySlot {
  type: "empty";
  sequencer: null;
  index: number;
}

type GridSlot = SequencerSlot | EmptySlot;

// Create grid slots (16 total)
const gridSlots = computed((): GridSlot[] => {
  const slots: GridSlot[] = [];
  const maxSlots = 16;

  // Add existing sequencers
  for (let i = 0; i < Math.min(sequencers.value.length, maxSlots); i++) {
    slots.push({
      type: "sequencer",
      sequencer: sequencers.value[i],
      index: i,
    });
  }

  // Fill remaining slots with empty slots
  for (let i = sequencers.value.length; i < maxSlots; i++) {
    slots.push({
      type: "empty",
      sequencer: null,
      index: i,
    });
  }

  return slots;
});

// Interaction state
const lastTapTime = ref<{ [key: string]: number }>({});
const pressState = ref<{
  [key: string]: {
    isPressed: boolean;
    timeout?: number;
    startTime: number;
    transport?: any; // Store the transport instance here
  };
}>({});

// Methods
const handleSequencerTap = (sequencerId: string) => {
  // This is now only called from click events that don't conflict with press/hold
  // Most tap detection will happen in handleSequencerPressEnd for short presses
  const now = Date.now();
  const lastTap = lastTapTime.value[sequencerId] || 0;
  const timeDiff = now - lastTap;

  console.log(`Click on ${sequencerId}: timeDiff=${timeDiff}ms`);

  lastTapTime.value[sequencerId] = now;

  // Double tap detection (within 300ms)
  if (timeDiff < 300 && timeDiff > 0) {
    console.log("Double tap detected!");
    // Double tap - toggle selection
    if (multiSequencerStore.config.activeSequencerId === sequencerId) {
      multiSequencerStore.setActiveSequencer("");
    } else {
      multiSequencerStore.setActiveSequencer(sequencerId);
    }
    triggerUIHaptic();
  }
};

const handleSequencerPressStart = (sequencerId: string, event: Event) => {
  event.preventDefault();
  console.log("Press start:", sequencerId);

  const now = Date.now();

  // Initialize press state
  pressState.value[sequencerId] = {
    isPressed: true,
    startTime: now,
    transport: null,
  };

  // Start playing after 200ms hold
  const timeout = setTimeout(async () => {
    if (pressState.value[sequencerId]?.isPressed) {
      console.log("Starting sequencer from hold:", sequencerId);

      // Create and store the transport
      const transport = await startSequencerPlayback(sequencerId);
      if (transport && pressState.value[sequencerId]) {
        pressState.value[sequencerId].transport = transport;
      }
      triggerUIHaptic();
    }
  }, 200);

  pressState.value[sequencerId].timeout = timeout;
};

const handleSequencerPressEnd = (sequencerId: string) => {
  console.log("Press end:", sequencerId);
  const state = pressState.value[sequencerId];
  if (!state) return;

  const now = Date.now();
  const pressDuration = now - state.startTime;

  state.isPressed = false;

  // Clear timeout if still pending
  if (state.timeout) {
    clearTimeout(state.timeout);
  }

  // If there's a transport playing, stop it
  if (state.transport) {
    console.log("Stopping transport for:", sequencerId);
    try {
      state.transport.stopAll();
      state.transport.dispose();
    } catch (error) {
      console.error("Error stopping transport:", error);
    }
    state.transport = null;
  }

  // Stop playing in store
  multiSequencerStore.stopSequencer(sequencerId);

  // Handle short press as tap for double-tap detection
  if (pressDuration < 200) {
    console.log(`Short press (${pressDuration}ms) - treating as tap`);

    const lastTap = lastTapTime.value[sequencerId] || 0;
    const timeSinceLastTap = now - lastTap;

    lastTapTime.value[sequencerId] = now;

    // Double tap detection (within 300ms)
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      console.log("Double tap detected from short press!");
      console.log(
        "Current active sequencer ID:",
        multiSequencerStore.config.activeSequencerId
      );
      console.log("Tapped sequencer ID:", sequencerId);
      // Double tap - toggle selection
      if (multiSequencerStore.config.activeSequencerId === sequencerId) {
        console.log("Deselecting active sequencer");
        multiSequencerStore.setActiveSequencer("");
      } else {
        console.log("Selecting new sequencer");
        multiSequencerStore.setActiveSequencer(sequencerId);
      }
      triggerUIHaptic();
    }
  }
};

const addNewSequencer = () => {
  if (sequencers.value.length < 16) {
    multiSequencerStore.createSequencer();
    triggerUIHaptic();
  }
};

// Extract the sequencer playback logic into a separate function
const startSequencerPlayback = async (sequencerId: string) => {
  console.log("Starting sequencer playback for:", sequencerId);
  const sequencer = sequencers.value.find((s) => s.id === sequencerId);
  if (!sequencer || sequencer.beats.length === 0) {
    console.log("No sequencer or no beats");
    return null;
  }

  try {
    // Import the transport system
    const { MultiSequencerTransport } = await import("@/utils/multiSequencer");

    // Create a transport instance
    const transport = new MultiSequencerTransport();

    // Set the sequencer to playing in the store
    multiSequencerStore.startSequencer(sequencerId);

    // Start the transport with just this sequencer
    await transport.startSequencer(sequencer, multiSequencerStore.config.steps);

    console.log("Started sequencer successfully");
    return transport;
  } catch (error) {
    console.error("Error in sequencer playback:", error);
    return null;
  }
};

// Simple test method to play a sequencer directly
const testPlaySequencer = async (sequencerId: string) => {
  // This function is now replaced by startSequencerPlayback
  return startSequencerPlayback(sequencerId);
};

const getSequencerDisplayName = (sequencer: any) => {
  const instrumentConfig = AVAILABLE_INSTRUMENTS[sequencer.instrument];
  const autoDisplayName = instrumentConfig
    ? `${instrumentConfig.displayName} ${sequencer.octave}`
    : `Unknown ${sequencer.octave}`;
  return sequencer.name || autoDisplayName;
};

const getSequencerIcon = (sequencer: any) => {
  const instrumentConfig = AVAILABLE_INSTRUMENTS[sequencer.instrument];
  return instrumentConfig?.icon || "🎵";
};

const getThemeColor = (paletteId?: string) => {
  const colorMap: Record<string, string> = {
    neon: "hsla(158, 100%, 53%, 1)",
    sunset: "hsla(21, 90%, 48%, 1)",
    ocean: "hsla(217, 91%, 60%, 1)",
    purple: "hsla(271, 91%, 65%, 1)",
    pink: "hsla(328, 85%, 70%, 1)",
    gold: "hsla(43, 96%, 56%, 1)",
  };
  return paletteId ? colorMap[paletteId] : null;
};

// Sequencer instance events are now handled internally by the component
</script>

<template>
  <div class="flex flex-col h-full space-y-4">
    <!-- Expanded Sequencer View -->
    <div
      class="transition-opacity duration-300"
      :class="activeSequencer ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <!-- Full Circular Sequencer -->
      <div class="flex justify-center">
        <div class="w-full max-w-sm">
          <CircularSequencer :expanded="true" />
        </div>
      </div>

      <!-- Instance Controls -->
      <SequencerInstanceControls />
    </div>

    <!-- Sequencer Grid -->
    <div class="flex-1 space-y-3">
      <!-- Fixed 16-Slot Grid (4x4) -->
      <div class="grid grid-cols-4 gap-1 px-1">
        <div
          v-for="slot in gridSlots"
          :key="
            slot.type === 'sequencer'
              ? slot.sequencer.id
              : `empty-${slot.index}`
          "
          @click.stop="
            slot.type === 'empty' && sequencers.length < 16
              ? addNewSequencer()
              : null
          "
          @mousedown.stop="
            slot.type === 'sequencer'
              ? handleSequencerPressStart(slot.sequencer.id, $event)
              : null
          "
          @mouseup.stop="
            slot.type === 'sequencer'
              ? handleSequencerPressEnd(slot.sequencer.id)
              : null
          "
          @mouseleave="
            slot.type === 'sequencer'
              ? handleSequencerPressEnd(slot.sequencer.id)
              : null
          "
          @touchstart.stop.prevent="
            slot.type === 'sequencer'
              ? handleSequencerPressStart(slot.sequencer.id, $event)
              : null
          "
          @touchend.stop.prevent="
            slot.type === 'sequencer'
              ? handleSequencerPressEnd(slot.sequencer.id)
              : null
          "
          class="relative group cursor-pointer transition-all duration-200 hover:scale-105"
        >
          <!-- Sequencer Card -->
          <div
            v-if="slot.type === 'sequencer'"
            class="border rounded-lg p-1 backdrop-blur-sm transition-all duration-150 ease-out aspect-square flex flex-col"
            :class="[
              slot.sequencer.id === activeSequencer?.id
                ? 'border-2'
                : slot.sequencer.color
                ? 'border'
                : 'border border-white/20',
              // Press state styling
              pressState[slot.sequencer.id]?.isPressed
                ? 'scale-95 shadow-inner'
                : 'hover:scale-105 shadow-lg',
            ]"
            :style="
              slot.sequencer.color
                ? {
                    backgroundColor: pressState[slot.sequencer.id]?.isPressed
                      ? getThemeColor(slot.sequencer.color)?.replace(
                          '1)',
                          '0.25)'
                        )
                      : getThemeColor(slot.sequencer.color)?.replace(
                          '1)',
                          '0.15)'
                        ),
                    borderColor: getThemeColor(slot.sequencer.color)?.replace(
                      '1)',
                      pressState[slot.sequencer.id]?.isPressed ? '0.8)' : '0.6)'
                    ),
                    boxShadow: pressState[slot.sequencer.id]?.isPressed
                      ? `inset 0 2px 8px ${getThemeColor(
                          slot.sequencer.color
                        )?.replace('1)', '0.4)')}`
                      : slot.sequencer.id === activeSequencer?.id
                      ? `0 0 20px ${getThemeColor(
                          slot.sequencer.color
                        )?.replace('1)', '0.3)')}`
                      : `0 0 10px ${getThemeColor(
                          slot.sequencer.color
                        )?.replace('1)', '0.2)')}`,
                    transform: pressState[slot.sequencer.id]?.isPressed
                      ? 'translateY(1px)'
                      : 'translateY(0px)',
                  }
                : {
                    backgroundColor: pressState[slot.sequencer.id]?.isPressed
                      ? 'rgba(255,255,255,0.2)'
                      : slot.sequencer.id === activeSequencer?.id
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(31, 41, 55, 0.6)',
                    borderColor: pressState[slot.sequencer.id]?.isPressed
                      ? 'rgba(255,255,255,0.8)'
                      : slot.sequencer.id === activeSequencer?.id
                      ? 'rgba(255,255,255,0.6)'
                      : 'rgba(255,255,255,0.2)',
                    boxShadow: pressState[slot.sequencer.id]?.isPressed
                      ? 'inset 0 2px 8px rgba(0,0,0,0.3)'
                      : slot.sequencer.id === activeSequencer?.id
                      ? '0 0 20px rgba(255,255,255,0.1)'
                      : 'none',
                    transform: pressState[slot.sequencer.id]?.isPressed
                      ? 'translateY(1px)'
                      : 'translateY(0px)',
                  }
            "
          >
            <!-- Icon Only -->
            <div class="flex items-center justify-center py-1">
              <span class="text-sm">{{
                getSequencerIcon(slot.sequencer)
              }}</span>
            </div>

            <!-- Compact Circular Sequencer -->
            <div class="flex-1 flex items-center justify-center">
              <div class="w-full h-full max-w-[60px] max-h-[60px]">
                <CircularSequencer
                  :sequencer-id="slot.sequencer.id"
                  :compact="true"
                  :key="`compact-${slot.sequencer.id}`"
                />
              </div>
            </div>

            <!-- Status Indicator -->
            <div class="flex items-center justify-center py-1">
              <div
                class="w-1.5 h-1.5 rounded-full transition-colors"
                :class="{
                  'bg-green-400':
                    slot.sequencer.isPlaying && !slot.sequencer.isMuted,
                  'bg-red-400': slot.sequencer.isMuted,
                  'bg-gray-500':
                    !slot.sequencer.isPlaying && !slot.sequencer.isMuted,
                }"
              />
            </div>
          </div>

          <!-- Empty Slot Card -->
          <div
            v-else
            class="border-2 border-dashed border-white/20 rounded-lg p-1 backdrop-blur-sm transition-all duration-200 hover:border-white/40 hover:bg-white/5 aspect-square flex flex-col items-center justify-center"
            :class="
              sequencers.length >= 16 ? 'opacity-50 cursor-not-allowed' : ''
            "
          >
            <div class="text-white/40 text-2xl">+</div>
            <div class="text-white/30 text-[8px] mt-1">Add</div>
          </div>

          <!-- Selection Overlay -->
          <div
            v-if="
              slot.type === 'sequencer' &&
              slot.sequencer.id === activeSequencer?.id
            "
            class="absolute inset-0 rounded-lg pointer-events-none"
            :style="{
              background:
                slot.sequencer.color && getThemeColor(slot.sequencer.color)
                  ? `linear-gradient(135deg, ${getThemeColor(
                      slot.sequencer.color
                    )?.replace('1)', '0.2)')}, ${getThemeColor(
                      slot.sequencer.color
                    )?.replace('1)', '0.1)')})`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
              boxShadow:
                slot.sequencer.color && getThemeColor(slot.sequencer.color)
                  ? `inset 0 0 20px ${getThemeColor(
                      slot.sequencer.color
                    )?.replace('1)', '0.3)')}`
                  : 'inset 0 0 20px rgba(255,255,255,0.1)',
            }"
          />

          <!-- Press State Overlay -->
          <div
            v-if="
              slot.type === 'sequencer' &&
              pressState[slot.sequencer.id]?.isPressed
            "
            class="absolute inset-0 bg-white/20 rounded-lg pointer-events-none transition-opacity duration-100"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for grid items */
.grid > div {
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
