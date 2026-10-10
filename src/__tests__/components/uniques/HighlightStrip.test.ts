import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import HighlightStrip from "@/components/uniques/CodeStrip/HighlightStrip.vue";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/types";
import { staticNoteColorResolver } from "@/components/primatives/noteColorContext";
import type { NotationNoteEventDetail } from "@/types/notation";
import { strudelUrl } from "@/services/strudelLink";

const tokens: CodeStripToken[] = [
  { type: "note", noteId: "do", note: "do", text: "Do", rawPitch: "C4", scaleIndex: 0, duration: "@0.25" },
  { type: "rest", duration: "@0.25" },
  { type: "note", noteId: "mi", note: "mi", text: "Mi", rawPitch: "E4", scaleIndex: 2, duration: "@0.5" },
  { type: "rest", duration: "@0.125" },
];

let target: EventTarget;
let frames: FrameRequestCallback[];
let reducedMotion = false;

function send(type: "note-played" | "note-released", detail: NotationNoteEventDetail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

function play(sourceNoteId: string, voice: string, extra: Partial<NotationNoteEventDetail> = {}) {
  send("note-played", { noteId: voice, sourceNoteId, audibleAt: performance.now(), durationMs: 300, ...extra });
}

function release(sourceNoteId: string, voice: string) {
  send("note-released", { noteId: voice, sourceNoteId });
}

function runFrames() {
  for (let pass = 0; pass < 4 && frames.length; pass++) {
    const pending = frames;
    frames = [];
    for (const frame of pending) frame(performance.now());
  }
}

function event(wrapper: VueWrapper, index: number) {
  return wrapper.find(`[data-event-index="${index}"]`);
}

/** The fill a note or rest shows, from the progress it hands the Stave. */
function fill(wrapper: VueWrapper, index: number) {
  const host = event(wrapper, index).find(".code-strip__note, .code-strip__rest");
  return Number((host.element as HTMLElement).style.getPropertyValue("--code-strip-progress"));
}

function mountStrip(props: Record<string, unknown> = {}) {
  return mount(HighlightStrip, {
    attachTo: document.body,
    props: {
      tokens, listening: true, playing: true, noteEventTarget: target,
      colorResolver: staticNoteColorResolver, ...props,
    },
  });
}

function giveGeometry(wrapper: VueWrapper) {
  const scroller = wrapper.find(".highlight-strip__scroller").element as HTMLElement;
  Object.defineProperties(scroller, {
    clientWidth: { configurable: true, value: 200 },
    scrollWidth: { configurable: true, value: 1000 },
  });
  scroller.getBoundingClientRect = () => ({ left: 0, right: 200, width: 200 } as DOMRect);
  wrapper.findAll("[data-event-index]").forEach((node, index) => {
    (node.element as HTMLElement).getBoundingClientRect = () =>
      ({ left: 300 + index * 100 - scroller.scrollLeft, width: 40 } as DOMRect);
  });
  return scroller;
}

beforeEach(() => {
  target = new EventTarget();
  frames = [];
  reducedMotion = false;
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduced-motion") && reducedMotion,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("HighlightStrip", () => {
  it("lights the event whose note id sounds and clears the highlight on release", async () => {
    const wrapper = mountStrip();
    await flushPromises();
    expect([0, 1, 2, 3].map((index) => fill(wrapper, index))).toEqual([0, 0, 0, 0]);

    play("mi", "voice-1", { durationMs: 480 });
    await flushPromises();

    expect(event(wrapper, 2).attributes("data-active")).toBe("true");
    expect(event(wrapper, 2).attributes("style")).toContain("--code-strip-fill-duration: 480ms");
    expect(fill(wrapper, 2)).toBe(1);
    expect(event(wrapper, 0).attributes("data-active")).toBeUndefined();
    // The rest before the sounding note has passed.
    expect(fill(wrapper, 1)).toBe(1);

    release("mi", "voice-1");
    await flushPromises();

    expect(event(wrapper, 2).attributes("data-active")).toBeUndefined();
    expect(event(wrapper, 2).attributes("style") ?? "").not.toContain("--code-strip-fill-duration");
    // Played this pass: it stays filled, and the rest after it is now passing.
    expect(fill(wrapper, 2)).toBe(1);
    expect(fill(wrapper, 3)).toBe(1);
  });

  it("ignores note events that name no note in this phrase", async () => {
    const wrapper = mountStrip();
    send("note-played", { noteId: "live-key" });
    play("someone-else", "voice-9");
    await flushPromises();

    expect(wrapper.findAll("[data-active]")).toHaveLength(0);
    expect([0, 2].map((index) => fill(wrapper, index))).toEqual([0, 0]);
  });

  it("lights a note when it is heard, not when it is scheduled", async () => {
    const wrapper = mountStrip();
    play("do", "voice-1", { audibleAt: performance.now() + 200 });
    await flushPromises();
    expect(event(wrapper, 0).attributes("data-active")).toBeUndefined();

    vi.advanceTimersByTime(200);
    await flushPromises();
    expect(event(wrapper, 0).attributes("data-active")).toBe("true");
  });

  it("starts a new pass when the loop comes round, emptying what was played", async () => {
    const wrapper = mountStrip();
    play("do", "v1");
    release("do", "v1");
    play("mi", "v2");
    release("mi", "v2");
    await flushPromises();
    expect([0, 2].map((index) => fill(wrapper, index))).toEqual([1, 1]);

    play("do", "v3");
    await flushPromises();
    // Painted empty first, so the fill restarts instead of staying full.
    expect([0, 1, 2, 3].map((index) => fill(wrapper, index))).toEqual([0, 0, 0, 0]);

    runFrames();
    await flushPromises();
    expect(event(wrapper, 0).attributes("data-active")).toBe("true");
    expect(fill(wrapper, 0)).toBe(1);
    expect(fill(wrapper, 2)).toBe(0);
  });

  it("does not count a note still ringing from the last pass as played in the next", async () => {
    const wrapper = mountStrip();
    play("do", "v1");
    release("do", "v1");
    play("mi", "v2");
    await flushPromises();

    // The loop comes round while Mi still rings, then Mi's old voice ends.
    play("do", "v3");
    runFrames();
    release("mi", "v2");
    await flushPromises();

    expect(event(wrapper, 0).attributes("data-active")).toBe("true");
    expect(fill(wrapper, 2)).toBe(0);
  });

  it("reads complete at rest and ignores note events until the pattern plays", async () => {
    const wrapper = mountStrip({ playing: false });
    play("do", "v1");
    await flushPromises();

    expect(wrapper.findAll("[data-active]")).toHaveLength(0);
    expect([0, 1, 2, 3].map((index) => fill(wrapper, index))).toEqual([1, 1, 1, 1]);
  });

  it("follows the sounding note with an animated scroll", async () => {
    const wrapper = mountStrip();
    await flushPromises();
    const scroller = giveGeometry(wrapper);

    play("mi", "v1");
    await flushPromises();
    expect(scroller.scrollLeft).toBe(0);
    expect(frames.length).toBeGreaterThan(0);

    runFrames();
    expect(scroller.scrollLeft).toBeGreaterThan(0);
  });

  it("under Reduced Motion, jumps to the sounding note and still shows its state", async () => {
    reducedMotion = true;
    const wrapper = mountStrip();
    await flushPromises();
    const scroller = giveGeometry(wrapper);

    play("mi", "v1", { durationMs: 480 });
    await flushPromises();

    // Event 2 centre (500 + 20) less 42% of the 200px view.
    expect(scroller.scrollLeft).toBe(436);
    expect(frames).toHaveLength(0);
    expect(event(wrapper, 2).attributes("data-active")).toBe("true");
    expect(fill(wrapper, 2)).toBe(1);
  });

  it("is read-only text with a name, reachable by keyboard without trapping focus", async () => {
    const wrapper = mountStrip({ ariaLabel: "Pattern code, read-only" });
    const scroller = wrapper.find(".highlight-strip__scroller");

    expect(scroller.attributes("role")).toBe("group");
    expect(scroller.attributes("aria-label")).toBe("Pattern code, read-only");
    expect(scroller.attributes("tabindex")).toBe("0");
    expect(wrapper.find("[contenteditable]").exists()).toBe(false);
    expect(wrapper.find("input, textarea").exists()).toBe(false);

    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    scroller.element.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("shows the prompt and takes no focus while there is nothing to read", () => {
    const wrapper = mountStrip({ tokens: [] });

    expect(wrapper.text()).toContain("// Record a pattern");
    expect(wrapper.find(".highlight-strip__scroller").attributes("tabindex")).toBeUndefined();
  });

  it("lights controlled specimens from their own token progress", () => {
    const wrapper = mountStrip({
      listening: false,
      playing: false,
      tokens: [
        { ...tokens[0], progress: 0.5 },
        { type: "rest", duration: "@0.25" },
      ],
    });

    expect(fill(wrapper, 0)).toBe(0.5);
    expect(fill(wrapper, 1)).toBe(0);
  });

  it("offers Open in Strudel as a new-tab link to the code it shows", () => {
    const code = '`< C4@0.25 ~@0.25 E4@0.5 >`.as("note").sound("sine")';
    const wrapper = mountStrip({ code });
    const link = wrapper.get('a[aria-label="Open in Strudel"]');

    expect(link.attributes("href")).toBe(strudelUrl(code));
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toContain("noopener");
  });

  it("offers nothing to open while the strip is empty", () => {
    const wrapper = mountStrip({ tokens: [], code: "// Record a pattern" });

    expect(wrapper.find('a[aria-label="Open in Strudel"]').exists()).toBe(false);
  });
});
