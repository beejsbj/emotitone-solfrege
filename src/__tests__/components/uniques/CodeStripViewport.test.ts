import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import Note from "@/components/primatives/Note.vue";
import { noteColorResolverKey } from "@/components/primatives/noteColorContext";
import { CodeStripViewport } from "@/components/uniques/CodeStrip/viewport";

describe("CodeStrip viewport color and playback work", () => {
  let observer: IntersectionObserverCallback;
  let motionListener: (event: { matches: boolean }) => void;
  let visibilityListener: () => void;
  let hidden = false;
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  const owners: CodeStripViewport[] = [];
  const wrappers: ReturnType<typeof mount>[] = [];

  beforeEach(() => {
    hidden = false;
    vi.stubGlobal("IntersectionObserver", vi.fn(function (callback) {
      observer = callback;
      return { observe, unobserve, disconnect };
    }));
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: (_event: string, listener: typeof motionListener) => { motionListener = listener; },
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => hidden ? "hidden" : "visible");
    vi.spyOn(document, "addEventListener").mockImplementation((event, listener) => {
      if (event === "visibilitychange") visibilityListener = listener as () => void;
    });
  });

  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount());
    owners.splice(0).forEach(owner => owner.destroy());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function visibility(root: HTMLElement, width: number, height = 20) {
    observer([{
      target: root,
      isIntersecting: width >= 0,
      intersectionRect: { width, height },
    } as IntersectionObserverEntry], {} as IntersectionObserver);
  }

  function fixture() {
    const owner = new CodeStripViewport();
    owners.push(owner);
    const phase = ref(0);
    const live = vi.fn(() => {
      const color = `rgb(${phase.value}, 0, 0)`;
      return { background: color, primaryColor: color };
    });
    const still = vi.fn(() => ({ background: "rgb(0, 0, 0)", primaryColor: "rgb(0, 0, 0)" }));
    const root = document.createElement("span");
    const draw = vi.fn();
    const binding = owner.bind(root, {
      getKeyBackground: live, getKeyBackgroundByPitchClass: live,
    }, {
      getKeyBackground: still, getKeyBackgroundByPitchClass: still,
    });
    binding.update(draw);
    const wrapper = mount(Note, {
      global: { provide: { [noteColorResolverKey as symbol]: binding.colorResolver } },
    });
    wrappers.push(wrapper);
    return { owner, root, phase, live, draw, binding, wrapper };
  }

  it("does not read the live color clock for horizontally clipped notes and resumes on entry", async () => {
    const { owner, root, phase, live, wrapper } = fixture();
    visibility(root, 0); // Edge-adjacent IO entries may be intersecting with zero area.
    const initial = wrapper.attributes("style");
    phase.value = 40;
    await nextTick();
    expect(live).not.toHaveBeenCalled();
    expect(wrapper.attributes("style")).toBe(initial);
    expect(owner.visibleCount.value).toBe(0);

    visibility(root, 12);
    await nextTick();
    expect(owner.visibleCount.value).toBe(1);
    expect(wrapper.attributes("style")).toContain("rgb(40, 0, 0)");
    live.mockClear();
    phase.value = 80;
    await nextTick();
    expect(live).toHaveBeenCalledOnce();

    visibility(root, 12, 0);
    await nextTick();
    live.mockClear();
    phase.value = 100;
    await nextTick();
    expect(live).not.toHaveBeenCalled();
    visibility(root, 12);
    await nextTick();
    expect(wrapper.attributes("style")).toContain("rgb(100, 0, 0)");
  });

  it("defers repeated hidden playback draws and catches up to only the latest on scroll", () => {
    const { root, binding, draw } = fixture();
    visibility(root, 20);
    const baseline = draw.mock.calls.length;
    visibility(root, -1);
    const intermediate = vi.fn();
    const latest = vi.fn();
    binding.update(intermediate);
    binding.update(latest);
    expect(intermediate).not.toHaveBeenCalled();
    expect(latest).not.toHaveBeenCalled();
    expect(draw.mock.calls.length).toBe(baseline);
    visibility(root, 20);
    expect(latest).toHaveBeenCalledOnce();
  });

  it("suppresses hidden-page and Reduced Motion color work even while geometry remains visible", async () => {
    const { root, phase, live, owner } = fixture();
    visibility(root, 20);
    await nextTick();
    for (const reason of ["page", "motion"]) {
      if (reason === "page") { hidden = true; visibilityListener(); }
      else motionListener({ matches: true });
      await nextTick();
      live.mockClear();
      phase.value += 20;
      await nextTick();
      expect(live).not.toHaveBeenCalled();
      expect(owner.visibleCount.value).toBe(reason === "page" ? 0 : 1);
      if (reason === "page") { hidden = false; visibilityListener(); }
      else motionListener({ matches: false });
      await nextTick();
      expect(live).toHaveBeenCalledOnce();
    }
  });

  it("uses one observer per editor and releases destroyed widgets", () => {
    const { owner, root, binding } = fixture();
    owner.bind(document.createElement("span"));
    expect(IntersectionObserver).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledTimes(2);
    visibility(root, 20);
    binding.destroy();
    expect(unobserve).toHaveBeenCalledWith(root);
    expect(owner.visibleCount.value).toBe(0);
    owner.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("keeps visible playback state current under Reduced Motion without sampling hue", async () => {
    const { root, binding, phase, live } = fixture();
    visibility(root, 20);
    motionListener({ matches: true });
    await nextTick();
    live.mockClear();
    const draw = vi.fn();
    binding.update(draw);
    phase.value += 40;
    await nextTick();
    expect(draw).toHaveBeenCalledOnce();
    expect(live).not.toHaveBeenCalled();
    expect(root.dataset.codeStripVisible).toBe("true");
  });
});
