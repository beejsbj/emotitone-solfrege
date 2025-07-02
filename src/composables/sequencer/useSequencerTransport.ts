import { ref } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { useSequencerInteraction } from "./useSequencerInteraction";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

interface PressState {
  isPressed: boolean;
  timeout?: ReturnType<typeof setTimeout>;
  startTime: number;
  transport?: any;
}

/**
 * Sequencer transport and playback management
 */
export function useSequencerTransport() {
  const sequencerStore = useSequencerStore();
  const { isDoubleTap } = useSequencerInteraction();

  // State management
  const lastTapTime = ref<{ [key: string]: number }>({});
  const pressState = ref<{ [key: string]: PressState }>({});

  // Transport logic
  const startSequencerPlayback = async (sequencerId: string) => {
    console.log("Starting sequencer playback for:", sequencerId);
    const sequencer = sequencerStore.sequencers.find(
      (s) => s.id === sequencerId
    );
    if (!sequencer || sequencer.beats.length === 0) {
      console.log("No sequencer or no beats");
      return null;
    }

    try {
      // Import the transport system
      const { MultiSequencerTransport } = await import("@/utils/sequencer");

      // Create a transport instance
      const transport = new MultiSequencerTransport();

      // Set the sequencer to playing in the store
      sequencerStore.startSequencer(sequencerId);

      // Start the transport with just this sequencer
      await transport.startSequencer(sequencer, sequencerStore.config.steps);

      console.log("Started sequencer successfully");
      return transport;
    } catch (error) {
      console.error("Error in sequencer playback:", error);
      return null;
    }
  };

  const stopSequencerPlayback = (sequencerId: string) => {
    const state = pressState.value[sequencerId];
    if (!state) return;

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
    sequencerStore.stopSequencer(sequencerId);
  };

  // Interaction handlers
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

    // Stop any playing transport
    stopSequencerPlayback(sequencerId);

    // Handle short press as tap for double-tap detection
    if (pressDuration < 200) {
      console.log(`Short press (${pressDuration}ms) - treating as tap`);

      const lastTap = lastTapTime.value[sequencerId] || 0;
      const timeSinceLastTap = now - lastTap;

      lastTapTime.value[sequencerId] = now;

      // Double tap detection (within 300ms)
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        console.log("Double tap detected from short press!");
        // Double tap - toggle selection
        if (sequencerStore.config.activeSequencerId === sequencerId) {
          console.log("Deselecting active sequencer");
          sequencerStore.setActiveSequencer("");
        } else {
          console.log("Selecting new sequencer");
          sequencerStore.setActiveSequencer(sequencerId);
        }
        triggerUIHaptic();
      }
    }
  };

  // Direct tap handler (for fallback)
  const handleSequencerTap = (sequencerId: string) => {
    const now = Date.now();
    const lastTap = lastTapTime.value[sequencerId] || 0;
    const timeDiff = now - lastTap;

    console.log(`Click on ${sequencerId}: timeDiff=${timeDiff}ms`);

    lastTapTime.value[sequencerId] = now;

    // Double tap detection (within 300ms)
    if (timeDiff < 300 && timeDiff > 0) {
      console.log("Double tap detected!");
      // Double tap - toggle selection
      if (sequencerStore.config.activeSequencerId === sequencerId) {
        sequencerStore.setActiveSequencer("");
      } else {
        sequencerStore.setActiveSequencer(sequencerId);
      }
      triggerUIHaptic();
    }
  };

  // State getters
  const isPressedState = (sequencerId: string) => {
    return pressState.value[sequencerId]?.isPressed || false;
  };

  const isPlayingState = (sequencerId: string) => {
    return pressState.value[sequencerId]?.transport != null;
  };

  // Cleanup
  const cleanup = () => {
    // Stop all transports and clear timeouts
    Object.keys(pressState.value).forEach((sequencerId) => {
      const state = pressState.value[sequencerId];
      if (state.timeout) {
        clearTimeout(state.timeout);
      }
      if (state.transport) {
        try {
          state.transport.stopAll();
          state.transport.dispose();
        } catch (error) {
          console.error("Error disposing transport:", error);
        }
      }
    });
    pressState.value = {};
  };

  return {
    // State
    pressState,
    lastTapTime,

    // Handlers
    handleSequencerPressStart,
    handleSequencerPressEnd,
    handleSequencerTap,

    // Transport
    startSequencerPlayback,
    stopSequencerPlayback,

    // State queries
    isPressedState,
    isPlayingState,

    // Cleanup
    cleanup,
  };
}
