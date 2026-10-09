import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStageHostLayout } from "@/composables/useStageHostLayout";

function rect(top: number, height: number, width = 800): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    right: width,
    bottom: top + height,
    left: 0,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("useStageHostLayout", () => {
  const frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    frames.length = 0;
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("MutationObserver", class {
      constructor(_callback: MutationCallback) {}
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks the highest painted reel part throughout an active transform", async () => {
    const Harness = defineComponent({
      setup() {
        const canvas = ref<HTMLCanvasElement | null>(null);
        const active = ref(false);
        const layout = useStageHostLayout(canvas);
        return { canvas, active, ...layout };
      },
      template: `
        <canvas ref="canvas" />
        <div data-stage-occlusion-host>
          <div
            data-testid="occluder"
            data-stage-occluder
            :data-stage-occlusion-active="active ? 'true' : undefined"
          >
            <div data-testid="near-part" data-stage-occlusion-part />
            <div data-testid="far-part" data-stage-occlusion-part />
          </div>
        </div>
      `,
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    const canvas = wrapper.get("canvas").element as HTMLCanvasElement;
    const occluder = wrapper.get('[data-testid="occluder"]').element;
    const nearPart = wrapper.get('[data-testid="near-part"]').element;
    const farPart = wrapper.get('[data-testid="far-part"]').element;
    let farPartTop = 402;

    canvas.getBoundingClientRect = vi.fn(() => rect(0, 600));
    occluder.getBoundingClientRect = vi.fn(() => rect(500, 100));
    nearPart.getBoundingClientRect = vi.fn(() => rect(466, 51.2));
    farPart.getBoundingClientRect = vi.fn(() => rect(farPartTop, 51.2));

    frames.shift()?.(0);
    expect(wrapper.vm.usableRect.height).toBe(402);

    wrapper.vm.active = true;
    await nextTick();
    wrapper.vm.requestMeasure();
    frames.shift()?.(16);
    expect(frames).toHaveLength(1);

    farPartTop = 370;
    frames.shift()?.(32);
    expect(wrapper.vm.usableRect.height).toBe(370);
    expect(frames).toHaveLength(1);

    wrapper.vm.active = false;
    await nextTick();
    frames.shift()?.(48);
    expect(frames).toHaveLength(0);

    wrapper.unmount();
  });
});
