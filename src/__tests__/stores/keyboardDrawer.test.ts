import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";

vi.mock("@/services/superdoughAudio", () => ({
  attackNote: vi.fn().mockResolvedValue(undefined),
  releaseNote: vi.fn(),
  releaseAll: vi.fn(),
  playNoteWithDuration: vi.fn().mockResolvedValue(undefined),
}));

describe("keyboardDrawer store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("rehydrates active touches safely before checking for an existing press", () => {
    const keyboardDrawerStore = useKeyboardDrawerStore();

    (
      keyboardDrawerStore.touch.activeTouches as unknown as Record<string, string>
    ) = {
      "midi:test:1:60": "0_4",
    };

    expect(keyboardDrawerStore.hasActiveTouch("midi:test:1:60")).toBe(true);
    expect(keyboardDrawerStore.touch.activeTouches).toBeInstanceOf(Map);
  });

  it("tracks active touches through the public touch actions", () => {
    const keyboardDrawerStore = useKeyboardDrawerStore();

    keyboardDrawerStore.addTouch("midi:test:1:60", "0_4");

    expect(keyboardDrawerStore.hasActiveTouch("midi:test:1:60")).toBe(true);

    keyboardDrawerStore.removeTouch("midi:test:1:60");

    expect(keyboardDrawerStore.hasActiveTouch("midi:test:1:60")).toBe(false);
  });

  it("keeps playback activations alive until every overlapping activation releases", () => {
    const keyboardDrawerStore = useKeyboardDrawerStore();

    keyboardDrawerStore.activateVisualNote("playback:a", "0_4");
    keyboardDrawerStore.activateVisualNote("playback:b", "0_4");

    expect(keyboardDrawerStore.isVisualNoteActive("0_4")).toBe(true);
    expect(keyboardDrawerStore.isKeyVisuallyActive("0_4")).toBe(true);

    keyboardDrawerStore.releaseVisualNote("playback:a");

    expect(keyboardDrawerStore.isVisualNoteActive("0_4")).toBe(true);

    keyboardDrawerStore.releaseVisualNote("playback:b");

    expect(keyboardDrawerStore.isVisualNoteActive("0_4")).toBe(false);
  });

  it("treats active notes from the music store as visually active keys", async () => {
    const keyboardDrawerStore = useKeyboardDrawerStore();
    const musicStore = useMusicStore();

    const noteId = await musicStore.attackNoteWithOctave(0, 4);

    expect(noteId).toBeTruthy();
    expect(keyboardDrawerStore.isKeyVisuallyActive("0_4")).toBe(true);

    await musicStore.releaseNote(noteId || undefined);

    expect(keyboardDrawerStore.isKeyVisuallyActive("0_4")).toBe(false);
  });
});
