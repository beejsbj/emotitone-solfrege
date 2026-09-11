import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { MAJOR_SOLFEGE } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useBlobRenderer } from "@/composables/canvas/useBlobRenderer";
import { mockCanvasContext } from "@/__tests__/helpers/test-utils";

vi.mock("@/composables/useMusicColor", () => ({
  useMusicColor: () => ({
    getPrimaryColorForPitch: vi.fn(
      (_scaleIndex: number, pitchClassIndex: number | undefined) =>
        `pitch-${pitchClassIndex ?? "scale"}`,
    ),
    getStaticPrimaryColorForPitch: vi.fn(
      (_scaleIndex: number, pitchClassIndex: number | undefined) =>
        `pitch-${pitchClassIndex ?? "scale"}`,
    ),
    withAlpha: vi.fn(
      (color: string, opacity: number) => `${color} / ${opacity}`
    ),
  }),
}));

const context = Object.assign(mockCanvasContext, {
  canvas: { width: 800, height: 600 },
}) as unknown as CanvasRenderingContext2D;

describe("useBlobRenderer lifecycle", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createTestBlob = (renderer: ReturnType<typeof useBlobRenderer>) => {
    renderer.createBlob(
      MAJOR_SOLFEGE[0],
      261.63,
      0,
      0,
      800,
      600,
      DEFAULT_CONFIG.blobs,
      "c4",
      "C",
      "major",
      4
    );
  };

  it("paints the exact blob state prepared for harmonic geometry", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const renderer = useBlobRenderer();
    createTestBlob(renderer);
    vi.mocked(Date.now).mockReturnValue(1_150);

    renderer.prepareBlobs(context, DEFAULT_CONFIG.blobs);
    const blob = renderer.activeBlobs.get("c4");
    const preparedX = blob?.x;
    const preparedScale = blob?.renderScale;

    renderer.renderBlobs(
      context,
      150,
      DEFAULT_CONFIG.blobs,
      {},
      true
    );

    expect(blob?.x).toBe(preparedX);
    expect(blob?.renderScale).toBe(preparedScale);
    expect(preparedScale).toBeGreaterThan(0);
    expect(mockCanvasContext.fill).toHaveBeenCalledTimes(1);
  });

  it("removes expired blobs during preparation before geometry is built", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const renderer = useBlobRenderer();
    createTestBlob(renderer);
    const blob = renderer.activeBlobs.get("c4");
    if (!blob) {
      throw new Error("Expected test blob");
    }
    blob.isFadingOut = true;
    blob.fadeOutStartTime = 1_000;
    vi.mocked(Date.now).mockReturnValue(3_000);

    renderer.prepareBlobs(context, DEFAULT_CONFIG.blobs);

    expect(renderer.activeBlobs.has("c4")).toBe(false);
  });

  it("retains a sounding blob beyond the former safety lifetime", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const renderer = useBlobRenderer();
    createTestBlob(renderer);
    vi.mocked(Date.now).mockReturnValue(31_000);

    renderer.prepareBlobs(context, DEFAULT_CONFIG.blobs);

    expect(renderer.activeBlobs.has("c4")).toBe(true);
    expect(renderer.getPreparedBlobFrames()).toHaveLength(1);
  });

  it("uses the Blob breathing control without doubling its scale", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const renderer = useBlobRenderer();
    createTestBlob(renderer);
    vi.mocked(Date.now).mockReturnValue(1_500);

    renderer.prepareBlobs(context, {
      ...DEFAULT_CONFIG.blobs,
      oscillationAmplitude: 0,
    });
    expect(renderer.activeBlobs.get("c4")?.renderScale).toBeCloseTo(1, 6);

    renderer.prepareBlobs(context, {
      ...DEFAULT_CONFIG.blobs,
      oscillationAmplitude: 1,
    });
    expect(renderer.activeBlobs.get("c4")?.renderScale).toBeCloseTo(
      1 + Math.sin(1.5) * 0.02,
      6
    );
  });

  it("preserves an altered chord tone's exact pitch color", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const renderer = useBlobRenderer();
    renderer.createBlob(
      { ...MAJOR_SOLFEGE[0], name: "D#", number: 0 },
      311.13,
      0,
      0,
      800,
      600,
      DEFAULT_CONFIG.blobs,
      "d-sharp-4",
      "C",
      "major",
      4,
      "D#4",
    );
    vi.mocked(Date.now).mockReturnValue(1_150);

    renderer.prepareBlobs(context, DEFAULT_CONFIG.blobs);

    expect(renderer.activeBlobs.get("d-sharp-4")?.pitchClassIndex).toBe(3);
    expect(renderer.getPreparedBlobFrames()[0]?.primaryColor).toBe("pitch-3");
  });

  it("reprojects held and releasing bodies without resetting their lifecycle", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const renderer = useBlobRenderer();
    createTestBlob(renderer);
    const blob = renderer.activeBlobs.get("c4")!;
    renderer.startBlobFadeOutById("c4");
    const lifecycle = {
      startTime: blob.startTime,
      fadeOutStartTime: blob.fadeOutStartTime,
      vibrationPhase: blob.vibrationPhase,
    };

    renderer.reprojectBlobs({
      usable: { x: 0, y: 0, width: 400, height: 240 },
      centerX: 200,
      centerY: 120,
      hilbertRadius: 30,
      orbitRadiusX: 120,
      orbitRadiusY: 65,
      blobFitScale: 0.5,
      suspended: false,
    }, DEFAULT_CONFIG.blobs, true);

    expect(blob.x).toBe(200);
    expect(blob.y).toBe(55);
    expect(blob).toMatchObject(lifecycle);
    expect(blob.isFadingOut).toBe(true);
  });

  it("applies Body Size changes to already-held notes", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const renderer = useBlobRenderer();
    createTestBlob(renderer);
    const blob = renderer.activeBlobs.get("c4")!;
    expect(blob.baseRadius).toBe(75);

    renderer.reprojectBlobs({
      usable: { x: 0, y: 0, width: 400, height: 240 },
      centerX: 200,
      centerY: 120,
      hilbertRadius: 30,
      orbitRadiusX: 120,
      orbitRadiusY: 65,
      blobFitScale: 1,
      suspended: false,
    }, {
      ...DEFAULT_CONFIG.blobs,
      minSize: 50,
      baseSizeRatio: 0.25,
    }, true);

    expect(blob.baseRadius).toBe(60);
  });
});
