import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  instrumentStore: null as unknown as {
    isInteractionLocked: boolean;
    selectionEpoch: number;
  },
  mirrors: [] as Array<{
    options: any;
    evaluate: ReturnType<typeof vi.fn>;
    rawStop: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    schedulerActive: boolean;
    solo: boolean;
    complete: () => void;
  }>,
  sharedVisualOwner: null as string | null,
}));

vi.mock("@/stores/instrument", () => ({
  useInstrumentStore: () => mocks.instrumentStore,
}));

vi.mock("@strudel/codemirror", () => ({
  StrudelMirror: class {
    code: string;
    options: any;
    evaluate: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    rawStop: ReturnType<typeof vi.fn>;
    clear = vi.fn();
    updateSettings = vi.fn();
    schedulerActive = false;
    solo: boolean;
    private resolveEvaluation: (() => void) | null = null;

    constructor(options: any) {
      this.options = options;
      this.code = options.initialCode;
      this.solo = options.solo;
      this.evaluate = vi.fn(
        () => new Promise<void>((resolve) => {
          this.resolveEvaluation = resolve;
        }),
      );
      this.rawStop = vi.fn(async () => {
        this.schedulerActive = false;
        options.onToggle(false);
      });
      this.stop = this.rawStop;
      mocks.mirrors.push(this);
    }

    getCode() {
      return this.code;
    }

    setCode(source: string) {
      this.code = source;
    }

    complete() {
      this.schedulerActive = true;
      this.options.onToggle(true);
      this.options.onDraw();
      this.resolveEvaluation?.();
      this.resolveEvaluation = null;
    }
  },
}));

import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";
import { StrudelMirrorCodeStripAdapter } from "@/components/uniques/CodeStrip/strudelMirrorAdapter";

function createAdapter(source: string, releaseShared: () => void) {
  return new StrudelMirrorCodeStripAdapter({
    root: document.createElement("div"),
    initialSource: source,
    transpiler: vi.fn(),
    defaultOutput: vi.fn(),
    getTime: () => 0,
    prebake: async () => undefined,
    onDraw: () => {
      mocks.sharedVisualOwner = source;
    },
    onRelease: releaseShared,
  });
}

describe("StrudelMirror CodeStrip adapter ownership", () => {
  beforeEach(() => {
    mocks.instrumentStore = reactive({
      isInteractionLocked: false,
      selectionEpoch: 0,
    });
    mocks.mirrors = [];
    mocks.sharedVisualOwner = null;
  });

  afterEach(async () => {
    await useCodeStripStrudel().detachEditor();
  });

  it("contains late retired completion without blocking or clearing a replacement", async () => {
    const transport = useCodeStripStrudel();
    const releaseShared = vi.fn(() => {
      mocks.sharedVisualOwner = null;
    });
    const oldAdapter = createAdapter("sound('old')", releaseShared);
    transport.attachEditor(oldAdapter);
    const oldPlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[0].evaluate).toHaveBeenCalledOnce());

    const newAdapter = createAdapter("sound('new')", releaseShared);
    transport.attachEditor(newAdapter);
    const newPlay = transport.play();

    expect(mocks.mirrors[0].rawStop).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(releaseShared).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(mocks.mirrors[1].evaluate).toHaveBeenCalledOnce());
    await oldPlay;

    mocks.mirrors[1].complete();
    await newPlay;

    expect(transport.currentCode.value).toBe("sound('new')");
    expect(transport.isPlaying.value).toBe(true);
    expect(mocks.sharedVisualOwner).toBe("sound('new')");

    mocks.mirrors[0].complete();
    await vi.waitFor(() => expect(mocks.mirrors[0].schedulerActive).toBe(false));

    expect(mocks.mirrors[0].solo).toBe(false);
    expect(mocks.mirrors[0].rawStop).toHaveBeenCalledTimes(2);
    expect(mocks.mirrors[1].schedulerActive).toBe(true);
    expect(mocks.mirrors[1].rawStop).not.toHaveBeenCalled();
    expect(mocks.sharedVisualOwner).toBe("sound('new')");
    expect(releaseShared).toHaveBeenCalledOnce();

    // A callback arriving after retirement is disconnected from transport and
    // cannot release the replacement's shared visuals.
    mocks.mirrors[0].options.onToggle(true);
    expect(transport.isPlaying.value).toBe(true);
    expect(mocks.sharedVisualOwner).toBe("sound('new')");
    expect(releaseShared).toHaveBeenCalledOnce();
  });

  it("disposes an unattached mirror without releasing active shared visuals", async () => {
    const transport = useCodeStripStrudel();
    const releaseShared = vi.fn(() => {
      mocks.sharedVisualOwner = null;
    });
    const activeAdapter = createAdapter("sound('active')", releaseShared);
    transport.attachEditor(activeAdapter);
    const activePlay = transport.play();
    await vi.waitFor(() => expect(mocks.mirrors[0].evaluate).toHaveBeenCalledOnce());
    mocks.mirrors[0].complete();
    await activePlay;
    expect(mocks.sharedVisualOwner).toBe("sound('active')");

    const unattachedAdapter = createAdapter("sound('unattached')", releaseShared);
    await unattachedAdapter.disposeUnattached();

    expect(mocks.mirrors[1].rawStop).toHaveBeenCalledOnce();
    expect(mocks.mirrors[1].clear).toHaveBeenCalledOnce();
    expect(mocks.mirrors[0].schedulerActive).toBe(true);
    expect(mocks.sharedVisualOwner).toBe("sound('active')");
    expect(releaseShared).not.toHaveBeenCalled();
  });
});
