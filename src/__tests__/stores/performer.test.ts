import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { LiveAudioCore } from "@/audio/live/core";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";

vi.unmock("@/services/music");
vi.unmock("@/data");
vi.unmock("@/composables/useVisualConfig");
const playback = vi.hoisted(() => ({
  renderer: null as LiveRenderer | null,
  listener: undefined as LiveRendererCallbacks | undefined,
}));
vi.mock("@/services/livePlayback", () => ({
  getLivePlayback: () => playback.renderer,
  waitForLivePlayback: () => undefined,
  subscribeLivePlayback: (listener: LiveRendererCallbacks) => {
    playback.listener = listener;
    return () => { playback.listener = undefined; };
  },
  needsLivePlaybackPreparation: () => false,
}));

import { KeyboardPerformanceHost } from "@/__tests__/helpers/keyboardPerformanceHost";
import { noteColorResolverKey, staticNoteColorResolver } from "@/components/primatives/noteColorContext";
import { KEY_REPEAT_WINDOW_MS, useKeyboardControls } from "@/composables/useKeyboardControls";
import { useMidiControls } from "@/composables/useMidiControls";
import { usePerformerStore } from "@/stores/performer";
import { useHarmonyAlterationStore } from "@/stores/harmonyAlteration";
import { buildHarmony } from "@/domain/harmony";
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useInstrumentStore } from "@/stores/instrument";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { PerformerIntent } from "@/services/performer";
import * as audio from "@/services/superdoughAudio";

/*
 * W3 acceptance at the performer seam. The stores, the performer, the
 * adapters and DOM events are real. Audio below the music store is either the
 * superdough boundary the suite already stubs (fallback path) or the real
 * worklet core rendered offline (live path). MIDI ports are fakes.
 */

const EPOCH = 1_800_000_000_000;
let pinia: Pinia;
const hosts: VueWrapper[] = [];
let midiDescriptor: PropertyDescriptor | undefined;

interface FakeInput {
  id: string;
  name: string;
  state: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}
let inputs: FakeInput[];
let access: { inputs: Map<string, FakeInput>; outputs: Map<string, unknown>; onstatechange: ((event: unknown) => void) | null };
let roliSend: ReturnType<typeof vi.fn>;

const settle = () => vi.advanceTimersByTimeAsync(0);
type KeyInit = NonNullable<ConstructorParameters<typeof KeyboardEvent>[1]>;
const key = (type: "keydown" | "keyup", code: string, init: KeyInit = {}) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, cancelable: true, ...init }));
const midi = (input: FakeInput, status: number, pitch: number, velocity = 100) =>
  input.onmidimessage!({ data: new Uint8Array([status, pitch, velocity]) });
const events = (type: string) => vi.mocked(window.dispatchEvent).mock.calls
  .map(([event]) => event as CustomEvent).filter((event) => event.type === type).map((event) => event.detail);
const attackedIds = () => vi.mocked(audio.attackNote).mock.calls.map(([noteId]) => noteId as string);
const touches = () => Array.from(useKeyboardDrawerStore().touch.activeTouches.keys()).sort();
/**
 * What the ROLI shows for a pitch now: replay its delivered queue. `clear()`
 * drops packets still waiting for their deadline, as Web MIDI does.
 */
let roliQueue: Array<{ message: number[]; at: number; index: number }>;
function roliShows(pitch: number) {
  let on = false;
  roliQueue
    .filter(({ message: [status, note], at }) => note === pitch && at <= performance.now()
      && ((status & 0xf0) === 0x90 || (status & 0xf0) === 0x80))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .forEach(({ message: [status] }) => { on = (status & 0xf0) === 0x90; });
  return on;
}
/** Middle C note-ons or note-offs sent to the ROLI output. */
const midiNotes = (status: number) => roliSend.mock.calls
  .map(([message]) => message as number[])
  .filter(([messageStatus, pitch]) => (messageStatus & 0xf0) === status && pitch === 60);

/** The next superdough attack waits until the returned function is called. */
function deferNextAttack() {
  let resolve!: () => void;
  vi.mocked(audio.attackNote).mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
  return () => resolve();
}

function mountHost(setup: () => void) {
  const host = mount(defineComponent({ setup() { setup(); return () => null; } }), {
    global: { plugins: [pinia] },
  });
  hosts.push(host);
  return host;
}
const mountQwerty = () => mountHost(() => { useKeyboardControls(ref(4)); });
async function mountMidi() {
  const host = mountHost(() => { useMidiControls(); });
  await settle();
  return host;
}

function addInput(id: string, name: string) {
  const input: FakeInput = { id, name, state: "connected", onmidimessage: null };
  inputs.push(input);
  access.inputs.set(id, input);
  return input;
}

/** A renderer over the real worklet core, as the live path drives it. */
function liveCore() {
  const sampleRate = 1000;
  let frame = 0;
  const core = new LiveAudioCore(sampleRate, (response) => {
    if (response.type === "event") playback.listener?.onEvent(response.event);
    else if (response.type === "plan") playback.listener?.onPlan?.(response.events);
    else if (response.type === "expression-owner") playback.listener?.onExpressionOwner?.(response);
    else if (response.type === "owner-ended") playback.listener?.onOwnerEnded?.(response.ownerId);
  });
  core.command({ type: "prepare", requestId: 1, instrument: {
    kind: "oscillator", waveform: "sine", instrumentId: "piano", gain: 1, attack: 0, decay: 0, sustain: 1, release: 0,
  } }, frame);
  playback.renderer = {
    press: (ownerId, notes) => core.command({ type: "press", ownerId, notes }, frame),
    release: (ownerId) => core.command({ type: "release", ownerId }, frame),
    setPitchBend: (ownerId, cents) => core.command({ type: "pitch-bend", ownerId, cents }, frame),
    configure: (config) => core.command({ type: "configure", config }, frame),
    clear: () => core.command({ type: "clear" }, frame),
    dispose: () => {}, forget: async () => {},
  };
  return {
    core,
    render(length: number) {
      const output = [new Float32Array(length), new Float32Array(length)];
      core.render(output, frame);
      frame += length;
      return output[0];
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(EPOCH);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - EPOCH);
  vi.spyOn(window, "dispatchEvent");
  vi.mocked(audio.attackNote).mockResolvedValue(undefined);
  vi.mocked(audio.getAudioContext).mockImplementation(() => ({
    state: "running", currentTime: performance.now() / 1000,
  } as AudioContext));
  playback.renderer = null;
  inputs = [];
  roliQueue = [];
  roliSend = vi.fn((message: number[], timestamp?: number) => {
    roliQueue.push({ message, at: timestamp ?? performance.now(), index: roliQueue.length });
  });
  const roliClear = () => {
    roliQueue = roliQueue.filter(({ at }) => at <= performance.now());
  };
  access = {
    inputs: new Map(),
    outputs: new Map([["roli-out", { id: "roli-out", name: "LUMI Keys", state: "connected", send: roliSend, clear: roliClear }]]),
    onstatechange: null,
  };
  midiDescriptor = Object.getOwnPropertyDescriptor(navigator, "requestMIDIAccess");
  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: vi.fn().mockResolvedValue(access),
  });
  pinia = createPinia();
  setActivePinia(pinia);
  useVisualConfigStore().useEphemeralDefaults();
  useInstrumentStore().currentInstrument = "piano";
});

afterEach(() => {
  hosts.splice(0).forEach((host) => host.unmount());
  disposePinia(pinia);
  if (midiDescriptor) Object.defineProperty(navigator, "requestMIDIAccess", midiDescriptor);
  else Reflect.deleteProperty(navigator, "requestMIDIAccess");
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("one performer: #35's held-note behaviour list", () => {
  it("releases a note whose attack completes after its key-up, without ever publishing it", async () => {
    mountQwerty();
    const finishAttack = deferNextAttack();
    key("keydown", "KeyA");
    await settle();
    expect(touches()).toEqual(["keyboard:KeyA"]);
    key("keyup", "KeyA");
    expect(touches()).toEqual([]);

    finishAttack();
    await settle();
    expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith(attackedIds()[0]);
    expect(events("note-played")).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);
    expect(usePerformerStore().owners()).toEqual([]);
  });

  it.each([
    ["window blur", () => window.dispatchEvent(new Event("blur"))],
    ["page hide", () => window.dispatchEvent(new Event("pagehide"))],
  ])("%s while an attack is pending cancels it and clears its key", async (_name, leave) => {
    mountQwerty();
    const finishAttack = deferNextAttack();
    key("keydown", "KeyA");
    await settle();
    leave();
    expect(touches()).toEqual([]);
    finishAttack();
    await settle();
    expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith(attackedIds()[0]);
    expect(events("note-played")).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("MIDI teardown while an attack is pending neither publishes nor strands the note", async () => {
    const keys = addInput("keys", "MIDI keyboard");
    const host = await mountMidi();
    const finishAttack = deferNextAttack();
    midi(keys, 0x90, 60);
    await settle();
    expect(touches()).toEqual(["midi:keys:1:60"]);

    host.unmount();
    hosts.splice(hosts.indexOf(host), 1);
    finishAttack();
    await settle();
    expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith(attackedIds()[0]);
    expect(events("note-played")).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);
    expect(touches()).toEqual([]);
  });

  it.each(["stale first", "current first"] as const)(
    "keeps a rapid re-press current when the attacks complete %s",
    async (order) => {
      mountQwerty();
      const finishStale = deferNextAttack();
      key("keydown", "KeyA");
      await settle();
      key("keyup", "KeyA");
      const finishCurrent = deferNextAttack();
      key("keydown", "KeyA");
      await settle();
      const [staleId, currentId] = attackedIds();

      if (order === "stale first") finishStale(); else finishCurrent();
      await settle();
      if (order === "stale first") finishCurrent(); else finishStale();
      await settle();

      expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith(staleId);
      expect(useMusicStore().getActiveNotes().map((note) => note.noteId)).toEqual([currentId]);
      expect(touches()).toEqual(["keyboard:KeyA"]);
      key("keyup", "KeyA");
      expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(currentId);
      expect(useMusicStore().activeNotes.size).toBe(0);
      expect(touches()).toEqual([]);
    },
  );

  it("keeps same-pitch owners from QWERTY and two MIDI channels independent", async () => {
    mountQwerty();
    const keys = addInput("keys", "MIDI keyboard");
    await mountMidi();
    key("keydown", "KeyA"); // Do in octave 4: C4
    midi(keys, 0x90, 60);
    midi(keys, 0x91, 60);
    await settle();
    const [qwertyId, firstChannelId, secondChannelId] = attackedIds();
    expect(new Set([qwertyId, firstChannelId, secondChannelId]).size).toBe(3);
    expect(useMusicStore().getActiveNoteNames()).toEqual(["C4", "C4", "C4"]);

    key("keyup", "KeyA");
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(qwertyId);
    midi(keys, 0x80, 60);
    expect(audio.releaseNote).toHaveBeenLastCalledWith(firstChannelId);
    expect(useMusicStore().getActiveNotes().map((note) => note.noteId)).toEqual([secondChannelId]);
    // The lit key stays lit while any owner still holds it.
    expect(useKeyboardDrawerStore().isKeyPressed("0_4")).toBe(true);
    midi(keys, 0x81, 60);
    expect(useKeyboardDrawerStore().isKeyPressed("0_4")).toBe(false);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("does not echo an ordinary ROLI press back to the ROLI, but mirrors other controllers", async () => {
    const roli = addInput("roli-in", "LUMI Keys");
    const keys = addInput("keys", "MIDI keyboard");
    await mountMidi();
    roliSend.mockClear();

    midi(roli, 0x90, 60);
    await settle();
    expect(useMusicStore().getActiveNoteNames()).toEqual(["C4"]);
    midi(roli, 0x80, 60);
    await settle();
    expect(midiNotes(0x90)).toEqual([]);
    expect(midiNotes(0x80)).toEqual([]);

    // Not vacuous: the same pitch from a controller without its own lights mirrors.
    midi(keys, 0x90, 60);
    await settle();
    midi(keys, 0x80, 60);
    await settle();
    expect(midiNotes(0x90)).toHaveLength(1);
    expect(midiNotes(0x80)).toHaveLength(1);
  });

  it("does not echo an ordinary ROLI press on the live worklet path either", async () => {
    const live = liveCore();
    const roli = addInput("roli-in", "LUMI Keys");
    const keys = addInput("keys", "MIDI keyboard");
    await mountMidi();
    roliSend.mockClear();

    midi(roli, 0x90, 60);
    await settle();
    expect(Math.max(...live.render(100).map(Math.abs))).toBeGreaterThan(0.2);
    midi(roli, 0x80, 60);
    await settle();
    live.render(100);
    await settle();
    expect(midiNotes(0x90)).toEqual([]);

    midi(keys, 0x90, 60);
    await settle();
    live.render(100);
    await vi.advanceTimersByTimeAsync(200);
    expect(midiNotes(0x90)).toHaveLength(1);
    midi(keys, 0x80, 60);
    await settle();
    live.render(100);
    expect(audio.attackNote).not.toHaveBeenCalled();
  });
});

describe("one performer: W3 releases and ownership", () => {
  it("window blur releases pointer, QWERTY and MIDI owners together", async () => {
    const keys = addInput("keys", "MIDI keyboard");
    await mountMidi();
    const keyboard = mount(KeyboardPerformanceHost, {
      attachTo: document.body,
      global: { plugins: [pinia], provide: { [noteColorResolverKey as symbol]: staticNoteColorResolver } },
    });
    hosts.push(keyboard);
    const target = keyboard.get<HTMLElement>('[data-key-id="2_4"]');
    vi.spyOn(document, "elementFromPoint").mockReturnValue(target.element);
    const pointer = new Event("pointerdown", { bubbles: true, cancelable: true });
    Object.defineProperties(pointer, {
      pointerId: { value: 9 }, pointerType: { value: "touch" }, clientX: { value: 5 },
      clientY: { value: 5 }, button: { value: 0 }, isPrimary: { value: true },
    });
    target.element.dispatchEvent(pointer);
    key("keydown", "KeyA");
    midi(keys, 0x90, 67);
    await settle();
    expect(touches()).toEqual(["keyboard:KeyA", "melody:touch:9:2_4", "midi:keys:1:67"]);
    expect(useMusicStore().getActiveNoteNames().sort()).toEqual(["C4", "E4", "G4"]);

    window.dispatchEvent(new Event("blur"));
    expect(touches()).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);
    expect(vi.mocked(audio.releaseNote).mock.calls.map(([noteId]) => noteId).sort())
      .toEqual([...attackedIds()].sort());
  });

  it("a hidden page releases every owner", async () => {
    mountQwerty();
    key("keydown", "KeyA");
    key("keydown", "Digit5");
    await settle();
    expect(touches()).toEqual(["keyboard:Digit5", "keyboard:KeyA"]);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    visibility.mockRestore();
    expect(touches()).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("releases a key whose key-up never arrives after Cmd goes down (the macOS case)", async () => {
    mountQwerty();
    key("keydown", "KeyA");
    key("keydown", "KeyS");
    await settle();
    const [doId, reId] = attackedIds();

    // Holding without Cmd is never cut short, however long.
    await vi.advanceTimersByTimeAsync(KEY_REPEAT_WINDOW_MS * 5);
    expect(useMusicStore().activeNotes.size).toBe(2);

    key("keydown", "MetaLeft", { key: "Meta", metaKey: true });
    // Key repeat is evidence that S is still down; A sends none.
    for (let elapsed = 0; elapsed < KEY_REPEAT_WINDOW_MS * 2; elapsed += KEY_REPEAT_WINDOW_MS / 2) {
      key("keydown", "KeyS", { metaKey: true, repeat: true });
      await vi.advanceTimersByTimeAsync(KEY_REPEAT_WINDOW_MS / 2);
    }
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(doId);
    expect(touches()).toEqual(["keyboard:KeyS"]);

    await vi.advanceTimersByTimeAsync(KEY_REPEAT_WINDOW_MS);
    expect(audio.releaseNote).toHaveBeenLastCalledWith(reId);
    expect(useMusicStore().activeNotes.size).toBe(0);

    // The late key-up only clears the block; the next real press plays again.
    key("keyup", "MetaLeft", { key: "Meta" });
    key("keydown", "KeyA", { repeat: true });
    await settle();
    expect(attackedIds()).toHaveLength(2);
    key("keyup", "KeyA");
    key("keydown", "KeyA");
    await settle();
    expect(attackedIds()).toHaveLength(3);
  });

  it("plays the next fresh press of a key whose key-up Cmd swallowed", async () => {
    mountQwerty();
    key("keydown", "KeyA");
    await settle();
    key("keydown", "MetaLeft", { key: "Meta", metaKey: true });
    // A is lifted while Cmd is down: macOS sends no key-up for it.
    await vi.advanceTimersByTimeAsync(KEY_REPEAT_WINDOW_MS + 1);
    expect(useMusicStore().activeNotes.size).toBe(0);
    key("keyup", "MetaLeft", { key: "Meta" });

    key("keydown", "KeyA");
    await settle();
    expect(attackedIds()).toHaveLength(2);
    expect(touches()).toEqual(["keyboard:KeyA"]);
    key("keyup", "KeyA");
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it.each(["KeyZ", "KeyC", "KeyV"])("plays a fresh %s after a Cmd shortcut on it, but not its key repeat", async (code) => {
    mountQwerty();
    key("keydown", "MetaLeft", { key: "Meta", metaKey: true });
    key("keydown", code, { metaKey: true });
    key("keyup", "MetaLeft", { key: "Meta" }); // The shortcut key's own key-up never came.
    key("keydown", code, { repeat: true });
    await settle();
    expect(attackedIds()).toHaveLength(0);

    key("keydown", code);
    await settle();
    expect(attackedIds()).toHaveLength(1);
    key("keyup", code);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("an instrument change releases held QWERTY and MIDI owners; the next fresh press sounds on the new one", async () => {
    mountQwerty();
    const keys = addInput("keys", "MIDI keyboard");
    await mountMidi();
    const instrument = useInstrumentStore();
    vi.mocked(audio.prewarmSoundSamples).mockResolvedValue(undefined);
    await instrument.setInstrument("sine");
    await instrument.setInstrument("piano");
    key("keydown", "KeyA");
    midi(keys, 0x90, 62);
    await settle();
    expect(touches()).toEqual(["keyboard:KeyA", "midi:keys:1:62"]);

    // An already prepared instrument switches without a lock.
    void instrument.setInstrument("sine");
    expect(instrument.isInteractionLocked).toBe(false);
    expect(touches()).toEqual([]);
    expect(usePerformerStore().owners()).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);

    // A's key repeat does not revive the silenced note.
    key("keydown", "KeyA", { repeat: true });
    await settle();
    expect(attackedIds()).toHaveLength(2);

    midi(keys, 0x90, 62);
    await settle();
    expect(vi.mocked(audio.attackNote).mock.calls.at(-1)?.slice(1, 3)).toEqual(["D4", "sine"]);
    expect(touches()).toEqual(["midi:keys:1:62"]);
  });

  it.each(["live", "fallback"] as const)(
    "mirrors a ROLI note's new Together voice after a styled detour (%s path)",
    async (path) => {
      const live = path === "live" ? liveCore() : null;
      const roli = addInput("roli-in", "LUMI Keys");
      await mountMidi();
      const music = useMusicStore();
      roliSend.mockClear();
      midi(roli, 0x90, 60);
      await settle();
      live?.render(50);
      await settle();
      expect(midiNotes(0x90)).toEqual([]);

      music.setPlayStyle("arp-up");
      for (let step = 0; step < 4; step++) {
        live?.render(100);
        await vi.advanceTimersByTimeAsync(100);
      }
      expect(midiNotes(0x90).length).toBeGreaterThan(0);

      music.setPlayStyle("together");
      for (let step = 0; step < 6; step++) {
        live?.render(100);
        await vi.advanceTimersByTimeAsync(100);
      }
      // The held note sounds Together again, so the ROLI is left showing it.
      expect(music.activeNotes.size).toBe(1);
      expect(roliShows(60)).toBe(true);
      midi(roli, 0x80, 60);
      await settle();
      live?.render(100);
      await vi.advanceTimersByTimeAsync(300);
      expect(roliShows(60)).toBe(false);
    },
  );

  it("an instrument lock releases every input and refuses new presses until it lifts", async () => {
    mountQwerty();
    const keys = addInput("keys", "MIDI keyboard");
    await mountMidi();
    key("keydown", "KeyA");
    midi(keys, 0x90, 62);
    await settle();
    const instrument = useInstrumentStore();
    instrument.warmingInstrument = "piano";
    expect(touches()).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);

    midi(keys, 0x90, 64);
    key("keydown", "KeyS");
    await settle();
    expect(attackedIds()).toHaveLength(2);
    instrument.warmingInstrument = null;
    midi(keys, 0x90, 64);
    await settle();
    expect(attackedIds()).toHaveLength(3);
  });

  it("a disconnected MIDI port releases only its own notes, pending or sounding", async () => {
    mountQwerty();
    const left = addInput("left", "MIDI keyboard");
    const right = addInput("right", "MIDI pads");
    await mountMidi();
    midi(left, 0x90, 60);
    midi(right, 0x90, 62);
    key("keydown", "KeyD"); // Mi
    await settle();
    const finishPending = deferNextAttack();
    midi(left, 0x90, 64);
    await settle();
    const [leftId, rightId, qwertyId, pendingId] = attackedIds();

    left.state = "disconnected";
    access.onstatechange?.({ port: { type: "input", id: "left", state: "disconnected" } });
    finishPending();
    await settle();

    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith(leftId);
    expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith(pendingId);
    expect(useMusicStore().getActiveNotes().map((note) => note.noteId).sort()).toEqual([qwertyId, rightId].sort());
    expect(touches()).toEqual(["keyboard:KeyD", "midi:right:1:62"]);
  });

  it("presses and releases a chord as one owner, with release-all scoped by owner", async () => {
    const performer = usePerformerStore();
    const intents: PerformerIntent[] = [];
    performer.subscribe((intent) => intents.push(intent));
    void performer.press({
      owner: "latch:loop-1", kind: "chord", touchKey: "chord:degree-1",
      voices: ["C4", "E4", "G4"].map((pitch) => ({ kind: "pitch" as const, pitch })),
    });
    void performer.press({ owner: "keyboard:KeyF", kind: "note", voices: [{ kind: "degree", scaleIndex: 3, octave: 4 }] });
    await settle();
    expect(useMusicStore().getActiveNoteNames().sort()).toEqual(["C4", "E4", "F4", "G4"]);

    // An owner holds until released: here, a latch-style scope.
    performer.releaseAllFor("latch");
    expect(useMusicStore().getActiveNoteNames()).toEqual(["F4"]);
    expect(intents.map((intent) => [intent.type, intent.owner])).toEqual([
      ["press", "latch:loop-1"], ["press", "keyboard:KeyF"], ["release", "latch:loop-1"],
    ]);
    performer.release("keyboard:KeyF");
    expect(useMusicStore().activeNotes.size).toBe(0);
  });

  it("forwards bends to the worklet core's per-note expression, including a voice that resolves late", async () => {
    const live = liveCore();
    const performer = usePerformerStore();
    void performer.press({ owner: "melody:touch:1:0_4", kind: "note", voices: [{ kind: "degree", scaleIndex: 0, octave: 4 }] });
    // The gesture starts before the voice exists; the core still receives it.
    performer.pitchBend("melody:touch:1:0_4", 40);
    await settle();
    live.render(50);
    await settle();
    expect(useMusicStore().getActiveNotes().map((note) => note.pitchBendCents)).toEqual([40]);

    performer.pitchBend("melody:touch:1:0_4", -30);
    live.render(50);
    await settle();
    expect(useMusicStore().getActiveNotes().map((note) => note.pitchBendCents)).toEqual([-30]);
    performer.release("melody:touch:1:0_4");
    live.render(100);
    await settle();
    expect(live.core.voiceCount).toBe(0);
  });
});

describe("one performer, slice 2: one alteration, a pure view, QWERTY on the surface", () => {
  const mountPerformanceKeyboard = (props: { showKeyboard?: boolean } = {}) => {
    const keyboard = mount(KeyboardPerformanceHost, {
      props,
      attachTo: document.body,
      global: { plugins: [pinia], provide: { [noteColorResolverKey as symbol]: staticNoteColorResolver } },
    });
    hosts.push(keyboard);
    return keyboard;
  };
  const touchPointer = (type: string, pointerId: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      pointerId: { value: pointerId }, pointerType: { value: "touch" }, clientX: { value: 5 },
      clientY: { value: 5 }, button: { value: 0 }, isPrimary: { value: true },
    });
    return event;
  };
  const tonicChord = (alteration: "dark" | "jazzy7") =>
    buildHarmony({ tonic: "C", scaleType: "major", octave: 4, alteration })[0]
      .voicing.pitches.map((pitch) => pitch.name);

  it("the chord row and the number row take the Joystick alteration from one store, and a held chord survives a change", async () => {
    expect(tonicChord("dark")).not.toEqual(tonicChord("jazzy7"));
    const keyboard = mountPerformanceKeyboard();
    const alteration = useHarmonyAlterationStore();
    alteration.latch("dark");
    await settle();

    // The number row and the on-screen chord key, both under "dark".
    key("keydown", "Digit1");
    const chordKey = keyboard.get<HTMLElement>('[data-chord-id="degree-1"]');
    vi.spyOn(document, "elementFromPoint").mockReturnValue(chordKey.element);
    chordKey.element.dispatchEvent(touchPointer("pointerdown", 31));
    await settle();
    expect(useMusicStore().getActiveNoteNames().sort())
      .toEqual([...tonicChord("dark"), ...tonicChord("dark")].sort());

    // The Joystick moves while both are held: the held chord keeps its
    // snapshot on screen, and both release completely.
    alteration.latch("jazzy7");
    await settle();
    expect(keyboard.get('[data-chord-id="degree-1"]').attributes("data-alteration")).toBe("dark");
    key("keyup", "Digit1");
    keyboard.get<HTMLElement>(".keyboard").element.dispatchEvent(touchPointer("pointerup", 31));
    await settle();
    expect(useMusicStore().activeNotes.size).toBe(0);
    expect(touches()).toEqual([]);
    expect(vi.mocked(audio.releaseNote).mock.calls.map(([noteId]) => noteId).sort())
      .toEqual([...attackedIds()].sort());

    // A fresh press on either input now plays the new alteration.
    expect(keyboard.get('[data-chord-id="degree-1"]').attributes("data-alteration")).toBe("jazzy7");
    key("keydown", "Digit1");
    await settle();
    expect(useMusicStore().getActiveNoteNames().sort()).toEqual([...tonicChord("jazzy7")].sort());
    key("keyup", "Digit1");
  });

  it("unused letter keys continue the scale into the next octave, and every key announces its shortcuts", async () => {
    // Three rows (octaves 5, 4, 3) of C major: seven keys per row.
    const keyboard = mountPerformanceKeyboard();
    const shortcut = (id: string) => keyboard.get(`[data-key-id="${id}"]`).attributes("aria-keyshortcuts");

    expect(shortcut("0_5")).toBe("Q K");
    expect(shortcut("4_5")).toBe("T \\");
    expect(shortcut("5_5")).toBe("Y");
    expect(shortcut("0_4")).toBe("A ,");
    expect(shortcut("2_4")).toBe("D /");
    expect(shortcut("6_4")).toBe("J");
    expect(shortcut("0_3")).toBe("Z");
    expect(keyboard.findAll(".keyboard__chord-row button").map((chord) => chord.attributes("aria-keyshortcuts")))
      .toEqual(["1", "2", "3", "4", "5", "6", "7"]);

    const plays = async (code: string) => {
      key("keydown", code);
      await settle();
      const names = useMusicStore().getActiveNoteNames();
      key("keyup", code);
      await settle();
      return names;
    };
    expect(await plays("KeyK")).toEqual(["C5"]);
    expect(await plays("Backslash")).toEqual(["G5"]);
    expect(await plays("Comma")).toEqual(["C4"]);
    expect(await plays("Slash")).toEqual(["E4"]);
    // Octave 6 is not on screen, so the top row's continuation is silent.
    expect(await plays("KeyI")).toEqual([]);
  });

  it("the performance surface, not the Keyboard view, registers QWERTY", async () => {
    const keyboard = mountPerformanceKeyboard({ showKeyboard: false });
    expect(keyboard.find(".keyboard").exists()).toBe(false);

    key("keydown", "KeyA");
    await settle();
    expect(touches()).toEqual(["keyboard:KeyA"]);
    expect(useMusicStore().getActiveNoteNames()).toEqual(["C4"]);

    // Unmounting the surface ends its QWERTY owners.
    keyboard.unmount();
    hosts.splice(hosts.indexOf(keyboard), 1);
    expect(touches()).toEqual([]);
    expect(useMusicStore().activeNotes.size).toBe(0);
  });
});
