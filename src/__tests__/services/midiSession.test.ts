import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "@/composables/useVisualConfig";
import { createMidiSession } from "@/services/midiSession";
import type {
  MidiAccessAdapter,
  MidiInputPortAdapter,
  MidiMessageHandler,
  MidiOutputPortAdapter,
  MidiPortStateChangeHandler,
  MidiSession,
  MidiSessionEffects,
  MidiSessionState,
} from "@/types/midi";

describe("MIDI session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets only the latest connection request establish the session", async () => {
    const first = deferred<MidiAccessAdapter>();
    const second = deferred<MidiAccessAdapter>();
    const requests = [first, second];
    const harness = createHarness({
      requestAccess: vi.fn(() => requests.shift()!.promise),
    });
    const staleAccess = new FakeMidiAccess([
      new FakeMidiInput("stale", "Stale controller"),
    ]);
    const currentInput = new FakeMidiInput("current", "Current controller");
    const currentAccess = new FakeMidiAccess([currentInput]);

    const staleConnection = harness.session.connect();
    expect(harness.session.getState()).toMatchObject({
      isConnecting: true,
      isListening: false,
      lastError: null,
    });

    harness.session.disconnect();
    const currentConnection = harness.session.connect();
    second.resolve(currentAccess);
    await currentConnection;

    expect(harness.session.getState()).toMatchObject({
      isConnecting: false,
      isListening: true,
      connectedInputs: ["Current controller"],
    });
    expect(currentAccess.stateChangeHandler).toEqual(expect.any(Function));
    expect(currentInput.messageHandler).toEqual(expect.any(Function));

    first.resolve(staleAccess);
    await staleConnection;

    expect(harness.session.getState().connectedInputs).toEqual([
      "Current controller",
    ]);
    expect(staleAccess.stateChangeHandler).toBeNull();
    expect(staleAccess.inputs[0].messageHandler).toBeNull();
  });

  it("ignores a rejected access request after disposal", async () => {
    const access = deferred<MidiAccessAdapter>();
    const harness = createHarness({ requestAccess: () => access.promise });
    const connection = harness.session.connect();

    harness.session.dispose();
    access.reject(new Error("late permission rejection"));
    await connection;

    expect(harness.session.getState()).toEqual({
      isSupported: true,
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: null,
    });
  });

  it("ignores a stale rejection after disconnect and reconnect", async () => {
    const stale = deferred<MidiAccessAdapter>();
    const currentAccess = new FakeMidiAccess([
      new FakeMidiInput("current", "Current controller"),
    ]);
    const requestAccess = vi
      .fn<() => Promise<MidiAccessAdapter>>()
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce(currentAccess);
    const harness = createHarness({ requestAccess });

    const staleConnection = harness.session.connect();
    harness.session.disconnect();
    await harness.session.connect();
    stale.reject(new Error("stale denial"));
    await staleConnection;

    expect(harness.session.getState()).toMatchObject({
      isConnecting: false,
      isListening: true,
      connectedInputs: ["Current controller"],
      lastError: null,
    });
  });

  it("publishes failure atomically and can retry", async () => {
    const successfulAccess = new FakeMidiAccess([
      new FakeMidiInput("retry", "Retry controller"),
    ]);
    const requestAccess = vi
      .fn<() => Promise<MidiAccessAdapter>>()
      .mockRejectedValueOnce(new Error("permission denied"))
      .mockResolvedValueOnce(successfulAccess);
    const harness = createHarness({ requestAccess });

    await harness.session.connect();
    expect(harness.session.getState()).toEqual({
      isSupported: true,
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: "permission denied",
    });

    await harness.session.connect();
    expect(harness.session.getState()).toMatchObject({
      isConnecting: false,
      isListening: true,
      connectedInputs: ["Retry controller"],
      lastError: null,
    });
  });

  it("owns input hotplug, replacement, removal, and held-note cleanup", async () => {
    const original = new FakeMidiInput("keys", "Original keys");
    const access = new FakeMidiAccess([original]);
    const harness = createHarness({ requestAccess: async () => access });
    harness.effects.attackNote.mockResolvedValue("held-note");
    await harness.session.connect();

    original.message([0x90, 60, 100]);
    await flushPromises();
    expect(harness.effects.attackNote).toHaveBeenCalledWith(0, 4);
    expect(harness.effects.pressKey).toHaveBeenCalledWith(
      "midi:keys:1:60",
      "0_4"
    );

    const replacement = new FakeMidiInput("keys", "Replacement keys");
    access.inputs = [replacement];
    access.change();

    expect(original.messageHandler).toBeNull();
    expect(replacement.messageHandler).toEqual(expect.any(Function));
    expect(harness.effects.releaseNote).toHaveBeenCalledWith("held-note");
    expect(harness.session.getState().connectedInputs).toEqual([
      "Replacement keys",
    ]);

    access.inputs = [];
    access.change();
    expect(replacement.messageHandler).toBeNull();
    expect(harness.session.getState().connectedInputs).toEqual([]);

    const hotplugged = new FakeMidiInput("hotplugged", "Hotplugged keys");
    access.inputs = [hotplugged];
    access.change();
    expect(hotplugged.messageHandler).toEqual(expect.any(Function));
    expect(harness.session.getState().connectedInputs).toEqual([
      "Hotplugged keys",
    ]);
  });

  it("treats output replacement and removal as cleanup transitions", async () => {
    const original = new FakeMidiOutput("roli", "LUMI Keys Block");
    const access = new FakeMidiAccess([], [original]);
    const harness = createHarness({ requestAccess: async () => access });
    await harness.session.connect();
    original.send.mockClear();

    harness.session.notePlayed({ noteId: "app-note", noteName: "C4" });
    expect(original.send).toHaveBeenCalledWith([0x90, 60, 100], undefined);

    const replacement = new FakeMidiOutput("roli", "LUMI Keys Block 2");
    access.outputs = [replacement];
    access.change();

    expect(original.send).toHaveBeenCalledWith([0xbf, 120, 0], undefined);
    expect(original.send).toHaveBeenCalledWith([0xbf, 123, 0], undefined);
    expect(replacement.send).toHaveBeenCalledWith([0xbf, 111, 4], undefined);
    expect(harness.session.getState()).toMatchObject({
      connectedOutputs: ["LUMI Keys Block 2"],
      syncedOutput: "LUMI Keys Block 2",
    });

    replacement.send.mockClear();
    access.outputs = [];
    access.change();
    expect(replacement.send).toHaveBeenCalledWith([0xbf, 120, 0], undefined);
    expect(replacement.send).toHaveBeenCalledWith([0xbf, 123, 0], undefined);
    expect(harness.session.getState()).toMatchObject({
      connectedOutputs: [],
      syncedOutput: null,
    });

    const hotplugged = new FakeMidiOutput("new-roli", "ROLI Lightpad BLOCK");
    access.outputs = [hotplugged];
    access.change();
    expect(hotplugged.send).toHaveBeenCalledWith([0xbf, 111, 4], undefined);
    expect(harness.session.getState()).toMatchObject({
      connectedOutputs: ["ROLI Lightpad BLOCK"],
      syncedOutput: "ROLI Lightpad BLOCK",
    });
  });

  it("routes packet and velocity rules through held-note ownership", async () => {
    const harness = createHarness();
    harness.effects.attackNote
      .mockResolvedValueOnce("first-C")
      .mockResolvedValueOnce("channel-two-C");

    harness.session.receivePacket("dev", [0x70, 60, 100]);
    harness.session.receivePacket("dev", [0x90, 61, 100]);
    harness.session.receivePacket("dev", [0x90, 60, 128]);
    harness.session.receivePacket("dev", [0x90, 60, 100]);
    harness.session.receivePacket("dev", [0x90, 60, 127]);
    harness.session.receivePacket("dev", [0x91, 60, 1]);
    await flushPromises();

    expect(harness.effects.attackNote).toHaveBeenCalledTimes(2);
    expect(harness.effects.pressKey).toHaveBeenCalledWith(
      "midi:dev:1:60",
      "0_4"
    );
    expect(harness.effects.pressKey).toHaveBeenCalledWith(
      "midi:dev:2:60",
      "0_4"
    );

    harness.session.receivePacket("dev", [0x90, 60, 0]);
    harness.session.receivePacket("dev", [0x81, 60, 0]);
    expect(harness.effects.releaseNote).toHaveBeenCalledWith("first-C");
    expect(harness.effects.releaseNote).toHaveBeenCalledWith("channel-two-C");
  });

  it("releases held input and blocks new attacks while input is disabled", async () => {
    const harness = createHarness();
    harness.effects.attackNote.mockResolvedValue("held");

    harness.session.receivePacket("dev", [0x90, 60, 100]);
    await flushPromises();
    harness.session.setInputEnabled(false);

    expect(harness.effects.releaseNote).toHaveBeenCalledWith("held");
    harness.session.receivePacket("dev", [0x91, 60, 100]);
    expect(harness.effects.attackNote).toHaveBeenCalledOnce();

    harness.session.setInputEnabled(true);
    harness.session.receivePacket("dev", [0x91, 60, 100]);
    expect(harness.effects.attackNote).toHaveBeenCalledTimes(2);
  });

  it("suppresses ROLI input echoes in note-on and release order", async () => {
    const input = new FakeMidiInput("roli-in", "LUMI Keys Block");
    const output = new FakeMidiOutput("roli-out", "LUMI Keys Block");
    const access = new FakeMidiAccess([input], [output]);
    const harness = createHarness({ requestAccess: async () => access });
    harness.effects.attackNote.mockImplementation(async () => {
      harness.session.notePlayed({
        noteId: "roli-note",
        noteName: "C4",
        solfegeIndex: 0,
        octave: 4,
      });
      return "roli-note";
    });
    harness.effects.releaseNote.mockImplementation(() => {
      harness.session.noteReleased({
        noteId: "roli-note",
        noteName: "C4",
      });
    });
    await harness.session.connect();
    output.send.mockClear();

    input.message([0x90, 60, 100]);
    await flushPromises();
    input.message([0x80, 60, 0]);

    expect(output.send).not.toHaveBeenCalledWith([0x90, 60, 100], undefined);
    expect(output.send).not.toHaveBeenCalledWith([0x80, 60, 0], undefined);
    expect(harness.effects.releaseNote).toHaveBeenCalledWith("roli-note");
  });

  it("mirrors owned releases and timeout releases while honoring opt-out", async () => {
    const output = new FakeMidiOutput("roli", "LUMI Keys Block");
    const harness = createHarness({
      requestAccess: async () => new FakeMidiAccess([], [output]),
    });
    await harness.session.connect();
    output.send.mockClear();

    harness.session.notePlayed({ noteId: "owned", noteName: "C4" });
    harness.session.noteReleased({ noteId: "owned", noteName: "C4" });
    harness.session.notePlayed({ noteName: "C4", duration: "8n" });
    harness.session.notePlayed({
      noteName: "C4",
      durationMs: 40,
      mirrorMidi: false,
    });

    expect(output.send).toHaveBeenCalledTimes(3);
    expect(output.send).toHaveBeenNthCalledWith(1, [0x90, 60, 100], undefined);
    expect(output.send).toHaveBeenNthCalledWith(2, [0x80, 60, 0], undefined);
    expect(output.send).toHaveBeenNthCalledWith(3, [0x90, 60, 100], undefined);
    expect(harness.effects.activateVisualNote).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(249);
    expect(output.send).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(1);
    expect(output.send).toHaveBeenLastCalledWith([0x80, 60, 0], undefined);
  });

  it("owns palette and main-octave synchronization", async () => {
    const output = new FakeMidiOutput("roli", "LUMI Keys Block");
    const harness = createHarness({
      requestAccess: async () => new FakeMidiAccess([], [output]),
    });
    await harness.session.connect();
    output.send.mockClear();

    harness.session.syncPalette(
      { ...DEFAULT_CONFIG.dynamicColors, saturation: 0.45 },
      "D",
      "dorian"
    );
    expect(output.send).toHaveBeenCalledTimes(64);

    output.send.mockClear();
    harness.session.syncMainOctave(6);
    expect(output.send).toHaveBeenCalledOnce();
    expect(output.send).toHaveBeenCalledWith([0xbf, 111, 6], undefined);
  });

  it("disposes listeners, timers, status, touches, and eventual voices", async () => {
    const pendingAttack = deferred<string | null>();
    const input = new FakeMidiInput("keys", "Controller");
    const output = new FakeMidiOutput("roli", "LUMI Keys Block");
    const access = new FakeMidiAccess([input], [output]);
    const harness = createHarness({ requestAccess: async () => access });
    harness.effects.attackNote.mockReturnValue(pendingAttack.promise);
    await harness.session.connect();
    output.send.mockClear();

    input.message([0x90, 60, 100]);
    harness.session.notePlayed({ noteName: "C4", durationMs: 100 });
    harness.session.dispose();

    expect(input.messageHandler).toBeNull();
    expect(access.stateChangeHandler).toBeNull();
    expect(harness.effects.releaseKey).toHaveBeenCalledWith("midi:keys:1:60");
    expect(harness.effects.clearVisualNotes).toHaveBeenCalledOnce();
    expect(harness.session.getState()).toMatchObject({
      isConnecting: false,
      isListening: false,
      connectedInputs: [],
      connectedOutputs: [],
      syncedOutput: null,
      lastError: null,
    });

    const sendsAfterDispose = output.send.mock.calls.length;
    vi.advanceTimersByTime(100);
    expect(output.send).toHaveBeenCalledTimes(sendsAfterDispose);

    pendingAttack.resolve("late-note");
    await flushPromises();
    expect(harness.effects.releaseNote).toHaveBeenCalledWith("late-note");
  });
});

function createHarness(
  options: { requestAccess?: () => Promise<MidiAccessAdapter> } = {}
) {
  const states: MidiSessionState[] = [];
  const activePresses = new Map<string, string>();
  const effects = {
    attackNote: vi.fn<MidiSessionEffects["attackNote"]>(),
    releaseNote: vi.fn<MidiSessionEffects["releaseNote"]>(),
    parseNoteInput: vi.fn((note: string) =>
      note === "C4" ? { solfegeIndex: 0, octave: 4 } : null
    ),
    getNoteName: vi.fn((solfegeIndex: number, octave: number) =>
      solfegeIndex === 0 && octave === 4 ? "C4" : "unplayable"
    ),
    isPressActive: vi.fn((pressId: string) => activePresses.has(pressId)),
    pressKey: vi.fn((pressId: string, noteKey: string) => {
      activePresses.set(pressId, noteKey);
    }),
    releaseKey: vi.fn((pressId: string) => {
      activePresses.delete(pressId);
    }),
    activateVisualNote: vi.fn(),
    releaseVisualNote: vi.fn(),
    clearVisualNotes: vi.fn(),
    stateChanged: vi.fn((state: MidiSessionState) => states.push(state)),
  } satisfies MidiSessionEffects;
  effects.attackNote.mockResolvedValue("note");

  const session = createMidiSession({
    requestAccess: options.requestAccess,
    effects,
    sync: {
      dynamicColorConfig: DEFAULT_CONFIG.dynamicColors,
      currentKey: "C",
      currentMode: "major",
      mainOctave: 4,
    },
  });

  return { effects, session, states };
}

class FakeMidiInput implements MidiInputPortAdapter {
  messageHandler: MidiMessageHandler | null = null;

  constructor(
    readonly id: string,
    readonly name: string | null,
    public state = "connected"
  ) {}

  setMessageHandler(handler: MidiMessageHandler | null) {
    this.messageHandler = handler;
  }

  message(data: number[]) {
    this.messageHandler?.(data);
  }
}

class FakeMidiOutput implements MidiOutputPortAdapter {
  send = vi.fn<(message: number[], timestamp?: number) => void>();

  constructor(
    readonly id: string,
    readonly name: string | null,
    public state = "connected"
  ) {}
}

class FakeMidiAccess implements MidiAccessAdapter {
  stateChangeHandler: MidiPortStateChangeHandler | null = null;

  constructor(
    public inputs: FakeMidiInput[] = [],
    public outputs: FakeMidiOutput[] = []
  ) {}

  getInputs() {
    return this.inputs;
  }

  getOutputs() {
    return this.outputs;
  }

  setStateChangeHandler(handler: MidiPortStateChangeHandler | null) {
    this.stateChangeHandler = handler;
  }

  change() {
    this.stateChangeHandler?.();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
