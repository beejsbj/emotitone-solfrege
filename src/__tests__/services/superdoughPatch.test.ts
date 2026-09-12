import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

vi.unmock("superdough");

describe("patched superdough behavior", () => {
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

  it("keeps held voices open until their explicit release", async () => {
    const source = await readFile("node_modules/superdough/superdough.mjs", "utf8");

    expect(source).toContain(
      "LIVE_VOICE_OPEN_ENDED_DURATION = Number.MAX_SAFE_INTEGER",
    );
    expect(source).not.toContain("LIVE_VOICE_SAFETY_DURATION = 60");
  });
});
