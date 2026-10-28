import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createApp } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";

// The strip's sound side is the engine's startup and context; the phrases,
// recording and notation are the real ones.
vi.mock("@/services/audioRuntime", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/audioRuntime")>(),
  getAudioContext: vi.fn(() => ({
    state: "running", currentTime: 0, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })),
}));

import CodeStrip from "@/components/uniques/CodeStrip/index.vue";

const START = new Date("2026-10-15T12:00:00Z").getTime();
// In C major: [solfège index, pitch].
const MI = [2, "E4"] as const;
const FA = [3, "F4"] as const;
const RE = [1, "D4"] as const;

let wall = START;
let wrapper: VueWrapper | undefined;

/** A fresh page: a new Pinia that restores the saved phrases, as a reload does. */
function openPage(): Pinia {
  const pinia = createPinia().use(piniaPluginPersistedstate);
  createApp({}).use(pinia);
  setActivePinia(pinia);
  useVisualConfigStore().updateConfig("codeStrip", { bpm: 120 });
  return pinia;
}

/** Press and release a key on the keyboard: a recorded note in the take. */
function tap(id: string, [solfegeIndex, noteName]: readonly [number, string], at: number, holdMs = 200) {
  const store = usePhrasesStore();
  wall = at;
  store.handleNotePressed({
    detail: { noteId: id, noteName, solfegeIndex, octave: 4, timestamp: at },
  } as CustomEvent);
  wall = at + holdMs;
  store.handleNoteReleased({ detail: { noteId: id, timestamp: at + holdMs } } as CustomEvent);
}

async function mountStrip(pinia: Pinia) {
  wrapper = mount(CodeStrip, { global: { plugins: [pinia] }, attachTo: document.body });
  await flushPromises();
  return wrapper;
}

/** What the strip shows, in order: each event's kind and, for a note, its syllable. */
function stripEvents(view: VueWrapper) {
  return view.findAll("[data-event-index]").map((event) => {
    if (event.find(".code-strip__event--chord").exists()) return "chord";
    if (event.find(".code-strip__event--rest").exists()) return "rest";
    return event.find(".note").text().trim().split(/\s+/)[0].toLowerCase();
  });
}

const notesOf = (events: string[]) => events.filter((event) => event !== "rest");

beforeEach(() => {
  localStorage.clear();
  wall = START;
  vi.spyOn(Date, "now").mockImplementation(() => wall);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  usePhrasesStore().removeEventListeners();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("HighlightStrip after a reload", () => {
  it("shows a note played into the restored take after its rest, not stacked at the start", async () => {
    // Take 1: Mi Fa Fa Fa, then the take's trailing rest.
    let pinia = openPage();
    let view = await mountStrip(pinia);
    tap("mi", MI, START);
    tap("fa-1", FA, START + 500);
    tap("fa-2", FA, START + 1000);
    tap("fa-3", FA, START + 1500);
    await flushPromises();
    const before = stripEvents(view);
    expect(notesOf(before)).toEqual(["mi", "fa", "fa", "fa"]);
    expect(before.at(-1)).toBe("rest");
    const takeId = usePhrasesStore().takeId;
    expect(localStorage.getItem("phrases")).toBeTruthy();

    // Reload on the same take, then play Re a while later.
    view.unmount();
    usePhrasesStore().removeEventListeners();
    pinia = openPage();
    view = await mountStrip(pinia);
    expect(usePhrasesStore().takeId).toBe(takeId);
    expect(stripEvents(view)).toEqual(before);
    tap("re", RE, START + 60_000);
    await flushPromises();

    const after = stripEvents(view);
    // Nothing joined Mi in a chord at time 0: the old events lead unchanged…
    expect(after).not.toContain("chord");
    expect(after.slice(0, before.length - 1)).toEqual(before.slice(0, -1));
    expect(notesOf(after)).toEqual(["mi", "fa", "fa", "fa", "re"]);
    // …the rest after the last Fa is kept, and Re follows it.
    const lastFa = after.lastIndexOf("fa");
    const re = after.indexOf("re");
    expect(re).toBeGreaterThan(lastFa + 1);
    expect(after.slice(lastFa + 1, re).every((event) => event === "rest")).toBe(true);
  });
});
