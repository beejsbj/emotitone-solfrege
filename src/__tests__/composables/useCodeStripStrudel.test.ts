import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CodeStripEditorAdapter,
  CodeStripEvaluationResult,
  CodeStripEditorEvent,
  CodeStripEditorListener,
  CodeStripStopRequest,
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
  retired = false;
  deferStops = false;
  ignoreCancellation = false;
  lifecycle: string[] = [];
  stopOperations: CodeStripTransportOperation[] = [];
  stopRequests: CodeStripStopRequest[] = [];
  pendingStops: Array<() => void> = [];
  evaluations: Array<{
    source: string;
    operation: CodeStripTransportOperation;
    resolve: (result: CodeStripEvaluationResult) => void;
    reject: (error: unknown) => void;
    settled: boolean;
  }> = [];

  private readonly listeners = new Set<CodeStripEditorListener>();
  private readonly subscribedListeners: CodeStripEditorListener[] = [];

  constructor(
    source = "sound('piano')",
    private readonly sharedPlayback: {
      owner: DeferredEditorAdapter | null;
    } | null = null,
  ) {
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
    return new Promise<CodeStripEvaluationResult>((resolve, reject) => {
      this.evaluations.push({
        source,
        operation,
        resolve,
        reject,
        settled: false,
      });
    });
  }

  stop(request: CodeStripStopRequest) {
    if (request.retire) this.retired = true;
    if (request.cancelEvaluation && !this.ignoreCancellation) {
      const evaluation = [...this.evaluations]
        .reverse()
        .find((candidate) => !candidate.settled);
      if (evaluation) {
        evaluation.settled = true;
        evaluation.resolve("cancelled");
      }
    }
    this.lifecycle.push("stop requested");
    this.stopOperations.push(request.operation);
    this.stopRequests.push(request);
    const settle = () => {
      this.audioOwned = false;
      if (request.releaseShared && this.sharedPlayback) {
        this.sharedPlayback.owner = null;
      }
      this.emit({
        type: "playing",
        isPlaying: false,
        operation: request.operation,
      });
      this.lifecycle.push("stop settled");
    };
    if (!this.deferStops) {
      settle();
      return;
    }
    return new Promise<void>((resolve) => {
      this.pendingStops.push(() => {
        settle();
        resolve();
      });
    });
  }

  subscribe(listener: CodeStripEditorListener) {
    this.listeners.add(listener);
    this.subscribedListeners.push(listener);
    return () => this.listeners.delete(listener);
  }

  destroy() {
    this.destroyed = true;
    this.lifecycle.push("destroy");
  }

  edit(source: string) {
    this.source = source;
    this.emit({ type: "source", source });
  }

  completeStart(index = 0) {
    const evaluation = this.evaluations[index];
    if (evaluation.settled) return;
    this.audioOwned = !this.retired;
    if (!this.retired && this.sharedPlayback) this.sharedPlayback.owner = this;
    this.emit({
      type: "playing",
      isPlaying: true,
      operation: evaluation.operation,
    });
    evaluation.settled = true;
    evaluation.resolve("completed");
  }

  failStart(error: unknown, index = 0) {
    const evaluation = this.evaluations[index];
    this.emit({ type: "error", error, operation: evaluation.operation });
    evaluation.settled = true;
    evaluation.resolve("completed");
  }

  rejectStart(error: unknown, index = 0) {
    this.evaluations[index].settled = true;
    this.evaluations[index].reject(error);
  }

  emitLate(event: CodeStripEditorEvent) {
    for (const listener of this.subscribedListeners) listener(event);
  }

  settleStop(index = 0) {
    this.pendingStops[index]?.();
  }

  private emit(event: CodeStripEditorEvent) {
    for (const listener of [...this.listeners]) listener(event);
  }
}

async function evaluationStarted(adapter: DeferredEditorAdapter, count = 1) {
  await vi.waitFor(() => expect(adapter.evaluations).toHaveLength(count));
}

async function flushMicrotasks(count = 12) {
  for (let index = 0; index < count; index += 1) await Promise.resolve();
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

  it("rejects a failed adapter start after recording observable error state", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);

    const playing = transport.play();
    await evaluationStarted(adapter);
    const failure = new Error("adapter start rejected");
    adapter.rejectStart(failure);

    await expect(playing).rejects.toBe(failure);
    expect(transport.lastError.value).toBe("adapter start rejected");
    expect(transport.isPlaying.value).toBe(false);
    expect(adapter.audioOwned).toBe(false);
  });

  it("surfaces a rejected start before its shared cleanup settles", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);

    const playing = transport.play();
    void playing.catch(() => undefined);
    await evaluationStarted(adapter);
    adapter.deferStops = true;
    adapter.rejectStart(new Error("adapter start rejected"));
    await vi.waitFor(() => expect(adapter.pendingStops).toHaveLength(1));
    const stateBeforeCleanup = {
      error: transport.lastError.value,
      isStarting: transport.isStarting.value,
      isPlaying: transport.isPlaying.value,
    };

    adapter.settleStop();
    adapter.deferStops = false;
    await expect(playing).rejects.toThrow("adapter start rejected");
    expect(stateBeforeCleanup).toEqual({
      error: "adapter start rejected",
      isStarting: false,
      isPlaying: false,
    });
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
    expect(adapter.stopOperations).toHaveLength(1);
  });

  it("allows replay without waiting for a stopped evaluation to settle", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);

    const firstPlay = transport.play();
    await evaluationStarted(adapter);
    await transport.stop();
    const replay = transport.play();
    await flushMicrotasks();
    const replayStartedBeforeOldSettled = adapter.evaluations.length === 2;

    adapter.completeStart(0);
    await firstPlay;
    await evaluationStarted(adapter, 2);
    adapter.completeStart(1);
    await replay;

    expect(replayStartedBeforeOldSettled).toBe(true);
    expect(transport.isPlaying.value).toBe(true);
    expect(adapter.audioOwned).toBe(true);
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

  it("accepts an operation-less stop from the active runtime", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    transport.attachEditor(adapter);
    const playing = transport.play();
    await evaluationStarted(adapter);
    adapter.completeStart();
    await playing;
    expect(transport.isPlaying.value).toBe(true);

    adapter.emitLate({ type: "playing", isPlaying: false, operation: null });

    expect(transport.isPlaying.value).toBe(false);
    expect(transport.isStarting.value).toBe(false);
  });

  it("isolates replacement from stale completion, errors, and toggles", async () => {
    const transport = useCodeStripStrudel();
    const sharedPlayback: { owner: DeferredEditorAdapter | null } = { owner: null };
    const oldAdapter = new DeferredEditorAdapter("sound('old')", sharedPlayback);
    oldAdapter.ignoreCancellation = true;
    transport.attachEditor(oldAdapter);
    const oldPlay = transport.play();
    await evaluationStarted(oldAdapter);
    const oldOperation = oldAdapter.evaluations[0].operation;

    const newAdapter = new DeferredEditorAdapter("sound('new')", sharedPlayback);
    transport.attachEditor(newAdapter);
    const newPlay = transport.play();
    await evaluationStarted(newAdapter);
    newAdapter.completeStart();
    await newPlay;
    expect(sharedPlayback.owner).toBe(newAdapter);

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
    expect(sharedPlayback.owner).toBe(newAdapter);
    expect(transport.currentCode.value).toBe("sound('new')");
    expect(transport.lastError.value).toBeNull();
    expect(transport.isPlaying.value).toBe(true);
  });

  it("keeps a replacement usable while the retired evaluation remains pending", async () => {
    const transport = useCodeStripStrudel();
    const sharedPlayback: { owner: DeferredEditorAdapter | null } = { owner: null };
    const oldAdapter = new DeferredEditorAdapter("sound('old')", sharedPlayback);
    oldAdapter.ignoreCancellation = true;
    transport.attachEditor(oldAdapter);
    void transport.play();
    await evaluationStarted(oldAdapter);

    const newAdapter = new DeferredEditorAdapter("sound('new')", sharedPlayback);
    transport.attachEditor(newAdapter);
    const newPlay = transport.play();
    await evaluationStarted(newAdapter);
    newAdapter.completeStart();
    await newPlay;

    expect(oldAdapter.evaluations).toHaveLength(1);
    expect(oldAdapter.audioOwned).toBe(false);
    expect(newAdapter.audioOwned).toBe(true);
    expect(sharedPlayback.owner).toBe(newAdapter);
    expect(transport.isPlaying.value).toBe(true);
  });

  it("settles a retiring stop before destroying its adapter", async () => {
    const transport = useCodeStripStrudel();
    const adapter = new DeferredEditorAdapter();
    adapter.deferStops = true;
    const connection = transport.attachEditor(adapter);

    const detaching = connection.detach();
    const lifecycleBeforeStopSettled = [...adapter.lifecycle];
    const destroyedBeforeStopSettled = adapter.destroyed;

    adapter.settleStop();
    await detaching;

    expect(lifecycleBeforeStopSettled).toEqual(["stop requested"]);
    expect(destroyedBeforeStopSettled).toBe(false);
    expect(adapter.lifecycle).toEqual(["stop requested", "stop settled", "destroy"]);
    expect(adapter.destroyed).toBe(true);
    expect(adapter.stopRequests[0].retire).toBe(true);
  });

  it("waits for every earlier shared release before replacement playback", async () => {
    const transport = useCodeStripStrudel();
    const sharedPlayback: { owner: DeferredEditorAdapter | null } = { owner: null };
    const oldAdapter = new DeferredEditorAdapter("sound('old')", sharedPlayback);
    transport.attachEditor(oldAdapter);
    const oldPlay = transport.play();
    await evaluationStarted(oldAdapter);
    oldAdapter.completeStart();
    await oldPlay;

    oldAdapter.deferStops = true;
    const stopping = transport.stop();
    const newAdapter = new DeferredEditorAdapter("sound('new')", sharedPlayback);
    transport.attachEditor(newAdapter);
    const newPlay = transport.play();
    expect(oldAdapter.pendingStops).toHaveLength(2);

    oldAdapter.settleStop(1);
    await flushMicrotasks();
    const replacementStartedBeforeEarlierStop = newAdapter.evaluations.length === 1;
    const destroyedBeforeEarlierStop = oldAdapter.destroyed;

    if (replacementStartedBeforeEarlierStop) {
      newAdapter.completeStart();
      await newPlay;
    }
    oldAdapter.settleStop(0);
    await stopping;
    if (!replacementStartedBeforeEarlierStop) {
      await evaluationStarted(newAdapter);
      newAdapter.completeStart();
      await newPlay;
    }

    expect(replacementStartedBeforeEarlierStop).toBe(false);
    expect(destroyedBeforeEarlierStop).toBe(false);
    expect(sharedPlayback.owner).toBe(newAdapter);
    expect(newAdapter.audioOwned).toBe(true);
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
