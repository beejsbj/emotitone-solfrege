import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import StagePage from "@/style-guide/StagePage.vue";

const wakeAudio = vi.fn<() => Promise<void>>();

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
  beforeEach(() => {
    wakeAudio.mockReset();
    wakeAudio.mockResolvedValue(undefined);
  });

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
      signal: "silence",
      relationship: "web",
      stageEnabled: true,
    });
    expect(wrapper.text()).toContain("Signal waiting");

    const borrowed = wrapper.findAll("button").find((button) => button.text() === "Borrowed C♯");
    await borrowed?.trigger("click");
    expect(wakeAudio).not.toHaveBeenCalled();
    expect(stage.props("signal")).toBe("silence");

    const start = wrapper.findAll("button").find((button) => button.text() === "Start synthetic signal");
    await start?.trigger("click");
    await flushPromises();
    expect(wakeAudio).toHaveBeenCalledTimes(1);
    expect(stage.props("signal")).toBe("borrowed");
    expect(wrapper.text()).toContain("without exciting a C-major String");
    expect(wrapper.text()).toContain("Synthetic signal ready");

    const merge = wrapper.findAll("button").find((button) => button.text() === "Merge");
    await merge?.trigger("click");
    expect(stage.props("relationship")).toBe("merge");
    expect(wrapper.findAll("button").some((button) => button.text() === "Off")).toBe(false);
  });

  it("keeps the specimen still and offers a retry when audio activation fails", async () => {
    wakeAudio.mockRejectedValueOnce(new Error("activation denied"));
    const wrapper = mount(StagePage);
    const stage = wrapper.getComponent({ name: "StageSpecimenCanvas" });
    const start = wrapper.findAll("button").find((button) => button.text() === "Start synthetic signal");

    await start?.trigger("click");
    await flushPromises();

    expect(stage.props("signal")).toBe("silence");
    expect(wrapper.text()).toContain("Signal unavailable");
    expect(wrapper.text()).toContain("Try synthetic signal again");

    const retry = wrapper.findAll("button").find((button) => button.text() === "Try synthetic signal again");
    await retry?.trigger("click");
    await flushPromises();

    expect(wakeAudio).toHaveBeenCalledTimes(2);
    expect(stage.props("signal")).toBe("phrase");
    expect(wrapper.text()).toContain("Synthetic signal ready");
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
