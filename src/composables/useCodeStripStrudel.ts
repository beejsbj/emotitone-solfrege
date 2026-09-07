import { computed, readonly, ref, watch, type WatchStopHandle } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import type {
  CodeStripEditorAdapter,
  CodeStripEditorConnection,
  CodeStripEditorEvent,
  CodeStripStopRequest,
  CodeStripTransportAttachment,
  CodeStripTransportOperation,
} from "@/types/codeStripTransport";

const currentCode = ref("");
const isPlaying = ref(false);
const isStarting = ref(false);
const isReady = ref(false);
const lastError = ref<string | null>(null);

let activeAttachment: CodeStripTransportAttachment | null = null;
let commandGeneration = 0;
let operationGeneration = 0;
let sessionBarrier = Promise.resolve();
let instrumentStore: ReturnType<typeof useInstrumentStore> | null = null;
let stopInstrumentWatch: WatchStopHandle | null = null;

function hasPlayableContent(code: string): boolean {
  const trimmed = code.trim();
  return Boolean(trimmed) && !trimmed.startsWith("//");
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function ownsCommand(attachment: CodeStripTransportAttachment, command: number) {
  return activeAttachment === attachment
    && !attachment.retired
    && commandGeneration === command;
}

function clearPlaybackState() {
  isPlaying.value = false;
  isStarting.value = false;
}

function acceptSource(source: string) {
  currentCode.value = source;
  if (!hasPlayableContent(source) && (isPlaying.value || isStarting.value)) {
    void stop().catch(() => undefined);
  }
}

function bindInstrumentStore(nextStore: ReturnType<typeof useInstrumentStore>) {
  if (instrumentStore === nextStore) return;
  stopInstrumentWatch?.();
  instrumentStore = nextStore;
  stopInstrumentWatch = watch(
    () => nextStore.isInteractionLocked,
    (isLocked) => {
      if (isLocked && activeAttachment && (isPlaying.value || isStarting.value)) {
        void stop().catch(() => undefined);
      }
    },
    { flush: "sync" },
  );
}

function nextOperation() {
  operationGeneration += 1;
  return operationGeneration;
}

function handleEditorEvent(
  attachment: CodeStripTransportAttachment,
  event: CodeStripEditorEvent,
) {
  if (activeAttachment !== attachment || attachment.retired) {
    if (
      event.type === "playing"
      && event.isPlaying
      && activeAttachment?.adapter !== attachment.adapter
    ) {
      // A detached editor can finish evaluation after replacement. Releasing
      // that old adapter is safe; touching the active adapter would not be.
      try {
        void Promise.resolve(attachment.adapter.stop({
          operation: nextOperation(),
          releaseShared: false,
          cancelEvaluation: false,
          retire: false,
        })).catch(() => undefined);
      } catch {
        // The stale adapter is already retired; its failure cannot own state.
      }
    }
    return;
  }

  if (event.type === "source") {
    acceptSource(event.source);
    return;
  }

  if (event.type === "playing" && !event.isPlaying && event.operation == null) {
    clearPlaybackState();
    return;
  }

  if (event.operation == null) return;
  const owner = attachment.operations.get(event.operation);
  if (!owner || owner.command !== commandGeneration) return;

  if (event.type === "error") {
    if (owner.kind !== "start") return;
    attachment.failedOperations.add(event.operation);
    lastError.value = messageFor(event.error);
    clearPlaybackState();
    return;
  }

  if (event.isPlaying) {
    if (
      owner.kind !== "start"
      || attachment.failedOperations.has(event.operation)
      || instrumentStore?.isInteractionLocked
      || instrumentStore?.selectionEpoch !== owner.selectionEpoch
    ) {
      return;
    }
    isPlaying.value = true;
    isStarting.value = false;
    return;
  }

  if (owner.kind === "stop" && owner.settlesState) clearPlaybackState();
}

async function stopAdapter(
  attachment: CodeStripTransportAttachment,
  command: number,
  options: Omit<CodeStripStopRequest, "operation"> & { settlesState: boolean },
) {
  const operation = nextOperation();
  attachment.operations.set(operation, {
    command,
    kind: "stop",
    settlesState: options.settlesState,
  });

  try {
    await attachment.adapter.stop({
      operation,
      releaseShared: options.releaseShared,
      cancelEvaluation: options.cancelEvaluation,
      retire: options.retire,
    });
  } finally {
    attachment.operations.delete(operation);
    if (options.settlesState && ownsCommand(attachment, command)) {
      clearPlaybackState();
    }
  }
}

function trackSharedRelease(
  attachment: CodeStripTransportAttachment,
  work: Promise<void>,
) {
  attachment.sharedWork = Promise.allSettled([attachment.sharedWork, work])
    .then(() => undefined);
  return work;
}

function retireAttachment(attachment: CodeStripTransportAttachment, command: number) {
  attachment.retired = true;
  attachment.unsubscribe();
  const precedingSharedWork = attachment.sharedWork;
  const retirementStop = stopAdapter(attachment, command, {
    settlesState: false,
    releaseShared: true,
    cancelEvaluation: true,
    retire: true,
  })
    .catch(() => undefined);
  attachment.sharedWork = Promise.allSettled([precedingSharedWork, retirementStop])
    .then(() => undefined);
  const teardown = attachment.sharedWork.then(async () => {
    try {
      await attachment.adapter.destroy();
    } catch {
      // Retirement has already invalidated the adapter's state ownership.
    }
  });
  const precedingBarrier = sessionBarrier;
  sessionBarrier = Promise.allSettled([precedingBarrier, teardown]).then(() => undefined);
  attachment.work = sessionBarrier;
  return sessionBarrier;
}

function replaceSource(attachment: CodeStripTransportAttachment, source: string) {
  if (activeAttachment !== attachment || attachment.retired) return;
  attachment.adapter.replaceSource(source);
  acceptSource(attachment.adapter.getSource());
}

function detachAttachment(attachment: CodeStripTransportAttachment) {
  if (activeAttachment !== attachment) return Promise.resolve();
  commandGeneration += 1;
  activeAttachment = null;
  currentCode.value = "";
  isReady.value = false;
  lastError.value = null;
  clearPlaybackState();
  return retireAttachment(attachment, commandGeneration);
}

function attachEditor(
  adapter: CodeStripEditorAdapter,
  initialCode = "",
): CodeStripEditorConnection {
  commandGeneration += 1;
  const replacedAttachment = activeAttachment;
  if (replacedAttachment) {
    retireAttachment(replacedAttachment, commandGeneration);
  }

  const attachment: CodeStripTransportAttachment = {
    adapter,
    unsubscribe: () => undefined,
    // Strudel adapters have separate schedulers but share output/visual state.
    // Do not let a replacement start until retired work has released it.
    work: sessionBarrier,
    sharedWork: Promise.resolve(),
    pendingStarts: 0,
    operations: new Map(),
    failedOperations: new Set(),
    retired: false,
  };
  activeAttachment = attachment;
  attachment.unsubscribe = adapter.subscribe((event) => handleEditorEvent(attachment, event));
  currentCode.value = initialCode || adapter.getSource();
  isReady.value = true;
  lastError.value = null;
  clearPlaybackState();

  return {
    replaceSource: (source) => replaceSource(attachment, source),
    detach: () => detachAttachment(attachment),
  };
}

function detachEditor(adapter?: CodeStripEditorAdapter) {
  const attachment = activeAttachment;
  if (!attachment || (adapter && attachment.adapter !== adapter)) {
    return Promise.resolve();
  }
  return detachAttachment(attachment);
}

async function performStart(
  attachment: CodeStripTransportAttachment,
  command: number,
  selectionEpoch: number,
  precedingWork: Promise<void>,
) {
  try {
    await precedingWork;
    if (!ownsCommand(attachment, command)) return;

    const source = attachment.adapter.getSource();
    currentCode.value = source;
    if (
      !hasPlayableContent(source)
      || instrumentStore?.isInteractionLocked
      || instrumentStore?.selectionEpoch !== selectionEpoch
    ) {
      clearPlaybackState();
      return;
    }

    const operation: CodeStripTransportOperation = nextOperation();
    attachment.operations.set(operation, {
      command,
      kind: "start",
      settlesState: true,
      selectionEpoch,
    });

    let rejectedError: unknown;
    let evaluationRejected = false;
    let evaluationCancelled = false;
    try {
      evaluationCancelled = await attachment.adapter.evaluate(source, operation)
        === "cancelled";
    } catch (error) {
      rejectedError = error;
      evaluationRejected = true;
      attachment.failedOperations.add(operation);
    }

    const failed = attachment.failedOperations.has(operation);
    attachment.operations.delete(operation);
    attachment.failedOperations.delete(operation);

    const mayOwnPlayback = ownsCommand(attachment, command)
      && !failed
      && !evaluationCancelled
      && !instrumentStore?.isInteractionLocked
      && instrumentStore?.selectionEpoch === selectionEpoch;

    if (!mayOwnPlayback) {
      if (evaluationRejected && ownsCommand(attachment, command)) {
        lastError.value = messageFor(rejectedError);
        clearPlaybackState();
      }
      // A retired adapter contains its own late raw completion. Its handoff
      // already released shared state, so it must not release a newer owner.
      if (!attachment.retired && !evaluationCancelled) {
        const cleanup = stopAdapter(attachment, command, {
          settlesState: false,
          releaseShared: true,
          cancelEvaluation: false,
          retire: false,
        });
        trackSharedRelease(attachment, cleanup);
        await cleanup.catch(() => undefined);
      }
      if (ownsCommand(attachment, command)) clearPlaybackState();
      if (evaluationRejected && ownsCommand(attachment, command)) throw rejectedError;
      return;
    }

    isPlaying.value = true;
    isStarting.value = false;
  } finally {
    attachment.pendingStarts -= 1;
  }
}

async function play() {
  const attachment = activeAttachment;
  commandGeneration += 1;
  const command = commandGeneration;
  const selectionEpoch = instrumentStore?.selectionEpoch ?? 0;

  if (!attachment) {
    clearPlaybackState();
    return;
  }

  const source = attachment.adapter.getSource();
  currentCode.value = source;
  if (!hasPlayableContent(source) || instrumentStore?.isInteractionLocked) {
    clearPlaybackState();
    return;
  }

  lastError.value = null;
  isStarting.value = true;
  let precedingWork = attachment.work;

  if (attachment.pendingStarts > 0) {
    // Play/Play means latest request wins. Stop the current attempt now, then
    // wait for its late completion and cleanup before beginning the new one.
    isPlaying.value = false;
    const cancellation = stopAdapter(attachment, command, {
      settlesState: false,
      releaseShared: true,
      cancelEvaluation: true,
      retire: false,
    })
      .catch(() => undefined);
    trackSharedRelease(attachment, cancellation);
    precedingWork = attachment.sharedWork;
  }

  attachment.pendingStarts += 1;
  const work = performStart(attachment, command, selectionEpoch, precedingWork);
  attachment.work = work.catch(() => undefined);
  return work;
}

async function stop() {
  commandGeneration += 1;
  const command = commandGeneration;
  const attachment = activeAttachment;
  clearPlaybackState();
  if (!attachment) return;
  const cancelEvaluation = attachment.pendingStarts > 0;

  // Stop takes effect immediately even while evaluation is pending. The
  // adapter cancels the transport-facing evaluation while containing any late
  // raw completion; a later Play waits only for shared release work.
  const precedingWork = attachment.work;
  const stopWork = stopAdapter(attachment, command, {
    settlesState: true,
    releaseShared: true,
    cancelEvaluation,
    retire: false,
  });
  trackSharedRelease(attachment, stopWork);
  attachment.work = cancelEvaluation
    ? attachment.sharedWork
    : Promise.allSettled([precedingWork, stopWork]).then(() => undefined);
  try {
    await stopWork;
  } catch (error) {
    if (ownsCommand(attachment, command)) lastError.value = messageFor(error);
    throw error;
  }
}

async function toggle() {
  if (isPlaying.value || isStarting.value) {
    await stop();
    return;
  }
  await play();
}

export function useCodeStripStrudel() {
  bindInstrumentStore(useInstrumentStore());

  return {
    attachEditor,
    detachEditor,
    play,
    stop,
    toggle,
    currentCode: readonly(currentCode),
    isPlaying: readonly(isPlaying),
    isStarting: readonly(isStarting),
    isReady: readonly(isReady),
    lastError: readonly(lastError),
    hasPlayableCode: computed(() => hasPlayableContent(currentCode.value)),
  };
}
