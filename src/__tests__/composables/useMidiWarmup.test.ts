import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/instrument", async () => {
  const { reactive } = await vi.importActual<typeof import("vue")>("vue");
  const store = reactive({ isInteractionLocked: false });
  return {
    useInstrumentStore: () => store,
    testInstrumentStore: store,
  };
});

vi.mock("@/stores/music", () => {
  const store = {
    currentKey: "C",
    currentMode: "major",
    parseNoteInput: vi.fn(() => ({ solfegeIndex: 0, octave: 4 })),
    getNoteName: vi.fn(() => "C4"),
    attackNoteWithOctave: vi.fn().mockResolvedValue("midi-note-id"),
    releaseNote: vi.fn(),
  };
  return {
    useMusicStore: () => store,
    testMusicStore: store,
  };
});

vi.mock("@/stores/keyboardDrawer", () => {
  const store = {
    touch: { activeTouches: new Map<string, string>() },
    keyboardConfig: { mainOctave: 4 },
    midi: { isSupported: false },
    addTouch: vi.fn(),
    removeTouch: vi.fn(),
    activateVisualNote: vi.fn(),
    releaseVisualNote: vi.fn(),
    clearVisualNotes: vi.fn(),
    refreshMidiSupport: vi.fn(),
    setMidiInputs: vi.fn(),
    setMidiOutputs: vi.fn(),
    setMidiSyncedOutput: vi.fn(),
    setMidiConnecting: vi.fn(),
    setMidiListening: vi.fn(),
    setMidiError: vi.fn(),
  };
  return {
    useKeyboardDrawerStore: () => store,
    testKeyboardDrawerStore: store,
  };
});

vi.mock("@/composables/useVisualConfig", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  return {
    useVisualConfig: () => ({ dynamicColorConfig: ref({}) }),
  };
});

describe("MIDI warmup locking", () => {
  beforeEach(async () => {
    const instrumentModule = await import("@/stores/instrument") as unknown as {
      testInstrumentStore: { isInteractionLocked: boolean };
    };
    const musicModule = await import("@/stores/music") as unknown as {
      testMusicStore: {
        attackNoteWithOctave: ReturnType<typeof vi.fn>;
        releaseNote: ReturnType<typeof vi.fn>;
      };
    };
    const keyboardModule = await import("@/stores/keyboardDrawer") as unknown as {
      testKeyboardDrawerStore: {
        touch: { activeTouches: Map<string, string> };
        addTouch: ReturnType<typeof vi.fn>;
        removeTouch: ReturnType<typeof vi.fn>;
      };
    };

    instrumentModule.testInstrumentStore.isInteractionLocked = false;
    musicModule.testMusicStore.attackNoteWithOctave.mockReset();
    musicModule.testMusicStore.attackNoteWithOctave.mockResolvedValue("midi-note-id");
    musicModule.testMusicStore.releaseNote.mockReset();
    keyboardModule.testKeyboardDrawerStore.touch.activeTouches.clear();
    keyboardModule.testKeyboardDrawerStore.addTouch.mockReset();
    keyboardModule.testKeyboardDrawerStore.removeTouch.mockReset();
  });

  it("releases an active MIDI voice when instrument warmup starts", async () => {
    const { useMidiControls } = await import("@/composables/useMidiControls");
    const instrumentModule = await import("@/stores/instrument") as unknown as {
      testInstrumentStore: { isInteractionLocked: boolean };
    };
    const musicModule = await import("@/stores/music") as unknown as {
      testMusicStore: {
        attackNoteWithOctave: ReturnType<typeof vi.fn>;
        releaseNote: ReturnType<typeof vi.fn>;
      };
    };
    const keyboardModule = await import("@/stores/keyboardDrawer") as unknown as {
      testKeyboardDrawerStore: { removeTouch: ReturnType<typeof vi.fn> };
    };

    const wrapper = mount({
      template: "<div />",
      setup() {
        useMidiControls();
      },
    });
    const simulator = (window as typeof window & {
      __emotitoneMidiSim: { noteOn: (note: number) => void };
    }).__emotitoneMidiSim;

    simulator.noteOn(60);
    await vi.waitFor(() => {
      expect(musicModule.testMusicStore.attackNoteWithOctave).toHaveBeenCalledOnce();
    });
    await nextTick();

    instrumentModule.testInstrumentStore.isInteractionLocked = true;

    expect(musicModule.testMusicStore.releaseNote).toHaveBeenCalledWith(
      "midi-note-id"
    );
    expect(keyboardModule.testKeyboardDrawerStore.removeTouch).toHaveBeenCalledWith(
      "midi:__dev_virtual_input__:1:60"
    );
    wrapper.unmount();
  });

  it("releases a pending MIDI attack that resolves after warmup starts", async () => {
    let resolveAttack!: (noteId: string) => void;
    const pendingAttack = new Promise<string>((resolve) => {
      resolveAttack = resolve;
    });
    const { useMidiControls } = await import("@/composables/useMidiControls");
    const instrumentModule = await import("@/stores/instrument") as unknown as {
      testInstrumentStore: { isInteractionLocked: boolean };
    };
    const musicModule = await import("@/stores/music") as unknown as {
      testMusicStore: {
        attackNoteWithOctave: ReturnType<typeof vi.fn>;
        releaseNote: ReturnType<typeof vi.fn>;
      };
    };
    musicModule.testMusicStore.attackNoteWithOctave.mockReturnValueOnce(
      pendingAttack
    );

    const wrapper = mount({
      template: "<div />",
      setup() {
        useMidiControls();
      },
    });
    const simulator = (window as typeof window & {
      __emotitoneMidiSim: { noteOn: (note: number) => void };
    }).__emotitoneMidiSim;

    simulator.noteOn(60);
    instrumentModule.testInstrumentStore.isInteractionLocked = true;
    resolveAttack("late-midi-note-id");

    await vi.waitFor(() => {
      expect(musicModule.testMusicStore.releaseNote).toHaveBeenCalledWith(
        "late-midi-note-id"
      );
    });
    wrapper.unmount();
  });
});
