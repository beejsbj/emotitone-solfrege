import { describe, expect, it, vi } from "vitest";
import { createLiveAudioInput } from "@/services/liveAudio";

function fixture() {
  let ended: (() => void) | undefined;
  const track = {
    stop: vi.fn(),
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      ended = listener;
    }),
    removeEventListener: vi.fn(),
  };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const node = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as MediaStreamAudioSourceNode;
  const context = {
    state: "running",
    resume: vi.fn(),
    createMediaStreamSource: vi.fn(() => node),
  } as unknown as AudioContext;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  const input = createLiveAudioInput({
    getContext: () => context,
    getUserMedia,
  });

  return {
    context,
    endTrack: () => ended?.(),
    getUserMedia,
    input,
    node,
    stream,
    track,
  };
}

describe("live audio input", () => {
  it("shares one source and releases hardware after the final lease", async () => {
    const { getUserMedia, input, node, track } = fixture();
    const observed: Array<MediaStream | null> = [];
    input.subscribe((source) => observed.push(source?.stream ?? null));

    const first = await input.acquire();
    const second = await input.acquire();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(first.source).toBe(second.source);
    expect(observed).toEqual([null, first.source.stream]);

    await first.release();
    expect(track.stop).not.toHaveBeenCalled();

    await second.release();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(node.disconnect).toHaveBeenCalledTimes(1);
    expect(observed).toEqual([null, first.source.stream, null]);
  });

  it("publishes source loss and permits a fresh acquisition", async () => {
    const { endTrack, getUserMedia, input, stream } = fixture();
    const observed: Array<MediaStream | null> = [];
    input.subscribe((source) => observed.push(source?.stream ?? null));
    await input.acquire();

    endTrack();

    expect(observed).toEqual([null, stream, null]);
    await input.acquire();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("tears down a late source when its permission request was cancelled", async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const node = { disconnect: vi.fn() } as unknown as MediaStreamAudioSourceNode;
    const context = {
      state: "running",
      createMediaStreamSource: () => node,
    } as unknown as AudioContext;
    let resolvePermission!: (stream: MediaStream) => void;
    const input = createLiveAudioInput({
      getContext: () => context,
      getUserMedia: () => new Promise((resolve) => {
        resolvePermission = resolve;
      }),
    });
    const controller = new AbortController();
    const acquisition = input.acquire(controller.signal);
    controller.abort();
    resolvePermission(stream);

    await expect(acquisition).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(node.disconnect).toHaveBeenCalledTimes(1);
  });
});
