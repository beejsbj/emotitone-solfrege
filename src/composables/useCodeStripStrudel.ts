import { computed, readonly, ref, watch, type WatchStopHandle } from "vue";
import { useInstrumentStore } from "@/stores/instrument";
import type {
  CodeStripEditorAdapter,
  CodeStripEditorConnection,
  CodeStripEditorEvent,
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
    void stop();
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
        void stop();
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
      void Promise.resolve(attachment.adapter.stop(nextOperation())).catch(() => undefined);
    }
    return;
  }

  if (event.type === "source") {
    acceptSource(event.source);
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
  settlesState: boolean,
) {
  const operation = nextOperation();
  attachment.operations.set(operation, {
    command,
    kind: "stop",
    settlesState,
  });

  try {
    await attachment.adapter.stop(operation);
  } finally {
    attachment.operations.delete(operation);
    if (settlesState && ownsCommand(attachment, command)) clearPlaybackState();
  }
}

function retireAttachment(attachment: CodeStripTransportAttachment, command: number) {
  attachment.retired = true;
  attachment.unsubscribe();
  const precedingWork = attachment.work;
  const stopWork = stopAdapter(attachment, command, false).catch(() => undefined);
  let destroyWork: Promise<void>;

  try {
    destroyWork = Promise.resolve(attachment.adapter.destroy());
  } catch {
    destroyWork = Promise.resolve();
  }

  attachment.work = Promise.allSettled([
    precedingWork,
    stopWork,
    destroyWork,
  ]).then(() => undefined);
  return attachment.work;
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
  if (replacedAttachment) void retireAttachment(replacedAttachment, commandGeneration);

  const attachment: CodeStripTransportAttachment = {
    adapter,
    unsubscribe: () => undefined,
    work: Promise.resolve(),
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
    try {
      await attachment.adapter.evaluate(source, operation);
    } catch (error) {
      rejectedError = error;
      attachment.failedOperations.add(operation);
    }

    const failed = attachment.failedOperations.has(operation);
    attachment.operations.delete(operation);
    attachment.failedOperations.delete(operation);

    const mayOwnPlayback = ownsCommand(attachment, command)
      && !failed
      && !instrumentStore?.isInteractionLocked
      && instrumentStore?.selectionEpoch === selectionEpoch;

    if (!mayOwnPlayback) {
      // Later starts wait for this work, so this release cannot stop a newer
      // operation on the same adapter. Replaced editors have distinct adapters.
      await stopAdapter(attachment, command, false).catch(() => undefined);
      if (ownsCommand(attachment, command)) clearPlaybackState();
      if (rejectedError && ownsCommand(attachment, command)) {
        lastError.value = messageFor(rejectedError);
        throw rejectedError;
      }
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
    const cancellation = stopAdapter(attachment, command, false).catch(() => undefined);
    precedingWork = Promise.allSettled([precedingWork, cancellation]).then(() => undefined);
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

  // Stop takes effect immediately even while evaluation is pending. A later
  // Play waits for both this stop and the stale evaluation's final release.
  const precedingWork = attachment.work;
  const stopWork = stopAdapter(attachment, command, true);
  attachment.work = Promise.allSettled([precedingWork, stopWork]).then(() => undefined);
  await stopWork;
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
