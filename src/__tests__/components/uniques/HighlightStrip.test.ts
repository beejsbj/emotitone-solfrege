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
/** The presentation clock (`performance.now()`), moved by the test. */
let clock = 1000;

function send(type: "note-played" | "note-released", detail: NotationNoteEventDetail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

function play(sourceNoteId: string, voice: string, extra: Partial<NotationNoteEventDetail> = {}) {
  send("note-played", { noteId: voice, sourceNoteId, audibleAt: clock, durationMs: 300, ...extra });
}

function release(sourceNoteId: string, voice: string, audibleAt = clock) {
  send("note-released", { noteId: voice, sourceNoteId, audibleAt });
}

function runFrames() {
  for (let pass = 0; pass < 4 && frames.length; pass++) {
    const pending = frames;
    frames = [];
    for (const frame of pending) frame(clock);
  }
}

/** Move the clock and paint one frame. */
async function at(time: number) {
  clock = time;
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(clock);
  await flushPromises();
}

/** How many of an event's stems are lit. */
function litStems(wrapper: VueWrapper, index: number) {
  return event(wrapper, index).findAll(".code-strip__duration-mark--lit").length;
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
  clock = 1000;
  vi.useFakeTimers();
  vi.spyOn(performance, "now").mockImplementation(() => clock);
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
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("HighlightStrip", () => {
  it("lights the event whose note id sounds and clears the highlight when it ends", async () => {
    const wrapper = mountStrip();
    await flushPromises();
    expect([0, 1, 2, 3].map((index) => fill(wrapper, index))).toEqual([0, 0, 0, 0]);

    play("mi", "voice-1", { durationMs: 480 });
    await flushPromises();

    expect(event(wrapper, 2).attributes("data-active")).toBe("true");
    expect(event(wrapper, 0).attributes("data-active")).toBeUndefined();
    // The rest before the sounding note has passed.
    expect(fill(wrapper, 1)).toBe(1);

    release("mi", "voice-1", clock + 480);
    await at(1480);

    expect(event(wrapper, 2).attributes("data-active")).toBeUndefined();
    // Played this pass: it stays filled.
    expect(fill(wrapper, 2)).toBe(1);
  });

  it("ignores note events that name no note in this phrase", async () => {
    const wrapper = mountStrip();
    send("note-played", { noteId: "live-key" });
    play("someone-else", "voice-9");
    await flushPromises();

    expect(wrapper.findAll("[data-active]")).toHaveLength(0);
    expect([0, 2].map((index) => fill(wrapper, index))).toEqual([0, 0]);
  });

  it("lights a note on the frame it is heard, not when its event arrives", async () => {
    const wrapper = mountStrip();
    // Strudel dispatches a hap ahead of its audio time.
    play("do", "voice-1", { audibleAt: 1200 });
    await flushPromises();
    expect(event(wrapper, 0).attributes("data-active")).toBeUndefined();

    await at(1199);
    expect(event(wrapper, 0).attributes("data-active")).toBeUndefined();
    expect(fill(wrapper, 0)).toBe(0);

    await at(1200);
    expect(event(wrapper, 0).attributes("data-active")).toBe("true");
  });

  it("is never later than the sound when its event arrives late", async () => {
    const wrapper = mountStrip();
    // A busy main thread delivers the event after the note is already heard.
    play("mi", "voice-1", { audibleAt: 900, durationMs: 400 });
    await flushPromises();

    expect(event(wrapper, 2).attributes("data-active")).toBe("true");
    // It is a quarter of the way through, not starting from empty.
    expect(fill(wrapper, 2)).toBeCloseTo(0.25);
  });

  it("fills a sounding note and lights its stems with its own sounding time", async () => {
    const wrapper = mountStrip();
    // Mi is half a 4/4 bar: eight stems.
    play("mi", "voice-1", { audibleAt: 1000, durationMs: 800 });
    await flushPromises();
    expect(litStems(wrapper, 2)).toBe(0);

    await at(1200);
    expect(fill(wrapper, 2)).toBeCloseTo(0.25);
    expect(litStems(wrapper, 2)).toBe(2);

    await at(1600);
    expect(fill(wrapper, 2)).toBeCloseTo(0.75);
    expect(litStems(wrapper, 2)).toBe(6);

    await at(1800);
    expect(fill(wrapper, 2)).toBe(1);
    expect(litStems(wrapper, 2)).toBe(8);
  });

  it("fills a rest over its own length once the note before it ends", async () => {
    const wrapper = mountStrip();
    // Mi (@0.5) sounds 800ms, so the @0.125 rest after it lasts 200ms.
    play("mi", "voice-1", { audibleAt: 1000, durationMs: 800 });
    await at(1800);
    expect(fill(wrapper, 3)).toBe(0);

    await at(1900);
    expect(fill(wrapper, 3)).toBeCloseTo(0.5);
    await at(2000);
    expect(fill(wrapper, 3)).toBe(1);
  });

  it("replays the whole highlight from the start every time the loop comes round", async () => {
    const wrapper = mountStrip();
    const loop = async (start: number) => {
      play("do", `do-${start}`, { audibleAt: start, durationMs: 400 });
      play("mi", `mi-${start}`, { audibleAt: start + 800, durationMs: 800 });
      await at(start + 200);
      expect(fill(wrapper, 0)).toBeCloseTo(0.5);
      // What the last pass played reads empty again.
      expect([1, 2, 3].map((index) => fill(wrapper, index))).toEqual([0, 0, 0]);
      expect(litStems(wrapper, 2)).toBe(0);
      await at(start + 1200);
      expect(fill(wrapper, 0)).toBe(1);
      expect(fill(wrapper, 1)).toBe(1);
      expect(fill(wrapper, 2)).toBeCloseTo(0.5);
      await at(start + 1800);
      expect(fill(wrapper, 2)).toBe(1);
      await at(start + 2000);
      expect(fill(wrapper, 3)).toBe(1);
    };

    await loop(1000);
    await loop(3000);
    await loop(5000);
  });

  it("lights the first note of a pass even if its release is already known", async () => {
    const wrapper = mountStrip();
    play("do", "v1", { audibleAt: 1000, durationMs: 300 });
    play("mi", "v2", { audibleAt: 1600, durationMs: 300 });
    await at(2000);

    // The loop comes round: Do is scheduled and released before a frame paints.
    play("do", "v3", { audibleAt: 2200, durationMs: 300 });
    release("do", "v3", 2500);
    await at(2300);

    expect(event(wrapper, 0).attributes("data-active")).toBe("true");
    expect(fill(wrapper, 0)).toBeCloseTo(1 / 3);
    expect(fill(wrapper, 2)).toBe(0);
  });

  it("does not count a note still ringing from the last pass as played in the next", async () => {
    const wrapper = mountStrip();
    play("do", "v1", { durationMs: 100 });
    play("mi", "v2", { audibleAt: 1200, durationMs: 2000 });
    await at(1300);

    // The loop comes round while Mi still rings, then Mi's old voice ends.
    play("do", "v3", { audibleAt: 1400, durationMs: 100 });
    await at(1400);
    release("mi", "v2", 1450);
    await at(1500);

    expect(fill(wrapper, 0)).toBe(1);
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
    // Already there, with no scroll animation still to run.
    expect(scroller.scrollLeft).toBe(436);
    await at(clock + 16);
    expect(scroller.scrollLeft).toBe(436);
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

  it("lights every stem of a played note whose duration is the implicit base 1", () => {
    const wrapper = mountStrip({
      listening: false,
      tokens: [{ type: "note", note: "do", text: "Do", progress: 1 }],
    });
    const marks = event(wrapper, 0).findAll(".code-strip__duration-mark");

    expect(marks.length).toBe(16);
    expect(marks.every((mark) => mark.classes().includes("code-strip__duration-mark--lit"))).toBe(true);
  });
});
