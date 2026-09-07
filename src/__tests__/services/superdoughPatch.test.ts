import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("superdough");

describe("patched superdough sample loading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("evicts failed downloads so a transient failure can be retried", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });
    vi.stubGlobal("fetch", fetchMock);
    const audioContext = {
      decodeAudioData: vi.fn().mockResolvedValue({ duration: 1 }),
    };
    const { loadBuffer } = await import("superdough");
    const url = `https://example.test/retry-${crypto.randomUUID()}.wav`;

    await expect(loadBuffer(url, audioContext)).rejects.toThrow(
      "temporary network failure"
    );
    await expect(loadBuffer(url, audioContext)).resolves.toEqual({ duration: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
