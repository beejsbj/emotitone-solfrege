import { defineComponent, nextTick, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMidiControls } from "@/composables/useMidiControls";
import type { DevMidiWindow, MidiSessionState } from "@/types/midi";

const mocks = vi.hoisted(() => {
  const activeTouches = new Map<string, string>();
  const midi = {
    isSupported: true,
    isConnecting: false,
    isListening: false,
    connectedInputs: [] as string[],
    connectedOutputs: [] as string[],
    syncedOutput: null as string | null,
    lastError: null as string | null,
  };

  return {
    attack: vi.fn(),
    release: vi.fn(),
    drawer: {
      touch: { activeTouches },
      midi,
      keyboardConfig: { mainOctave: 4 },
      hasActiveTouch: vi.fn((pressId: string) => activeTouches.has(pressId)),
      addTouch: vi.fn((pressId: string, noteKey: string) => {
        activeTouches.set(pressId, noteKey);
      }),
      removeTouch: vi.fn((pressId: string) => {
        activeTouches.delete(pressId);
      }),
      activateVisualNote: vi.fn(),
      releaseVisualNote: vi.fn(),
      clearVisualNotes: vi.fn(),
      setMidiSessionState: vi.fn((state: MidiSessionState) => {
        Object.assign(midi, state);
      }),
    },
  };
});

vi.mock("@/stores/music", () => ({
  useMusicStore: () => ({
    currentKey: "C",
    currentMode: "major",
    attackNoteWithOctave: mocks.attack,
    releaseNote: mocks.release,
    parseNoteInput: (note: string) => note === "C4"
      ? { solfegeIndex: 0, octave: 4 }
      : null,
    getNoteName: (solfegeIndex: number, octave: number) =>
      solfegeIndex === 0 && octave === 4 ? "C4" : "unplayable",
  }),
}));

vi.mock("@/stores/keyboardDrawer", () => ({
  useKeyboardDrawerStore: () => mocks.drawer,
}));

vi.mock("@/composables/useVisualConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/composables/useVisualConfig")>();
  return {
    ...actual,
    useVisualConfig: () => ({
      dynamicColorConfig: ref(actual.DEFAULT_CONFIG.dynamicColors),
    }),
  };
});

describe("useMidiControls adapters", () => {
  let wrapper: VueWrapper | null;
  let midi: ReturnType<typeof createBrowserMidiAccess>;
  let addEventListener: ReturnType<typeof vi.spyOn>;
  let removeEventListener: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.drawer.touch.activeTouches.clear();
    Object.assign(mocks.drawer.midi, {
      isSupported: true,
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: null,
    });
    let noteSequence = 0;
    mocks.attack.mockImplementation(async () => `note-${++noteSequence}`);
    midi = createBrowserMidiAccess();
    installMidiAccess(midi.access);
    addEventListener = vi.spyOn(window, "addEventListener");
    removeEventListener = vi.spyOn(window, "removeEventListener");
    wrapper = null;
  });

  afterEach(() => {
    wrapper?.unmount();
    addEventListener.mockRestore();
    removeEventListener.mockRestore();
    delete (window as DevMidiWindow).__emotitoneMidiSim;
    vi.useRealTimers();
  });

  it("wires browser MIDI and window events on mount, then removes them", async () => {
    wrapper = mountMidiControls();
    await flushPromises();

    expect(navigator.requestMIDIAccess).toHaveBeenCalledOnce();
    expect(midi.input.onmidimessage).toEqual(expect.any(Function));
    expect(midi.access.onstatechange).toEqual(expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith(
      "note-played",
      expect.any(Function)
    );
    expect(addEventListener).toHaveBeenCalledWith(
      "note-released",
      expect.any(Function)
    );
    expect(mocks.drawer.midi).toMatchObject({
      isListening: true,
      connectedInputs: ["LUMI Keys Block"],
      connectedOutputs: ["LUMI Keys Block"],
      syncedOutput: "LUMI Keys Block",
    });

    midi.output.send.mockClear();
    dispatchWindowEvent(addEventListener, new CustomEvent("note-played", {
      detail: { noteId: "window-note", noteName: "C4" },
    }));
    dispatchWindowEvent(addEventListener, new CustomEvent("note-released", {
      detail: { noteId: "window-note", noteName: "C4" },
    }));
    expect(midi.output.send).toHaveBeenCalledWith([0x90, 60, 100], undefined);
    expect(midi.output.send).toHaveBeenCalledWith([0x80, 60, 0], undefined);
    expect(mocks.drawer.activateVisualNote).toHaveBeenCalledWith(
      "window-note",
      "0_4"
    );
    expect(mocks.drawer.releaseVisualNote).toHaveBeenCalledWith("window-note");

    wrapper.unmount();
    wrapper = null;
    expect(midi.input.onmidimessage).toBeNull();
    expect(midi.access.onstatechange).toBeNull();
    expect(removeEventListener).toHaveBeenCalledWith(
      "note-played",
      expect.any(Function)
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "note-released",
      expect.any(Function)
    );
    expect(mocks.drawer.clearVisualNotes).toHaveBeenCalledOnce();
    expect(mocks.drawer.midi).toMatchObject({
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
    });
  });

  it("adapts browser hotplug snapshots without moving lifecycle rules into Vue", async () => {
    wrapper = mountMidiControls();
    await flushPromises();

    const originalInput = midi.input;
    const replacement = createInput("input", "Replacement controller");
    midi.access.inputs = new Map([[replacement.id, replacement]]) as MIDIAccess["inputs"];
    midi.access.onstatechange?.({ port: replacement } as MIDIConnectionEvent);

    expect(originalInput.onmidimessage).toBeNull();
    expect(replacement.onmidimessage).toEqual(expect.any(Function));
    expect(mocks.drawer.midi.connectedInputs).toEqual([
      "Replacement controller",
    ]);
  });

  it("feeds the development simulator through the same session and clears timers", async () => {
    vi.useFakeTimers();
    wrapper = mountMidiControls();
    await flushPromises();
    const devWindow = window as DevMidiWindow;

    expect(devWindow.__emotitoneMidiSim).toBeDefined();
    devWindow.__emotitoneMidiSim?.noteOn("C4", 90, 2);
    await flushPromises();
    expect(mocks.attack).toHaveBeenCalledWith(0, 4);
    expect(mocks.drawer.addTouch).toHaveBeenCalledWith(
      "midi:__dev_virtual_input__:2:60",
      "0_4"
    );

    devWindow.__emotitoneMidiSim?.noteOff("C4", 2);
    expect(mocks.release).toHaveBeenCalledWith("note-1");
    devWindow.__emotitoneMidiSim?.tap("C4", 50);
    await flushPromises();

    wrapper.unmount();
    wrapper = null;
    const releasesAfterUnmount = mocks.release.mock.calls.length;
    expect(devWindow.__emotitoneMidiSim).toBeUndefined();

    vi.advanceTimersByTime(50);
    expect(mocks.release).toHaveBeenCalledTimes(releasesAfterUnmount);
  });
});

function mountMidiControls() {
  const Host = defineComponent({
    setup() {
      useMidiControls();
      return () => null;
    },
  });
  return mount(Host);
}

function createBrowserMidiAccess() {
  const input = createInput("input", "LUMI Keys Block");
  const output = {
    id: "output",
    name: "LUMI Keys Block",
    state: "connected" as MIDIPortDeviceState,
    type: "output" as MIDIPortType,
    send: vi.fn(),
  };
  const access = {
    inputs: new Map([[input.id, input]]) as MIDIAccess["inputs"],
    outputs: new Map([[output.id, output]]) as MIDIAccess["outputs"],
    onstatechange: null as ((event: MIDIConnectionEvent) => void) | null,
  };
  return { access, input, output };
}

function createInput(id: string, name: string) {
  return {
    id,
    name,
    state: "connected" as MIDIPortDeviceState,
    type: "input" as MIDIPortType,
    onmidimessage: null as ((event: MIDIMessageEvent) => void) | null,
  };
}

function installMidiAccess(access: ReturnType<typeof createBrowserMidiAccess>["access"]) {
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: vi.fn().mockResolvedValue(access),
  });
}

async function flushPromises() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
}

function dispatchWindowEvent(
  listenerSpy: ReturnType<typeof vi.spyOn>,
  event: Event
) {
  for (const [type, listener] of listenerSpy.mock.calls) {
    if (type === event.type && typeof listener === "function") {
      listener(event);
    }
  }
}
