import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { VueWrapper } from "@vue/test-utils";
import { createTestWrapper } from "../../helpers/test-utils";
import FeelingLine from "@/components/uniques/FeelingLine.vue";
import { describeInterval } from "@/domain/musicalIdentity";
import { createSolfegeData } from "@/data/solfege";
import { FEELING_ANNOUNCE_SETTLE_MS } from "@/composables/useIntervalFeelings";
import type { ChromaticNote, MusicalMode } from "@/types/music";

const HOLD_MS = 2000;

/** The interval data's words for a Tonal interval name in a mode. */
function wordsFor(tonal: string, mode: MusicalMode) {
  const [entry] = createSolfegeData([tonal], [describeInterval(tonal)!.semitones], mode);
  return { emotion: entry.emotion, description: entry.description };
}

describe("FeelingLine", () => {
  let target: EventTarget;
  let wrapper: VueWrapper | null = null;

  // Lifecycle tests run still: jsdom has no transition end for a leave.
  const mountLine = (props: Record<string, unknown> = {}) => {
    wrapper = createTestWrapper(FeelingLine, {
      props: { eventTarget: target, usableHeight: 400, holdTime: HOLD_MS, reducedMotion: true, ...props },
      global: { stubs: { transition: false } },
    }) as VueWrapper;
    return wrapper;
  };

  const play = async (
    noteId: string,
    noteName: string,
    key: ChromaticNote,
    mode: MusicalMode,
    extra: Record<string, unknown> = {},
  ) => {
    target.dispatchEvent(new CustomEvent("note-played", {
      detail: { noteId, noteName, octave: Number(noteName.at(-1)), key, mode, ...extra },
    }));
    await nextTick();
  };

  const release = async (noteId: string) => {
    target.dispatchEvent(new CustomEvent("note-released", { detail: { noteId } }));
    await nextTick();
  };

  const rows = () => wrapper!.findAll('[data-testid="feeling-line-row"]');
  const rowText = (index: number) => ({
    syllable: rows()[index].find(".feeling-line__syllable").text(),
    interval: rows()[index].find(".feeling-line__interval").text(),
    text: rows()[index].find(".feeling-line__text").text(),
  });
  const announced = () => wrapper!.find('[aria-live="polite"]').text();

  beforeEach(() => {
    vi.useFakeTimers();
    target = new EventTarget();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.useRealTimers();
  });

  it.each([
    ["F", "major", "A#4", "Fa", "4P"],
    ["Eb", "major", "G4", "Mi", "3M"],
    ["A", "minor", "C5", "Me", "3m"],
    ["D", "dorian", "B4", "La", "6M"],
    ["E", "phrygian", "F4", "Ra", "2m"],
    ["C", "chromatic", "F#4", "Fi", "4A"],
  ] as const)("names %s %s %s as %s, %s from the tonic, with that interval's description", async (key, mode, pitch, syllable, tonal) => {
    mountLine();
    await play("n1", pitch, key, mode);

    expect(rows()).toHaveLength(1);
    expect(rowText(0)).toEqual({
      syllable,
      interval: describeInterval(tonal)!.label,
      text: wordsFor(tonal, mode).description,
    });
  });

  it("follows the la-based minor syllable without changing the interval or its words", async () => {
    mountLine({ laBasedMinor: true });
    await play("n1", "C5", "A", "minor");

    expect(rowText(0)).toEqual({
      syllable: "Do",
      interval: "m3",
      text: wordsFor("3m", "minor").description,
    });
  });

  it("reads a held chord as one row per degree, low to high, with each interval's shortest words", async () => {
    mountLine();
    await play("a", "A4", "C", "major");
    await play("c", "C5", "C", "major");
    await play("e", "E5", "C", "major");
    // An octave doubling is the same degree, not another row.
    await play("a2", "A3", "C", "major");

    expect(rows().map((_, index) => rowText(index))).toEqual([
      { syllable: "La", interval: "M6", text: wordsFor("6M", "major").emotion },
      { syllable: "Do", interval: "P1", text: wordsFor("1P", "major").emotion },
      { syllable: "Mi", interval: "M3", text: wordsFor("3M", "major").emotion },
    ]);
  });

  it("is hidden until a note sounds, holds after release, then clears", async () => {
    mountLine();
    expect(rows()).toHaveLength(0);

    await play("n1", "G4", "C", "major");
    expect(rows()).toHaveLength(1);

    await release("n1");
    vi.advanceTimersByTime(HOLD_MS - 1);
    await nextTick();
    expect(rowText(0).syllable).toBe("Sol");

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(rows()).toHaveLength(0);
  });

  it("starts a fresh readout for a note struck after everything was released", async () => {
    mountLine();
    await play("n1", "C4", "C", "major");
    await release("n1");
    await play("n2", "D4", "C", "major");

    expect(rows().map((_, index) => rowText(index).syllable)).toEqual(["Re"]);
  });

  it("releases a one-shot note after its duration", async () => {
    mountLine();
    await play("", "B4", "C", "major", { noteId: undefined, durationMs: 300 });
    expect(rowText(0).syllable).toBe("Ti");

    vi.advanceTimersByTime(300 + HOLD_MS);
    await nextTick();
    expect(rows()).toHaveLength(0);
  });

  it("speaks only a readout that has settled, never each passing note", async () => {
    mountLine();
    await play("n1", "C4", "C", "major");
    vi.advanceTimersByTime(FEELING_ANNOUNCE_SETTLE_MS / 2);
    await release("n1");
    await play("n2", "E4", "C", "major");
    await nextTick();
    expect(announced()).toBe("");

    vi.advanceTimersByTime(FEELING_ANNOUNCE_SETTLE_MS);
    await nextTick();
    expect(announced()).toBe(
      `Mi, major third: ${wordsFor("3M", "major").description}`,
    );
  });

  it("keeps the visible readout away from assistive technology, which hears the live region", async () => {
    mountLine();
    await play("n1", "C4", "C", "major");

    expect(wrapper!.find(".feeling-line__rows").attributes("aria-hidden")).toBe("true");
  });

  it("animates its entrance, and appears still under Reduced Motion", async () => {
    mountLine({ reducedMotion: false });
    await play("n1", "C4", "C", "major");
    expect(wrapper!.find(".feeling-line__rows").classes()).toContain("feeling-line-enter-active");
    wrapper!.unmount();

    target = new EventTarget();
    mountLine({ reducedMotion: true });
    await play("n1", "C4", "C", "major");
    const classes = wrapper!.find(".feeling-line__rows").classes();
    expect(classes.filter((name) => name.startsWith("feeling-line-"))).toEqual([]);
    expect(rows()).toHaveLength(1);

    await release("n1");
    vi.advanceTimersByTime(HOLD_MS);
    await nextTick();
    // No leave transition holds the readout on screen.
    expect(wrapper!.find(".feeling-line__rows").exists()).toBe(false);
  });
});
