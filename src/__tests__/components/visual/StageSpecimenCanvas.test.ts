import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, watch } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, disposePinia } from "pinia";
import StageSpecimenCanvas from "@/style-guide/stage/StageSpecimenCanvas.vue";

const noteSnapshots = vi.hoisted(() => [] as string[][]);

vi.mock("pinia", async () => {
  const actual = await vi.importActual<typeof import("pinia")>("pinia");
  return {
    ...actual,
    createPinia: vi.fn(actual.createPinia),
    disposePinia: vi.fn(actual.disposePinia),
  };
});

vi.mock("@/components/UnifiedVisualEffects.vue", () => ({
  default: defineComponent({
    name: "UnifiedVisualEffects",
    props: ["activeNotes"],
    setup(props) {
      watch(() => props.activeNotes, (notes: { noteId: string }[]) => {
        noteSnapshots.push(notes.map(note => note.noteId));
      }, { immediate: true });
    },
    render: () => null,
  }),
}));

describe("StageSpecimenCanvas", () => {
  afterEach(() => { vi.clearAllMocks(); noteSnapshots.length = 0; });

  it("gives replayed synthetic phrases fresh attack IDs while retaining held identities", async () => {
    const wrapper = mount(StageSpecimenCanvas, {
      props: { signal: "phrase", relationship: "web", stageEnabled: true },
      attachTo: document.body,
    });
    await nextTick();
    const first = noteSnapshots[noteSnapshots.length - 1];
    expect(first).toHaveLength(3);
    await wrapper.setProps({ relationship: "merge" });
    expect(noteSnapshots[noteSnapshots.length - 1]).toEqual(first);
    await wrapper.setProps({ signal: "silence" });
    expect(noteSnapshots[noteSnapshots.length - 1]).toEqual([]);
    await wrapper.setProps({ signal: "phrase" });
    const replay = noteSnapshots[noteSnapshots.length - 1];
    expect(replay).toHaveLength(3);
    expect(replay.every(id => !first.includes(id))).toBe(true);
    wrapper.unmount();
  });

  it("disposes its isolated Pinia scope when the specimen unmounts", async () => {
    const wrapper = mount(StageSpecimenCanvas, {
      props: {
        signal: "silence",
        relationship: "web",
        stageEnabled: true,
      },
      attachTo: document.body,
    });
    await nextTick();

    const isolatedPinia = vi.mocked(createPinia).mock.results[0]?.value;
    expect(isolatedPinia).toBeDefined();

    wrapper.unmount();

    expect(disposePinia).toHaveBeenCalledOnce();
    expect(disposePinia).toHaveBeenCalledWith(isolatedPinia);
  });
});
