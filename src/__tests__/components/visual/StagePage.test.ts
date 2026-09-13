import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import StagePage from "@/style-guide/StagePage.vue";

const wakeAudio = vi.fn();

vi.mock("@/style-guide/stage/StageSpecimenCanvas.vue", () => ({
  default: defineComponent({
    name: "StageSpecimenCanvas",
    props: ["signal", "relationship", "stageEnabled"],
    setup(_, { expose }) {
      expose({ wakeAudio });
      return () => null;
    },
  }),
}));

describe("Stage real specimen page", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("drives the real Stage mount through explicit isolated states", async () => {
    const wrapper = mount(StagePage);
    const stage = wrapper.getComponent({ name: "StageSpecimenCanvas" });

    expect(wrapper.text()).toContain("Stage · real isolated specimen");
    expect(wrapper.text()).toContain("production Stage source");
    expect(stage.props()).toMatchObject({
      signal: "phrase",
      relationship: "web",
      stageEnabled: true,
    });

    await wrapper.get("button:nth-of-type(2)").trigger("click");
    expect(wakeAudio).toHaveBeenCalledTimes(1);
    expect(stage.props("signal")).toBe("borrowed");
    expect(wrapper.text()).toContain("without exciting a C-major String");

    const off = wrapper.findAll("button").find((button) => button.text() === "Off");
    await off?.trigger("click");
    expect(stage.props("relationship")).toBe("off");
  });

  it("publishes moving generic occlusion geometry without presenting a deck copy", async () => {
    vi.useFakeTimers();
    const wrapper = mount(StagePage);
    const boundary = wrapper.get("[data-stage-occluder]");
    const part = wrapper.get("[data-stage-occlusion-part]");
    const reveal = wrapper.findAll("button").find((button) => button.text() === "Reveal");

    expect(boundary.attributes("data-stage-occlusion-active")).toBeUndefined();
    expect(wrapper.text()).toContain("production PatternReel is verified separately");

    await reveal?.trigger("click");
    expect(boundary.attributes("data-stage-occlusion-active")).toBe("true");
    expect(part.attributes("style")).toContain("translateY(-76px)");

    vi.advanceTimersByTime(260);
    await wrapper.vm.$nextTick();
    expect(boundary.attributes("data-stage-occlusion-active")).toBeUndefined();
  });
});
