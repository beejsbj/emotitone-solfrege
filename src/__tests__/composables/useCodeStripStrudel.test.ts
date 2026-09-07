import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CodeStripEditorAdapter,
  CodeStripEditorEvent,
  CodeStripEditorListener,
  CodeStripTransportOperation,
} from "@/types/codeStripTransport";

const mocks = vi.hoisted(() => ({
  instrumentStore: null as unknown as {
    isInteractionLocked: boolean;
    selectionEpoch: number;
  },
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";

class DeferredEditorAdapter implements CodeStripEditorAdapter {
  source: string;
  audioOwned = false;
  destroyed = false;
  stopOperations: CodeStripTransportOperation[] = [];
  evaluations: Array<{
    source: string;
    operation: CodeStripTransportOperation;
    resolve: () => void;
    reject: (error: unknown) => void;
  }> = [];

  private readonly listeners = new Set<CodeStripEditorListener>();
  private readonly subscribedListeners: CodeStripEditorListener[] = [];

  constructor(source = "sound('piano')") {
    this.source = source;
  }

  getSource() {
    return this.source;
  }

  replaceSource(source: string) {
    this.source = source;
    this.emit({ type: "source", source });
  }

  evaluate(source: string, operation: CodeStripTransportOperation) {
    return new Promise<void>((resolve, reject) => {
      this.evaluations.push({ source, operation, resolve, reject });
    });
  }

  stop(operation: CodeStripTransportOperation) {
    this.stopOperations.push(operation);
    this.audioOwned = false;
    this.emit({ type: "playing", isPlaying: false, operation });
  }

  subscribe(listener: CodeStripEditorListener) {
    this.listeners.add(listener);
    this.subscribedListeners.push(listener);
    return () => this.listeners.delete(listener);
  }

  destroy() {
    this.destroyed = true;
  }

  edit(source: string) {
    this.source = source;
    this.emit({ type: "source", source });
  }

  completeStart(index = 0) {
    const evaluation = this.evaluations[index];
    this.audioOwned = true;
    this.emit({
      type: "playing",
      isPlaying: true,
      operation: evaluation.operation,
    });
    evaluation.resolve();
  }

  failStart(error: unknown, index = 0) {
    const evaluation = this.evaluations[index];
    this.emit({ type: "error", error, operation: evaluation.operation });
    evaluation.resolve();
  }

  emitLate(event: CodeStripEditorEvent) {
    for (const listener of this.subscribedListeners) listener(event);
  }

  private emit(event: CodeStripEditorEvent) {
    for (const listener of [...this.listeners]) listener(event);
  }
}

async function evaluationStarted(adapter: DeferredEditorAdapter, count = 1) {
  await vi.waitFor(() => expect(adapter.evaluations).toHaveLength(count));
}

describe("CodeStrip transport session", () => {
  beforeEach(() => {
    mocks.instrumentStore = reactive({
      isInteractionLocked: false,
      selectionEpoch: 0,
    });
  });

  afterEach(async () => {
    await useCodeStripStrudel().detachEditor();
  });

  it("attaches a raw adapter and detaches that same identity", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();

    transport.attachEditor(adapter);
    expect(transport.isReady.value).toBe(true);
    expect(transport.hasPlayableCode.value).toBe(true);

    await transport.detachEditor(adapter);

    expect(transport.isReady.value).toBe(false);
    expect(transport.currentCode.value).toBe("");
    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.destroyed).toBe(true);
  });

  it("reconciles generated and edited source before evaluation", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter("sound('sine')");
    const connection = transport.attachEditor(adapter);

    connection.replaceSource("sound('piano')");
    adapter.edit("sound('flute')");
    const playing = transport.play();
    await evaluationStarted(adapter);

    expect(adapter.evaluations[0].source).toBe("sound('flute')");
    expect(transport.currentCode.value).toBe("sound('flute')");

    adapter.completeStart();
    await playing;
    expect(transport.isPlaying.value).toBe(true);
  });

  it("surfaces a third-party evaluation failure and releases playback", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);

    const playing = transport.play();
    await evaluationStarted(adapter);
    adapter.failStart(new Error("bad mini notation"));
    await playing;

    expect(transport.lastError.value).toBe("bad mini notation");
    expect(transport.isStarting.value).toBe(false);
    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.audioOwned).toBe(false);
    expect(adapter.stopOperations.length).toBeGreaterThan(0);
  });

  it("stops playback when source reconciliation removes playable content", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    const connection = transport.attachEditor(adapter);
    const playing = transport.play();
    await evaluationStarted(adapter);
    adapter.completeStart();
    await playing;

    connection.replaceSource("// Record a pattern");

    expect(transport.hasPlayableCode.value).toBe(false);
    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.audioOwned).toBe(false);
  });

  it("lets Stop win immediately over a pending Play without late audio revival", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);

    const playing = transport.play();
    await evaluationStarted(adapter);
    await transport.stop();

    expect(transport.isStarting.value).toBe(false);
    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.audioOwned).toBe(false);

    adapter.completeStart();
    await playing;

    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.audioOwned).toBe(false);
    expect(adapter.stopOperations).toHaveLength(2);
  });

  it("makes the latest Play win without stale cleanup stopping it", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);

    const firstPlay = transport.play();
    await evaluationStarted(adapter);
    const firstOperation = adapter.evaluations[0].operation;
    const secondPlay = transport.play();

    adapter.completeStart(0);
    await firstPlay;
    await evaluationStarted(adapter, 2);
    adapter.completeStart(1);
    await secondPlay;

    expect(transport.isPlaying.value).toBe(true);
    expect(adapter.audioOwned).toBe(true);

    const stopsBeforeLateCallback = adapter.stopOperations.length;
    adapter.emitLate({
      type: "playing",
      isPlaying: false,
      operation: firstOperation,
    });
    adapter.emitLate({
      type: "error",
      error: new Error("obsolete failure"),
      operation: firstOperation,
    });

    expect(transport.isPlaying.value).toBe(true);
    expect(transport.lastError.value).toBeNull();
    expect(adapter.audioOwned).toBe(true);
    expect(adapter.stopOperations).toHaveLength(stopsBeforeLateCallback);
  });

  it("isolates replacement from stale completion, errors, and toggles", async () => {
    const transport = useCodeStripStrudel();
    const oldAdapter = new DeferredEditorAdapter("sound('old')");
    transport.attachEditor(oldAdapter);
    const oldPlay = transport.play();
    await evaluationStarted(oldAdapter);
    const oldOperation = oldAdapter.evaluations[0].operation;

    const newAdapter = new DeferredEditorAdapter("sound('new')");
    transport.attachEditor(newAdapter);
    const newPlay = transport.play();
    await evaluationStarted(newAdapter);
    newAdapter.completeStart();
    await newPlay;

    oldAdapter.completeStart();
    await oldPlay;
    oldAdapter.emitLate({
      type: "error",
      error: new Error("detached error"),
      operation: oldOperation,
    });
    oldAdapter.emitLate({
      type: "playing",
      isPlaying: false,
      operation: oldOperation,
    });
    oldAdapter.emitLate({
      type: "playing",
      isPlaying: true,
      operation: oldOperation,
    });

    expect(oldAdapter.destroyed).toBe(true);
    expect(oldAdapter.audioOwned).toBe(false);
    expect(newAdapter.audioOwned).toBe(true);
    expect(transport.currentCode.value).toBe("sound('new')");
    expect(transport.lastError.value).toBeNull();
    expect(transport.isPlaying.value).toBe(true);
  });

  it("stops an active session and invalidates pending work across warmup epochs", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);

    const firstPlay = transport.play();
    await evaluationStarted(adapter);
    adapter.completeStart();
    await firstPlay;
    expect(transport.isPlaying.value).toBe(true);

    mocks.instrumentStore.isInteractionLocked = true;
    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.audioOwned).toBe(false);

    mocks.instrumentStore.isInteractionLocked = false;
    const pendingPlay = transport.play();
    await evaluationStarted(adapter, 2);
    mocks.instrumentStore.selectionEpoch += 1;
    mocks.instrumentStore.isInteractionLocked = true;
    mocks.instrumentStore.isInteractionLocked = false;
    adapter.completeStart(1);
    await pendingPlay;

    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.audioOwned).toBe(false);
  });
});
