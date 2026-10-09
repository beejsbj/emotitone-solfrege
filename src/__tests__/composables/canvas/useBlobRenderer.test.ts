import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { effectScope } from "vue";
import { MAJOR_SOLFEGE } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useBlobRenderer } from "@/composables/canvas/useBlobRenderer";
import { mockCanvasContext } from "@/__tests__/helpers/test-utils";

vi.unmock("@/composables/useVisualConfig");

describe("blob ownership and cleanup", () => {
  let scope: ReturnType<typeof effectScope>;
  let renderer: ReturnType<typeof useBlobRenderer>;
  const context = Object.assign(mockCanvasContext, {
    canvas: { width: 800, height: 600 },
  }) as unknown as CanvasRenderingContext2D;

  const createVoice = (id: string) => renderer.createBlob(
    MAJOR_SOLFEGE[0], 261.63, 0, 0, 800, 600,
    DEFAULT_CONFIG.blobs, id, "C", "major", 4, "C4",
  );

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    scope = effectScope();
    renderer = scope.run(() => useBlobRenderer())!;
  });

  afterEach(() => {
    renderer.clearAllBlobs();
    scope.stop();
    vi.restoreAllMocks();
  });

  it("releases one same-pitch voice without retiring another owner's blob", () => {
    createVoice("keyboard-c4");
    createVoice("midi-c4");
    renderer.startBlobFadeOutById("keyboard-c4");

    expect(renderer.activeBlobs.get("keyboard-c4")?.isFadingOut).toBe(true);
    expect(renderer.activeBlobs.get("midi-c4")?.isFadingOut).toBe(false);

    vi.mocked(Date.now).mockReturnValue(4_000);
    renderer.prepareBlobs(context, DEFAULT_CONFIG.blobs);

    expect([...renderer.activeBlobs.keys()]).toEqual(["midi-c4"]);
    expect(renderer.getPreparedBlobFrames().map((frame) => frame.key)).toEqual(["midi-c4"]);
  });

  it("clears prepared frames together with active blobs", () => {
    createVoice("keyboard-c4");
    createVoice("midi-c4");
    vi.mocked(Date.now).mockReturnValue(1_500);
    renderer.prepareBlobs(context, DEFAULT_CONFIG.blobs);
    expect(renderer.getPreparedBlobFrames()).toHaveLength(2);

    renderer.clearAllBlobs();

    expect(renderer.getActiveBlobCount()).toBe(0);
    expect(renderer.getPreparedBlobFrames()).toEqual([]);
  });
});
