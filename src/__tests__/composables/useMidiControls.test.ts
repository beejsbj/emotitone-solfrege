import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const windowAddEventListenerSpy = vi.spyOn(window, "addEventListener");

const mocks = vi.hoisted(() => ({
  attack: vi.fn(),
  release: vi.fn(),
  addTouch: vi.fn(),
  removeTouch: vi.fn(),
  drawer: {
    touch: { activeTouches: new Map<string, string>() },
    midi: { isSupported: true },
    keyboardConfig: { mainOctave: 4 },
    refreshMidiSupport: vi.fn(),
    addTouch: vi.fn(),
    removeTouch: vi.fn(),
    activateVisualNote: vi.fn(),
    releaseVisualNote: vi.fn(),
    clearVisualNotes: vi.fn(),
    setMidiInputs: vi.fn(),
    setMidiOutputs: vi.fn(),
    setMidiSyncedOutput: vi.fn(),
    setMidiConnecting: vi.fn(),
    setMidiListening: vi.fn(),
    setMidiError: vi.fn(),
  },
}));

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
import {
  hasActiveTouchPress,
  midiNoteNumberToName,
  resolveMirroredEventDurationMs,
  resolveMirroredMidiNoteNumber,
  resolvePlayableMidiNote,
  resolveVisualNoteKey,
  useMidiControls,
} from "@/composables/useMidiControls";

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

describe("useMidiControls helpers", () => {
  it("detects active touches from both hydrated maps and plain persisted objects", () => {
    expect(
      hasActiveTouchPress(
        new Map([
          ["midi:test:1:60", "0_4"],
        ]),
        "midi:test:1:60"
      )
    ).toBe(true);

    expect(
      hasActiveTouchPress(
        { "midi:test:1:61": "1_4" },
        "midi:test:1:61"
      )
    ).toBe(true);

    expect(hasActiveTouchPress(null, "midi:test:1:62")).toBe(false);
  });

  it("converts MIDI note numbers into chromatic note names", () => {
    expect(midiNoteNumberToName(21)).toBe("A0");
    expect(midiNoteNumberToName(60)).toBe("C4");
    expect(midiNoteNumberToName(73)).toBe("C#5");
  });

  it("accepts MIDI notes that round-trip exactly into the current scale", () => {
    const noteResolver = {
      parseNoteInput: vi.fn().mockReturnValue({ solfegeIndex: 0, octave: 4 }),
      getNoteName: vi.fn().mockReturnValue("C4"),
    };

    expect(resolvePlayableMidiNote(60, noteResolver)).toEqual({
      solfegeIndex: 0,
      octave: 4,
    });
    expect(noteResolver.parseNoteInput).toHaveBeenCalledWith("C4");
  });

  it("rejects MIDI notes that would be quantized to a different scale tone", () => {
    const noteResolver = {
      parseNoteInput: vi.fn().mockReturnValue({ solfegeIndex: 0, octave: 4 }),
      getNoteName: vi.fn().mockReturnValue("C4"),
    };

    expect(resolvePlayableMidiNote(61, noteResolver)).toBeNull();
    expect(noteResolver.parseNoteInput).toHaveBeenCalledWith("C#4");
  });

  it("resolves visual note keys from explicit solfege data or chromatic note names", () => {
    const noteResolver = {
      parseNoteInput: vi.fn().mockReturnValue({ solfegeIndex: 2, octave: 5 }),
      getNoteName: vi.fn(),
    };

    expect(
      resolveVisualNoteKey(
        { solfegeIndex: 1, octave: 4, noteName: "D4" },
        noteResolver
      )
    ).toBe("1_4");

    expect(
      resolveVisualNoteKey(
        { noteName: "E5" },
        noteResolver
      )
    ).toBe("2_5");
    expect(noteResolver.parseNoteInput).toHaveBeenCalledWith("E5");
  });

  it("derives mirrored durations from durationMs, notation, or fallback defaults", () => {
    expect(resolveMirroredEventDurationMs({ durationMs: 240 })).toBe(240);
    expect(resolveMirroredEventDurationMs({ duration: "8n" })).toBe(250);
    expect(resolveMirroredEventDurationMs({})).toBe(500);
  });

  it("resolves mirrored MIDI notes from solfege data before falling back to note names", () => {
    const noteResolver = {
      parseNoteInput: vi.fn(),
      getNoteName: vi.fn().mockReturnValue("F#4"),
    };

    expect(
      resolveMirroredMidiNoteNumber(
        { solfegeIndex: 3, octave: 4, noteName: "ignored" },
        noteResolver
      )
    ).toBe(66);

    expect(
      resolveMirroredMidiNoteNumber(
        { noteName: "Bb3" },
        noteResolver
      )
    ).toBe(58);
  });
});

describe("useMidiControls held note lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.attack.mockReset();
    mocks.release.mockReset();
    windowAddEventListenerSpy.mockClear();
    mocks.drawer.touch.activeTouches.clear();
    mocks.drawer.midi.isSupported = true;
    mocks.drawer.addTouch.mockImplementation((pressId: string, noteKey: string) => {
      mocks.drawer.touch.activeTouches.set(pressId, noteKey);
    });
    mocks.drawer.removeTouch.mockImplementation((pressId: string) => {
      mocks.drawer.touch.activeTouches.delete(pressId);
    });
  });

  it("cancels a pending ROLI press without echoing its music events", async () => {
    const attack = deferred<string | null>();
    const eventOrder: string[] = [];
    mocks.attack.mockImplementationOnce(async () => {
      const noteId = await attack.promise;
      if (noteId) {
        eventOrder.push("note-played");
        dispatchWindowEvent(new CustomEvent("note-played", {
          detail: { noteId, noteName: "C4", solfegeIndex: 0, octave: 4 },
        }));
      }
      return noteId;
    });
    mocks.release.mockImplementation((noteId: string) => {
      eventOrder.push("note-released");
      dispatchWindowEvent(new CustomEvent("note-released", {
        detail: { noteId, noteName: "C4", solfegeIndex: 0, octave: 4 },
      }));
    });
    const midi = createMidiAccess();
    installMidiAccess(midi.access);
    const wrapper = mountMidiControls();
    await flushPromises();
    midi.send.mockClear();

    midi.message([0x90, 60, 100]);
    expect(mocks.drawer.addTouch).toHaveBeenCalledWith("midi:roli-in:1:60", "0_4");
    midi.message([0x80, 60, 0]);
    expect(mocks.drawer.removeTouch).toHaveBeenCalledWith("midi:roli-in:1:60");

    attack.resolve("midi-note");
    await flushPromises();

    expect(mocks.release).toHaveBeenCalledWith("midi-note");
    expect(eventOrder).toEqual(["note-played", "note-released"]);
    expect(midi.send).not.toHaveBeenCalledWith([0x90, 60, 100]);
    expect(midi.send).not.toHaveBeenCalledWith([0x80, 60, 0]);
    wrapper.unmount();
  });

  it("cancels pending attacks from a disconnected MIDI input", async () => {
    const attack = deferred<string | null>();
    mocks.attack.mockReturnValueOnce(attack.promise);
    const midi = createMidiAccess();
    installMidiAccess(midi.access);
    const wrapper = mountMidiControls();
    await flushPromises();

    midi.message([0x90, 60, 100]);
    midi.input.state = "disconnected";
    midi.access.onstatechange?.({ port: midi.input } as MIDIConnectionEvent);
    attack.resolve("disconnected-note");
    await flushPromises();

    expect(mocks.release).toHaveBeenCalledWith("disconnected-note");
    expect(mocks.drawer.touch.activeTouches).toHaveLength(0);
    wrapper.unmount();
  });

  it("cleans a failed MIDI attack so the same physical key can retry", async () => {
    const failed = deferred<string | null>();
    mocks.attack
      .mockReturnValueOnce(failed.promise)
      .mockResolvedValueOnce("retried-note");
    const midi = createMidiAccess("Generic MIDI Controller");
    installMidiAccess(midi.access);
    const wrapper = mountMidiControls();
    await flushPromises();

    midi.message([0x90, 60, 100]);
    failed.reject(new Error("audio unavailable"));
    await flushPromises();
    expect(mocks.drawer.touch.activeTouches).toHaveLength(0);

    midi.message([0x90, 60, 100]);
    await flushPromises();
    expect(mocks.attack).toHaveBeenCalledTimes(2);
    expect(mocks.drawer.touch.activeTouches.has("midi:roli-in:1:60")).toBe(true);

    midi.message([0x80, 60, 0]);
    expect(mocks.release).toHaveBeenCalledWith("retried-note");
    wrapper.unmount();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function mountMidiControls() {
  const Host = defineComponent({
    setup() {
      useMidiControls();
      return () => null;
    },
  });
  return mount(Host);
}

function createMidiAccess(inputName = "LUMI Keys Block") {
  const send = vi.fn();
  const input = {
    id: "roli-in",
    name: inputName,
    state: "connected" as MIDIPortDeviceState,
    type: "input" as MIDIPortType,
    onmidimessage: null as ((event: MIDIMessageEvent) => void) | null,
  };
  const output = {
    id: "roli-out",
    name: "LUMI Keys Block",
    state: "connected" as MIDIPortDeviceState,
    type: "output" as MIDIPortType,
    send,
  };
  const access = {
    inputs: new Map([[input.id, input]]),
    outputs: new Map([[output.id, output]]),
    onstatechange: null as ((event: MIDIConnectionEvent) => void) | null,
  };

  return {
    access,
    input,
    send,
    message(data: number[]) {
      input.onmidimessage?.({ data: new Uint8Array(data) } as MIDIMessageEvent);
    },
  };
}

function installMidiAccess(access: ReturnType<typeof createMidiAccess>["access"]) {
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: vi.fn().mockResolvedValue(access),
  });
}

function dispatchWindowEvent(event: Event) {
  for (const [type, listener] of windowAddEventListenerSpy.mock.calls) {
    if (type === event.type && typeof listener === "function") {
      listener(event);
    }
  }
}

async function flushPromises() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
}
