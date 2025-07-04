import { ref, computed } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { AVAILABLE_INSTRUMENTS } from "@/data/instruments";

// Define slot types
export interface SequencerSlot {
  type: "sequencer";
  sequencer: any;
  index: number;
}

export interface EmptySlot {
  type: "empty";
  sequencer: null;
  index: number;
}

export type GridSlot = SequencerSlot | EmptySlot;

/**
 * Sequencer grid management and utilities
 */
export function useSequencerGrid() {
  const sequencerStore = useSequencerStore();

  // Store connections
  const sequencers = computed(() => sequencerStore.sequencers);
  const activeSequencer = computed(() => sequencerStore.activeSequencer);

  // Grid configuration
  const maxSlots = 16;
  const gridCols = 4;

  // Create grid slots (16 total)
  const gridSlots = computed((): GridSlot[] => {
    const slots: GridSlot[] = [];

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

  // Theme and display utilities
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

  // Grid actions
  const addNewSequencer = () => {
    if (sequencers.value.length < maxSlots) {
      sequencerStore.createSequencer();
      return true;
    }
    return false;
  };

  const canAddSequencer = computed(() => sequencers.value.length < maxSlots);

  // Key functions for slot identification
  const getSlotKey = (slot: GridSlot) => {
    return slot.type === "sequencer"
      ? slot.sequencer.id
      : `empty-${slot.index}`;
  };

  const isActiveSlot = (slot: GridSlot) => {
    return (
      slot.type === "sequencer" &&
      slot.sequencer.id === activeSequencer.value?.id
    );
  };

  // Grid layout helpers
  const getSlotPosition = (index: number) => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    return { row, col };
  };

  return {
    // State
    sequencers,
    activeSequencer,
    gridSlots,

    // Configuration
    maxSlots,
    gridCols,
    canAddSequencer,

    // Utilities
    getThemeColor,
    getSequencerDisplayName,
    getSequencerIcon,
    getSlotKey,
    isActiveSlot,
    getSlotPosition,

    // Actions
    addNewSequencer,
  };
}
