import { createPinia, setActivePinia } from "pinia";
import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, ref, type ComputedRef, type Ref } from "vue";
import PatternReel from "@/components/compounds/PatternReel.vue";
import PatternList from "@/components/patterns/PatternList.vue";
import { usePatternsStore } from "@/stores/patterns";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";
import type { Pattern } from "@/types/patterns";

const colors = vi.hoisted(() => ({
  byScaleIndex: vi.fn(() => "scale-color"),
  byPitchClass: vi.fn(() => "exact-color"),
}));

const codeStrip = vi.hoisted(() => ({
  currentCode: undefined as unknown as Ref<string>,
  hasPlayableCode: undefined as unknown as ComputedRef<boolean>,
}));

vi.mock("@/composables/useColorSystem", () => ({
  useColorSystem: () => ({
    getStaticPrimaryColorByScaleIndex: colors.byScaleIndex,
    getStaticPrimaryColorByPitchClass: colors.byPitchClass,
  }),
}));

vi.mock("@/composables/useCodeStripStrudel", () => ({
  useCodeStripStrudel: () => codeStrip,
}));

function createUserPattern(id: string, overrides: Partial<Pattern> = {}): Pattern {
  return {
    id,
    name: "Borrowed turn",
    notes: [{
      id: `${id}-note`,
      note: "D#4",
      scaleDegree: 0,
      scaleIndex: -1,
      pitchClassIndex: 3,
      isBorrowed: true,
      octave: 4,
      pressTime: 1000,
      releaseTime: 1250,
      duration: 250,
    }],
    noteCount: 1,
    duration: 250,
    key: "C",
    mode: "major",
    instrument: "piano",
    bpm: 120,
    createdAt: Date.now(),
    isSaved: true,
    isDefault: false,
    ...overrides,
  };
}

function reelItems(wrapper: ReturnType<typeof shallowMount>) {
  return wrapper.getComponent(PatternReel).props("items") as PatternReelItem[];
}

beforeEach(() => {
  setActivePinia(createPinia());
  colors.byScaleIndex.mockClear();
  colors.byPitchClass.mockClear();
  codeStrip.currentCode = ref("");
  codeStrip.hasPlayableCode = computed(() => {
    const source = codeStrip.currentCode.value.trim();
    return Boolean(source) && !source.startsWith("//");
  });
});

describe("PatternList production adapter", () => {
  it("represents a fresh or short working sketch as the always-selected Current Take", () => {
    const wrapper = shallowMount(PatternList);
    const reel = wrapper.getComponent(PatternReel);
    const current = reelItems(wrapper).at(-1);

    expect(current).toMatchObject({
      id: "current-pattern-take",
      name: "Current Take",
      canDelete: false,
      canCopy: false,
      canOpenStrudel: false,
      deleteUnavailableLabel: "Edit the current take in CodeStrip",
      copyUnavailableLabel: "Record notes before copying Current Take",
      openUnavailableLabel: "Record notes before opening Current Take in Strudel",
    });
    expect(reel.props("selectedId")).toBe("current-pattern-take");
  });

  it("maps store patterns into the shared reel with exact note color and root spine", () => {
    const patternsStore = usePatternsStore();
    const pattern = createUserPattern("borrowed-pattern");
    patternsStore.savedPatterns = [pattern];
    patternsStore.setFocusedPattern(pattern.id);

    const wrapper = shallowMount(PatternList);
    const mapped = reelItems(wrapper).find((item) => item.id === pattern.id);

    expect(mapped).toMatchObject({
      name: "Borrowed turn",
      rootLabel: "C4",
      spine: "exact-color",
      canDelete: true,
    });
    expect(mapped?.barTape).toEqual([{ color: "exact-color", durationMs: 250 }]);
    expect(colors.byPitchClass).toHaveBeenCalledWith(3, "major", "C", 4);
    expect(colors.byPitchClass).toHaveBeenCalledWith(0, "major", "C", 4);
  });

  it("commits selection through the existing loadPatternAsBase contract", () => {
    const patternsStore = usePatternsStore();
    const pattern = createUserPattern("select-me");
    patternsStore.savedPatterns = [pattern];
    const loadPattern = vi.spyOn(patternsStore, "loadPatternAsBase").mockImplementation(() => {});
    const wrapper = shallowMount(PatternList);

    wrapper.getComponent(PatternReel).vm.$emit("commit", pattern.id, "tap");

    expect(loadPattern).toHaveBeenCalledOnce();
    expect(loadPattern).toHaveBeenCalledWith(pattern.id);
  });

  it("uses a loaded store pattern as Current without duplicating the working sketch", async () => {
    const patternsStore = usePatternsStore();
    const pattern = createUserPattern("loaded-pattern");
    patternsStore.savedPatterns = [pattern];
    patternsStore.loadPatternAsBase(pattern.id);
    const wrapper = shallowMount(PatternList);
    await nextTick();

    expect(wrapper.getComponent(PatternReel).props("selectedId")).toBe(pattern.id);
    expect(reelItems(wrapper).some((item) => item.id === "current-pattern-take")).toBe(false);
  });

  it("retains pattern-bound two-tap deletion and default protection", async () => {
    const patternsStore = usePatternsStore();
    const pattern = createUserPattern("delete-me");
    patternsStore.savedPatterns = [pattern];
    patternsStore.setFocusedPattern(pattern.id);
    const wrapper = shallowMount(PatternList);
    const reel = wrapper.getComponent(PatternReel);

    reel.vm.$emit("delete", pattern.id);
    await nextTick();
    expect(reelItems(wrapper).find((item) => item.id === pattern.id)?.deleteArmed).toBe(true);
    expect(patternsStore.savedPatterns).toHaveLength(1);

    reel.vm.$emit("delete", pattern.id);
    await nextTick();
    expect(patternsStore.savedPatterns).toHaveLength(0);
    expect(reelItems(wrapper).every((item) => item.canDelete === false)).toBe(true);
  });

  it("retains clipboard and Strudel effects in the production adapter", async () => {
    const patternsStore = usePatternsStore();
    const pattern = createUserPattern("share-me");
    patternsStore.savedPatterns = [pattern];
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = shallowMount(PatternList);
    const reel = wrapper.getComponent(PatternReel);

    reel.vm.$emit("copy", pattern.id);
    await Promise.resolve();
    await nextTick();
    expect(writeText).toHaveBeenCalledOnce();
    expect(reelItems(wrapper).find((item) => item.id === pattern.id)?.copied).toBe(true);

    reel.vm.$emit("openStrudel", pattern.id);
    expect(open).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/strudel\.cc\/#/),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("shares the live edited CodeStrip source for Current Take", async () => {
    codeStrip.currentCode.value = 'note("c4 d4").sound("piano")';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = shallowMount(PatternList);
    const reel = wrapper.getComponent(PatternReel);
    const current = reelItems(wrapper).at(-1);

    expect(current).toMatchObject({
      id: "current-pattern-take",
      canCopy: true,
      canOpenStrudel: true,
    });

    reel.vm.$emit("copy", "current-pattern-take");
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(codeStrip.currentCode.value);

    reel.vm.$emit("openStrudel", "current-pattern-take");
    expect(open).toHaveBeenCalledWith(
      `https://strudel.cc/#${btoa(codeStrip.currentCode.value)}`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("updates Current Take action availability as the live CodeStrip changes", async () => {
    const wrapper = shallowMount(PatternList);

    expect(reelItems(wrapper).at(-1)).toMatchObject({
      canCopy: false,
      canOpenStrudel: false,
    });

    codeStrip.currentCode.value = 'note("e4")';
    await nextTick();
    expect(reelItems(wrapper).at(-1)).toMatchObject({
      canCopy: true,
      canOpenStrudel: true,
    });

    codeStrip.currentCode.value = "// Record a pattern";
    await nextTick();
    expect(reelItems(wrapper).at(-1)).toMatchObject({
      canCopy: false,
      canOpenStrudel: false,
    });
  });
});
