import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useConfigMidiStatus } from "@/composables/useConfigMidiStatus";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { ROLI_SCRIPT_VERSION } from "@/services/roliLiveSync";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("ROLI live-sync status", () => {
  it("does not claim live sync until the script answers", () => {
    const store = useKeyboardDrawerStore();
    const status = useConfigMidiStatus();
    store.midi.isSupported = true;
    store.setMidiSyncedOutput("ROLI Piano");
    expect(status.midiStatusHeadline.value).toBe("ROLI Piano connected, script not running");
    expect(status.roliSyncMessage.value).toMatch(/hasn't answered/);
  });

  it("says live sync is on once the current script answers", () => {
    const store = useKeyboardDrawerStore();
    const status = useConfigMidiStatus();
    store.midi.isSupported = true;
    store.setMidiSyncedOutput("ROLI Piano");
    store.setMidiSyncedScriptVersion(ROLI_SCRIPT_VERSION);
    expect(status.midiStatusHeadline.value).toBe("Live sync on ROLI Piano");
    expect(status.roliSyncMessage.value).toMatch(/running the EmotiTone script/);
  });

  it("asks for a reload when an older script answers", () => {
    const store = useKeyboardDrawerStore();
    const status = useConfigMidiStatus();
    store.setMidiSyncedOutput("ROLI Piano");
    store.setMidiSyncedScriptVersion(ROLI_SCRIPT_VERSION - 1);
    expect(status.roliSyncMessage.value).toMatch(/older EmotiTone script/);
  });

  it("forgets the script when the synced output changes", () => {
    const store = useKeyboardDrawerStore();
    store.setMidiSyncedOutput("ROLI Piano");
    store.setMidiSyncedScriptVersion(ROLI_SCRIPT_VERSION);
    store.setMidiSyncedOutput(null);
    expect(store.midi.syncedScriptVersion).toBeNull();
  });
});
