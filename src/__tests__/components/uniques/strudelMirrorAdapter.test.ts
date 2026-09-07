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
    complete: () => void;
  }>,
  sharedVisualsActive: false,
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
    private resolveEvaluation: (() => void) | null = null;

    constructor(options: any) {
      this.options = options;
      this.code = options.initialCode;
      this.evaluate = vi.fn(
        () => new Promise<void>((resolve) => {
          this.resolveEvaluation = resolve;
        }),
      );
      this.rawStop = vi.fn(async () => {
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
      mocks.sharedVisualsActive = true;
      this.options.onToggle(true);
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
    onDraw: vi.fn(),
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
    mocks.sharedVisualsActive = false;
  });

  afterEach(async () => {
    await useCodeStripStrudel().detachEditor();
  });

  it("finishes retired shared cleanup before starting a replacement", async () => {
    const transport = useCodeStripStrudel();
    const releaseShared = vi.fn(() => {
      mocks.sharedVisualsActive = false;
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
    expect(mocks.mirrors[1].evaluate).not.toHaveBeenCalled();

    mocks.mirrors[0].complete();
    await oldPlay;
    await vi.waitFor(() => expect(mocks.mirrors[1].evaluate).toHaveBeenCalledOnce());

    expect(mocks.mirrors[0].rawStop).toHaveBeenCalledTimes(2);
    expect(releaseShared).toHaveBeenCalledTimes(2);
    expect(mocks.sharedVisualsActive).toBe(false);

    mocks.mirrors[1].complete();
    await newPlay;

    expect(transport.currentCode.value).toBe("sound('new')");
    expect(transport.isPlaying.value).toBe(true);
    expect(mocks.sharedVisualsActive).toBe(true);
    expect(releaseShared).toHaveBeenCalledTimes(2);

    // A callback arriving after retirement is disconnected from transport and
    // cannot release the replacement's shared visuals.
    mocks.mirrors[0].options.onToggle(true);
    expect(transport.isPlaying.value).toBe(true);
    expect(mocks.sharedVisualsActive).toBe(true);
    expect(releaseShared).toHaveBeenCalledTimes(2);
  });
});
