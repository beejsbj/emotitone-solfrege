import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manageAudioLifecycle, onAudioRunning, registerAudioActivity, resumeAudioContext } from "@/services/audioLifecycle";
import { createLiveAudioInput } from "@/services/liveAudio";
import { createStageSpecimenAudio } from "@/style-guide/stage/stageSpecimenAudio";

const cleanup: Array<() => void> = [];
function fixture(state = "running") {
  const context = Object.assign(new EventTarget(), {
    state, sampleRate: 48000,
    resume: vi.fn(async () => { context.state = "running"; context.dispatchEvent(new Event("statechange")); }),
    suspend: vi.fn(async () => { context.state = "suspended"; context.dispatchEvent(new Event("statechange")); }),
    createMediaStreamSource: () => ({ disconnect: vi.fn() }),
  });
  let sounding = false;
  const audio = context as unknown as AudioContext;
  cleanup.push(manageAudioLifecycle(audio, { isSounding: () => sounding }));
  return { context, audio, sound: (value: boolean) => { sounding = value; } };
}
beforeEach(() => { vi.useFakeTimers(); vi.spyOn(performance, "now").mockImplementation(() => Date.now()); });
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("shared audio lifecycle", () => {
  it("retries a hung specimen unlock on a later explicit call without a lifecycle manager", async () => {
    const context = {
      state: "suspended",
      createOscillator: () => ({ frequency: { value: 0 }, connect() {}, start() {}, stop() {}, disconnect() {} }),
      createGain: () => ({ gain: { value: 0 }, connect() {}, disconnect() {} }),
      resume: vi.fn(async () => { context.state = "running"; }),
      close: vi.fn(async () => { context.state = "closed"; }),
    };
    context.resume.mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal("AudioContext", vi.fn(() => context));
    const specimen = createStageSpecimenAudio(() => "phrase");
    cleanup.push(() => specimen.features.cleanup());
    let ready = 0;
    const first = specimen.resume().then(() => { ready++; });
    await vi.advanceTimersByTimeAsync(0);
    expect(ready).toBe(0);
    const second = specimen.resume().then(() => { ready++; });
    await vi.advanceTimersByTimeAsync(0);
    expect(ready).toBe(2);
    await Promise.all([first, second]);
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(context.state).toBe("running");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not resume on hidden return or ever try a closed context", async () => {
    const { context, audio } = fixture("interrupted");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(context.resume).not.toHaveBeenCalled();
    context.state = "closed";
    await expect(resumeAudioContext(audio)).rejects.toThrow("closed");
    document.dispatchEvent(new Event("pointerdown"));
    await vi.advanceTimersByTimeAsync(0);
    expect(context.resume).not.toHaveBeenCalled();
  });

  it("sets the playback session before unlock and tolerates an unsupported setter", async () => {
    let type = "auto";
    const session = { get type() { return type; }, set type(value: string) { type = value; } };
    vi.stubGlobal("navigator", { audioSession: session });
    const setType = vi.spyOn(session, "type", "set");
    const { context, audio } = fixture("interrupted");
    context.resume.mockImplementation(async () => { expect(session.type).toBe("playback"); context.state = "running"; });
    await resumeAudioContext(audio);
    await resumeAudioContext(audio);
    expect(setType).toHaveBeenCalledTimes(1);
    type = "auto";
    Object.defineProperty(session, "type", { set() { throw new Error("unsupported"); } });
    expect(() => resumeAudioContext(audio)).not.toThrow();
  });

  it("suspends after 30 seconds of silence and input wakes it", async () => {
    const { context } = fixture();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(context.suspend).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(context.suspend).toHaveBeenCalledOnce();
    document.dispatchEvent(new Event("pointerdown"));
    await vi.advanceTimersByTimeAsync(0);
    expect(context.resume).toHaveBeenCalledOnce();
  });

  it.each(["suspended", "interrupted"])("stops polling while %s and restarts on running", async state => {
    const { context } = fixture(state);
    expect(vi.getTimerCount()).toBe(0);
    document.dispatchEvent(new Event("pointerdown"));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    context.state = state;
    context.dispatchEvent(new Event("statechange"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vi.getTimerCount()).toBe(0);
    expect(context.suspend).not.toHaveBeenCalled();
    document.dispatchEvent(new Event("pointerdown"));
    await vi.advanceTimersByTimeAsync(29_999);
    expect(vi.getTimerCount()).toBe(1);
    expect(context.suspend).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(context.suspend).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps an activity lease awake through silent passages", async () => {
    const { context } = fixture();
    let busy = true;
    cleanup.push(registerAudioActivity(() => busy));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(context.suspend).not.toHaveBeenCalled();
    busy = false;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(context.suspend).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    expect(context.suspend).toHaveBeenCalledOnce();
  });

  it("counts release/effect tails as sound before starting the silence window", async () => {
    const { context, sound } = fixture();
    sound(true);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(context.suspend).not.toHaveBeenCalled();
    sound(false);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(context.suspend).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(250);
    expect(context.suspend).toHaveBeenCalledOnce();
  });

  it("keeps a real microphone lease awake, then idles after final release", async () => {
    const { context, audio } = fixture();
    const input = createLiveAudioInput({ getContext: () => audio, getUserMedia: async () => ({
      getTracks: () => [{ stop: vi.fn() }],
    }) as unknown as MediaStream });
    const lease = await input.acquire();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(context.suspend).not.toHaveBeenCalled();
    await lease.release();
    await vi.advanceTimersByTimeAsync(30_250);
    expect(context.suspend).toHaveBeenCalledOnce();
  });

  it("serializes input behind an in-flight idle suspend", async () => {
    const { context, audio } = fixture();
    let finish!: () => void;
    context.suspend.mockImplementation(() => new Promise<void>(resolve => { finish = () => { context.state = "suspended"; resolve(); }; }));
    await vi.advanceTimersByTimeAsync(30_000);
    const ready = resumeAudioContext(audio);
    expect(context.resume).not.toHaveBeenCalled();
    finish();
    await ready;
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.state).toBe("running");
  });

  it("retries a hung unlock on a new gesture and releases the original waiter", async () => {
    const { context, audio } = fixture("interrupted");
    context.resume.mockImplementationOnce(() => new Promise(() => {}));
    const waiting = resumeAudioContext(audio);
    document.dispatchEvent(new Event("pointerdown"));
    await waiting;
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(context.state).toBe("running");
  });

  it("releases a hung unlock if the browser independently returns to running", async () => {
    const { context, audio } = fixture("interrupted");
    context.resume.mockImplementationOnce(() => new Promise(() => {}));
    const waiting = resumeAudioContext(audio);
    context.state = "running";
    context.dispatchEvent(new Event("statechange"));
    await vi.advanceTimersByTimeAsync(0);
    await waiting;
    expect(context.resume).toHaveBeenCalledOnce();
  });

  it("rejects a pending input if the context closes before unlock", async () => {
    const { context, audio } = fixture("interrupted");
    context.resume.mockImplementationOnce(() => new Promise(() => {}));
    const waiting = resumeAudioContext(audio);
    context.state = "closed";
    context.dispatchEvent(new Event("statechange"));
    await expect(waiting).rejects.toThrow("closed");
    expect(context.resume).toHaveBeenCalledOnce();
  });

  it("starts a fresh silence window for input between meter polls", async () => {
    const { context, audio } = fixture();
    await vi.advanceTimersByTimeAsync(29_900);
    expect(resumeAudioContext(audio)).toBeUndefined();
    await vi.advanceTimersByTimeAsync(250);
    expect(context.suspend).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(context.suspend).toHaveBeenCalledOnce();
  });

  it("deduplicates recovery and lets a rejected unlock be retried", async () => {
    const { context, audio } = fixture("interrupted");
    context.resume.mockRejectedValueOnce(new Error("blocked"));
    await expect(resumeAudioContext(audio)).rejects.toThrow("blocked");
    let finish!: () => void;
    const recovered = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    cleanup.push(onAudioRunning(audio, recovered));
    const first = resumeAudioContext(audio);
    expect(resumeAudioContext(audio)).toBe(first);
    await vi.advanceTimersByTimeAsync(0);
    finish();
    await first;
    expect(recovered).toHaveBeenCalledOnce();
  });
});
