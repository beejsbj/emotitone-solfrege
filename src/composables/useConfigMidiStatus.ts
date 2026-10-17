import { computed } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { isRoliMidiPortName, isVirtualMidiPortName } from "@/services/roliLiveSync";

export function useConfigMidiStatus() {
  const keyboardDrawerStore = useKeyboardDrawerStore();
  const connectedInputs = computed(() => keyboardDrawerStore.midi.connectedInputs);
  const connectedOutputs = computed(() => keyboardDrawerStore.midi.connectedOutputs);
  const physicalInputs = computed(() =>
    connectedInputs.value.filter((name) => !isVirtualMidiPortName(name))
  );
  const physicalOutputs = computed(() =>
    connectedOutputs.value.filter((name) => !isVirtualMidiPortName(name))
  );
  const virtualPortNames = computed(() =>
    Array.from(
      new Set(
        [...connectedInputs.value, ...connectedOutputs.value].filter((name) =>
          isVirtualMidiPortName(name)
        )
      )
    )
  );
  const hasConnectedInput = computed(() => physicalInputs.value.length > 0);
  const detectedRoliOutput = computed(
    () =>
      physicalOutputs.value.find((outputName) => isRoliMidiPortName(outputName))
      ?? null
  );
  const hasVirtualOnlyMidiPorts = computed(
    () =>
      !hasConnectedInput.value
      && !detectedRoliOutput.value
      && !keyboardDrawerStore.midi.syncedOutput
      && virtualPortNames.value.length > 0
  );

  const hasActionableMidiDevice = computed(
    () =>
      hasConnectedInput.value
      || Boolean(detectedRoliOutput.value)
      || Boolean(keyboardDrawerStore.midi.syncedOutput)
  );

  const midiStatusState = computed(() => {
    const midi = keyboardDrawerStore.midi;

    if (midi.lastError) {
      return "error";
    }

    if (midi.isConnecting) {
      return "connecting";
    }

    if (hasActionableMidiDevice.value) {
      return "connected";
    }

    return "idle";
  });

  const showMidiShortcut = computed(
    () => keyboardDrawerStore.midi.isSupported && hasActionableMidiDevice.value
  );

  const midiStatusHeadline = computed(() => {
    const midi = keyboardDrawerStore.midi;

    if (!midi.isSupported) {
      return "Browser MIDI unavailable";
    }

    if (midi.lastError) {
      return "MIDI permission blocked";
    }

    if (midi.isConnecting) {
      return "Requesting MIDI access";
    }

    if (midi.syncedOutput) {
      return `Live sync armed on ${midi.syncedOutput}`;
    }

    if (hasConnectedInput.value) {
      return "MIDI controller connected";
    }

    if (detectedRoliOutput.value) {
      return "ROLI/LUMI output detected";
    }

    if (hasVirtualOnlyMidiPorts.value) {
      return "Virtual MIDI ports detected";
    }

    if (physicalOutputs.value.length > 0) {
      return "MIDI output available";
    }

    if (midi.isListening) {
      return "MIDI ready for hot-plug";
    }

    return "Waiting for MIDI";
  });

  const midiStatusDetail = computed(() => {
    const midi = keyboardDrawerStore.midi;

    if (!midi.isSupported) {
      return "This browser does not expose the Web MIDI API, so external controllers cannot be connected here.";
    }

    if (midi.lastError) {
      return "The app still works with touch and QWERTY input, but browser MIDI access was not granted.";
    }

    if (hasVirtualOnlyMidiPorts.value) {
      const visiblePortList = virtualPortNames.value.join(", ");
      return `Chrome can see software MIDI ports like ${visiblePortList}. Those are virtual loopback connections, not physical controllers.`;
    }

    return roliSyncMessage.value;
  });

  const midiTriggerLabel = computed(() => {
    if (showMidiShortcut.value) {
      return `Open MIDI and ROLI controls. ${midiStatusHeadline.value}.`;
    }

    return `Open settings. ${midiStatusHeadline.value}.`;
  });

  const midiStatusClass = computed(() =>
    midiStatusState.value === "idle"
      ? "config-panel__midi-mark--quiet"
      : "config-panel__midi-mark--active"
  );

  const roliSyncMessage = computed(() => {
    const midi = keyboardDrawerStore.midi;

    if (midi.syncedOutput) {
      return `Live sync active on ${midi.syncedOutput}.`;
    }

    if (detectedRoliOutput.value) {
      return `ROLI output ${detectedRoliOutput.value} is connected. Load the script onto the keyboard to arm live sync.`;
    }

    if (physicalOutputs.value.length > 0) {
      return "MIDI outputs are connected, but none look like a ROLI/LUMI port yet.";
    }

    return "When a LUMI/ROLI MIDI output is connected, the app will mirror notes and push palette changes automatically after the script is loaded.";
  });

  return { connectedInputs, connectedOutputs, midiStatusState, showMidiShortcut, midiStatusHeadline, midiStatusDetail, midiTriggerLabel, midiStatusClass, roliSyncMessage };
}
