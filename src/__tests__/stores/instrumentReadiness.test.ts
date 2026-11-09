import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Ready" means the worklet holds the sound right now (BJS-593). The real
 * live-playback manager evicts a bank under the memory budget; the real audio
 * engine, the real instrument store and the real picker then treat it as cold.
 * Only the worklet itself (a port that acknowledges every command), the sample
 * loader (it returns banks of a chosen size) and the browser's audio graph and
 * network are stand-ins.
 */
const MIB = 1024 * 1024;

const rig = vi.hoisted(() => ({
  create: vi.fn(),
  prepare: vi.fn(),
  /** Size in MiB of each sampled bank; every other name prepares as an oscillator, which holds no PCM. */
  sizes: {} as Record<string, number>,
  /** The renderer callbacks the manager handed the worklet, as the real bridge receives them. */
  callbacks: undefined as undefined | { onOwnerEnded(ownerId: string): void; onError(error: Error): void },
  context: { audioWorklet: {}, state: "running", sampleRate: 48000, currentTime: 0, resume: async () => {} },
}));

vi.unmock("@/services/audioEngine");
vi.mock("@/audio/live/bridge", () => ({ createLiveWorklet: rig.create }));
vi.mock("@/services/audioRuntime", () => ({
  getAudioContext: () => rig.context,
  getMasterGain: () => ({}),
  initializeAudio: async () => {},
}));
vi.mock("@/services/preparedLiveInstrument", () => ({
  prepareLiveInstrument: rig.prepare,
  releasePreparedLiveInstrument() {},
  getPreparedLiveInstrumentDiagnostics: () => ({ cachedPreparationPcmBytes: 0, preparingPcmBytes: 0, preparationPcmBudgetBytes: 192 * 1024 * 1024 }),
}));

const SAMPLE_MAPS: Record<string, unknown> = {
  "piano.json": { _base: "https://samples.test/piano/", piano: { C4: "C4.mp3" } },
  "vcsl.json": { _base: "https://samples.test/vcsl/", marimba: ["m.wav"], vibraphone: ["v.wav"], kalimba: ["k.wav"] },
};

function bank(instrumentId: string) {
  const envelope = { instrumentId, gain: .3, attack: 0, decay: 0, sustain: 1, release: .01 };
  const size = rig.sizes[instrumentId];
  if (size === undefined) return { ...envelope, kind: "oscillator", waveform: "sine" };
  // The buffer is never written, so it costs address space only.
  return { ...envelope, kind: "sample-bank", zoneSelection: "nearest-root",
    zones: [{ id: "z", rootMidi: 60, sampleRate: 48000, channels: [new Float32Array(size * MIB / 4)] }] };
}

async function boot() {
  const { createPinia, setActivePinia } = await import("pinia");
  const { mount, flushPromises } = await import("@vue/test-utils");
  const { nextTick } = await import("vue");
  const { default: InstrumentSelector } = await import("@/components/InstrumentSelector.vue");
  const { useInstrumentStore } = await import("@/stores/instrument");
  const manager = await import("@/services/livePlayback");
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useInstrumentStore();
  const picker = mount(InstrumentSelector, { props: { embedded: true }, global: { plugins: [pinia] }, attachTo: document.body });
  await vi.waitFor(() => expect(picker.find('[data-testid="instrument-tab-mallets"]').exists()).toBe(true));
  await picker.get('[data-testid="instrument-tab-mallets"]').trigger("click");
  await flushPromises();
  const marker = (sound: string) => picker.get(`[data-testid="instrument-option-${sound}"]`).attributes("data-state");
  const settle = async () => { await flushPromises(); await nextTick(); };
  const holdKey = (ownerId: string, sound: string) => manager.getLivePlayback(sound)!.press(ownerId, [{ instrumentId: sound, pitch: 60 }]);
  return { store, picker, manager, marker, settle, holdKey };
}

describe("ready means the worklet holds the sound right now", () => {
  let engine: Record<string, ReturnType<typeof vi.fn>>;
  let picker: { unmount(): void } | undefined;

  beforeEach(() => {
    vi.resetModules();
    rig.sizes = { marimba: 80, vibraphone: 80, kalimba: 80 };
    rig.callbacks = undefined;
    engine = { prepare: vi.fn().mockResolvedValue(undefined), forget: vi.fn().mockResolvedValue(undefined), press: vi.fn(),
      release: vi.fn(), clear: vi.fn(), configure: vi.fn(), shape: vi.fn(), effects: vi.fn(), transport: vi.fn(), dispose: vi.fn() };
    rig.create.mockReset().mockImplementation(async (_context, _destination, callbacks) => { rig.callbacks = callbacks; return engine; });
    rig.prepare.mockReset().mockImplementation(async (_context, name: string) => bank(name));
    vi.stubGlobal("AudioWorkletNode", vi.fn());
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const map = SAMPLE_MAPS[url.split("/").pop()!];
      return map ? new Response(JSON.stringify(map)) : new Response(new Uint8Array(8));
    }));
  });
  afterEach(() => {
    picker?.unmount();
    picker = undefined;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("shows a bank the manager evicted for room as cold again, in the picker and in the store", async () => {
    const view = await boot();
    picker = view.picker;
    const { store, marker, settle } = view;
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["cold", "cold", "cold"]);

    await store.setInstrument("marimba");
    await store.setInstrument("vibraphone");
    await settle();
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["ready", "selected", "cold"]);

    // A third 80 MiB bank does not fit beside two in the 192 MiB budget: the least recently used goes.
    await store.setInstrument("kalimba");
    await settle();
    expect(engine.forget.mock.calls).toEqual([["marimba"]]);
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["cold", "ready", "selected"]);
    expect(store.isInstrumentReady("marimba")).toBe(false);
    expect(store.isInstrumentReady("vibraphone")).toBe(true);
    expect(store.isInstrumentReady("kalimba")).toBe(true);

    // Choosing the cold one loads it again, and the next least recently used makes room.
    await expect(store.setInstrument("marimba")).resolves.toEqual({ status: "ready", instrument: "marimba" });
    await settle();
    expect(engine.forget.mock.calls).toEqual([["marimba"], ["vibraphone"]]);
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["selected", "cold", "ready"]);
    // Oscillators take no memory and are never evicted: always ready.
    expect(store.isInstrumentReady("triangle")).toBe(true);
    expect(store.isInstrumentReady("sine")).toBe(true);
  });

  it("still marks the current sound as current when something else evicts its bank, though the store calls it cold", async () => {
    const view = await boot();
    picker = view.picker;
    const { store, manager, marker, settle } = view;
    await store.setInstrument("vibraphone");
    await store.setInstrument("marimba");
    // Choosing the vibraphone again is not a use of its bank, so it stays the least recently used.
    await store.setInstrument("vibraphone");
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["ready", "selected", "cold"]);

    // Another consumer (a Looper member, say) loads a third bank, and the vibraphone is evicted.
    await manager.prepareLivePlayback(rig.context as unknown as AudioContext, {} as AudioNode, "kalimba");
    await settle();
    expect(engine.forget.mock.calls).toEqual([["vibraphone"]]);
    expect(store.currentInstrument).toBe("vibraphone");
    expect(store.isInstrumentReady("vibraphone")).toBe(false);
    // Readiness is the truth, but the player's choice is still shown as the choice: pressed, named current, first in its bank.
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["ready", "selected", "ready"]);
    const option = picker.get('[data-testid="instrument-option-vibraphone"]');
    expect(option.attributes("aria-pressed")).toBe("true");
    expect(option.attributes("aria-label")).toMatch(/, current$/);
    expect(picker.findAll('[data-testid^="instrument-option-"]')[0].attributes("data-testid")).toBe("instrument-option-vibraphone");

    // The next press loads it again; the marker never moved.
    await expect(store.setInstrument("vibraphone")).resolves.toEqual({ status: "ready", instrument: "vibraphone" });
    await settle();
    expect(store.isInstrumentReady("vibraphone")).toBe(true);
    expect(marker("vibraphone")).toBe("selected");
  });

  it("keeps a bank ready while a held key pins it, and cold once it is evicted after the key ends", async () => {
    const view = await boot();
    picker = view.picker;
    const { store, marker, settle, holdKey } = view;
    await store.setInstrument("marimba");
    holdKey("finger", "marimba");
    await store.setInstrument("vibraphone");
    // The marimba is the least recently used, but pinned, so the vibraphone makes the room.
    await store.setInstrument("kalimba");
    await settle();
    expect(engine.forget.mock.calls).toEqual([["vibraphone"]]);
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["ready", "cold", "selected"]);

    // The key ends: the marimba stays loaded and ready until something needs its room.
    rig.callbacks!.onOwnerEnded("finger");
    await settle();
    expect(marker("marimba")).toBe("ready");
    await store.setInstrument("vibraphone");
    await settle();
    expect(engine.forget.mock.calls).toEqual([["vibraphone"], ["marimba"]]);
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["cold", "selected", "ready"]);
  });

  it("leaves a bank that pins leave no room for cold, says why, and plays on one the worklet holds", async () => {
    const view = await boot();
    picker = view.picker;
    const { store, marker, settle, holdKey } = view;
    rig.sizes = { marimba: 100, vibraphone: 90, kalimba: 80 };
    await store.setInstrument("marimba");
    await store.setInstrument("vibraphone");
    holdKey("left", "marimba");
    holdKey("right", "vibraphone");

    const result = await store.setInstrument("kalimba");
    await settle();
    expect(result).toEqual({ status: "failed", instrument: "kalimba", fallback: "vibraphone" });
    expect(store.lastWarmupError).toMatch(/Sample memory is full/);
    expect(store.currentInstrument).toBe("vibraphone");
    expect(engine.forget).not.toHaveBeenCalled();
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["ready", "selected", "cold"]);

    // Reopening the picker on a selection memory already refused reports it again, without downloading the bank twice.
    store.currentInstrument = "kalimba";
    const downloads = rig.prepare.mock.calls.length;
    await store.initializeInstruments();
    await settle();
    expect(rig.prepare.mock.calls.length).toBe(downloads);
    expect(store.lastWarmupErrorInstrument).toBe("kalimba");
    expect(store.currentInstrument).toBe("vibraphone");
    expect(marker("kalimba")).toBe("cold");

    // Once a key lets go and its bank is evictable, the same selection loads.
    rig.callbacks!.onOwnerEnded("left");
    await expect(store.setInstrument("kalimba")).resolves.toEqual({ status: "ready", instrument: "kalimba" });
    await settle();
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["cold", "ready", "selected"]);
  });

  it("shows every bank as cold when the renderer is rebuilt, and loads one again on choosing it", async () => {
    const view = await boot();
    picker = view.picker;
    const { store, marker, settle } = view;
    await store.setInstrument("marimba");
    await store.setInstrument("vibraphone");
    await settle();
    expect(["marimba", "vibraphone"].map(marker)).toEqual(["ready", "selected"]);

    vi.spyOn(console, "error").mockImplementation(() => {});
    rig.callbacks!.onError(new Error("The processor failed"));
    await settle();
    // The vibraphone is the current sound: still marked, though the worklet holds nothing now.
    expect(["marimba", "vibraphone", "kalimba"].map(marker)).toEqual(["cold", "selected", "cold"]);
    expect(store.isInstrumentReady("vibraphone")).toBe(false);

    await expect(store.setInstrument("marimba")).resolves.toEqual({ status: "ready", instrument: "marimba" });
    await settle();
    expect(["marimba", "vibraphone"].map(marker)).toEqual(["selected", "cold"]);
  });
});
