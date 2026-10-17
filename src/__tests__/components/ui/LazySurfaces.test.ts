import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import LazyConfigPanel from "@/components/LazyConfigPanel.vue";
import LazyInstrumentSelector from "@/components/LazyInstrumentSelector.vue";

// Keep real sound registration/catalog and real Pinia/DOM. Only graph startup
// and live playback effects are suppressed; no sample download is needed here.
vi.mock("@/services/superdoughAudio", async importOriginal => ({
  ...await importOriginal<typeof import("@/services/superdoughAudio")>(),
  initSuperdoughAudio: vi.fn(async () => {}),
  getReadySounds: () => ["triangle"],
  isPrewarmed: (sound: string) => sound === "triangle",
  setLiveSynthControls: vi.fn(),
}));
vi.mock("@/MainApp.vue", () => ({ default: { template: "<div>Instrument app</div>" } }));

vi.mock("@strudel/webaudio", async () => {
  const { registerSound } = await import("superdough");
  return { registerSound, webaudioOutput: vi.fn() };
});
vi.mock("@strudel/core", () => ({
  Pattern: class Pattern {}, getPlayableNoteValue: (value: unknown) => value,
  noteToMidi: vi.fn(), freqToMidi: vi.fn(), getSoundIndex: vi.fn(),
}));

// This optional SF2 playback dependency is never used to register the real GM catalog.
vi.mock("sfumato", () => ({ startPresetNote: vi.fn(), loadSoundfont: vi.fn() }));

const wrappers: VueWrapper[] = [];
const fetchSpy = vi.fn();
beforeEach(() => {
  vi.spyOn(document, "addEventListener").mockImplementation(EventTarget.prototype.addEventListener.bind(document));
  vi.spyOn(document, "removeEventListener").mockImplementation(EventTarget.prototype.removeEventListener.bind(document));
  vi.spyOn(document, "dispatchEvent").mockImplementation(EventTarget.prototype.dispatchEvent.bind(document));
  fetchSpy.mockReset().mockRejectedValue(new Error("Catalog must not download audio"));
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
  document.documentElement.classList.remove("style-guide-route");
  document.body.classList.remove("style-guide-route");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function render(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body, global: { plugins: [createPinia()] } });
  wrappers.push(wrapper);
  return wrapper;
}
async function open(handle: string, content: string) {
  const button = document.querySelector(`[data-testid="${handle}"]`) as HTMLButtonElement;
  expect(button).not.toBeNull();
  expect(document.querySelector(content)).toBeNull();
  // Intent starts the import before click. The real drawer mounts the panel.
  button.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  button.click();
  await vi.waitFor(() => expect(document.querySelector(content)).not.toBeNull(), { timeout: 5000 });
  await flushPromises();
}

describe("on-demand surfaces", () => {
  it("loads the real Config panel and closes it without losing the handle", async () => {
    render(LazyConfigPanel);
    await open("config-panel-trigger", '[data-testid="global-public-controls"]');
    expect(document.body.textContent).toContain("Across EmotiTone");
    expect(document.querySelectorAll('[data-testid="config-panel-trigger"]')).toHaveLength(1);
    (document.querySelector('[aria-label="Close settings"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(document.querySelector('[data-testid="config-panel-trigger"]')?.getAttribute("aria-expanded")).toBe("false");
  });

  it("loads the real picker and exposes the dynamically loaded catalog without fetching samples", async () => {
    render(LazyInstrumentSelector);
    await open("instrument-selector-trigger", '[data-testid="instrument-search"]');
    expect(document.querySelectorAll('[data-testid="instrument-selector-trigger"]')).toHaveLength(1);
    await (await import("@/services/superdoughAudio")).ensureSoundfontCatalog();
    await flushPromises();
    const search = document.querySelector('[data-testid="instrument-search"]') as HTMLInputElement;
    search.value = "epiano1";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => expect(document.querySelector('[data-testid="instrument-option-gm_epiano1"]')).not.toBeNull(), { timeout: 5000 });
    expect(document.body.textContent).toContain("epiano1");
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 10000);

  it("renders the real style guide after its route import resolves", async () => {
    window.history.replaceState({}, "", "/style-guide");
    const { default: App } = await import("@/App.vue");
    const wrapper = render(App);
    await vi.waitFor(() => expect(wrapper.find('.guide-index').exists()).toBe(true));
    expect(wrapper.text()).toContain("Design System");
    expect(wrapper.findAll('a.guide-tile')).toHaveLength(6);
  });
});
