import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLiveAudioInput } from "@/services/liveAudio";
import { resumeAudioContext } from "@/services/audioLifecycle";

let session: { type: string };
beforeEach(() => {
  session = { type: "auto" };
  vi.stubGlobal("navigator", { audioSession: session });
});
afterEach(() => { vi.unstubAllGlobals(); });

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
    const { context, getUserMedia, input, node, track, stream } = fixture();
    await resumeAudioContext(context);
    expect(session.type).toBe("playback");
    getUserMedia.mockImplementation(async () => {
      expect(session.type).toBe("play-and-record");
      return stream;
    });
    track.stop.mockImplementation(() => { expect(session.type).toBe("play-and-record"); });
    const observed: Array<MediaStream | null> = [];
    input.subscribe((source) => observed.push(source?.stream ?? null));

    const first = await input.acquire();
    const second = await input.acquire();
    await resumeAudioContext(context);
    expect(session.type).toBe("play-and-record");

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(first.source).toBe(second.source);
    expect(observed).toEqual([null, first.source.stream]);

    await first.release();
    expect(track.stop).not.toHaveBeenCalled();
    expect(session.type).toBe("play-and-record");

    await second.release();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(node.disconnect).toHaveBeenCalledTimes(1);
    expect(observed).toEqual([null, first.source.stream, null]);
    expect(session.type).toBe("playback");
    await second.release();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("keeps capture mode while another source still holds a microphone", async () => {
    const first = await fixture().input.acquire();
    const second = await fixture().input.acquire();
    await first.release();
    expect(session.type).toBe("play-and-record");
    await second.release();
    expect(session.type).toBe("playback");
  });

  it("restores playback after permission is rejected", async () => {
    const { input, getUserMedia } = fixture();
    getUserMedia.mockRejectedValueOnce(new Error("denied"));
    await expect(input.acquire()).rejects.toThrow("denied");
    expect(session.type).toBe("playback");
    const lease = await input.acquire();
    expect(session.type).toBe("play-and-record");
    await lease.release();
    expect(session.type).toBe("playback");
  });

  it("stops the stream before restoring playback when graph creation fails", async () => {
    const { input, context, track } = fixture();
    vi.mocked(context.createMediaStreamSource).mockImplementationOnce(() => { throw new Error("graph failed"); });
    track.stop.mockImplementation(() => { expect(session.type).toBe("play-and-record"); });
    await expect(input.acquire()).rejects.toThrow("graph failed");
    expect(track.stop).toHaveBeenCalledOnce();
    expect(session.type).toBe("playback");
  });

  it("publishes source loss and permits a fresh acquisition", async () => {
    const { endTrack, getUserMedia, input, stream } = fixture();
    const observed: Array<MediaStream | null> = [];
    input.subscribe((source) => observed.push(source?.stream ?? null));
    await input.acquire();

    endTrack();

    expect(observed).toEqual([null, stream, null]);
    expect(session.type).toBe("playback");
    const lease = await input.acquire();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(session.type).toBe("play-and-record");
    await lease.release();
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
    expect(session.type).toBe("play-and-record");
    controller.abort();
    resolvePermission(stream);

    await expect(acquisition).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(node.disconnect).toHaveBeenCalledTimes(1);
    expect(session.type).toBe("playback");
  });
});
