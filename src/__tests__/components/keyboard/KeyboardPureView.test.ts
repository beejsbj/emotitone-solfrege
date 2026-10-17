import { mount } from "@vue/test-utils";
import { getActivePinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Keyboard, { type KeyboardIntent } from "@/components/compounds/Keyboard.vue";
import { chordMembers, type KeyboardChordView } from "@/components/compounds/keyboardChords";
import {
  noteColorResolverKey,
  staticNoteColorResolver,
} from "@/components/primatives/noteColorContext";
import { buildHarmony } from "@/domain/harmony";

/*
 * W3: the Keyboard compound is a pure view. Mounted with props alone (no
 * Pinia, nothing mocked), in its default production look, it renders what it
 * is given, including chords held by an owner and every QWERTY shortcut, and
 * turns real pointer events into intents.
 */

const rows = [{
  octave: 4,
  keys: [
    { id: "0_4", syllable: "Do", degree: "I", rawPitch: "C4", scaleIndex: 0, pitchClassIndex: 0, shortcut: "A ," },
    { id: "1_4", syllable: "Re", degree: "II", rawPitch: "D4", scaleIndex: 1, pitchClassIndex: 2 },
  ],
}];

function chordViews(): KeyboardChordView[] {
  const [tonic, supertonic] = buildHarmony({ tonic: "C", scaleType: "major", octave: 4 });
  const held = buildHarmony({ tonic: "C", scaleType: "major", octave: 4, alteration: "dark" })[0];
  const members = (chord: typeof tonic) => chordMembers(chord, "major", "C", "colored", "syllable");
  return [
    // A chord still held from before the Joystick moved shows its snapshot.
    { attackHarmony: tonic, harmony: held, members: members(held), pressed: true, orphaned: false, shortcut: "1" },
    { attackHarmony: supertonic, harmony: supertonic, members: members(supertonic), pressed: false, orphaned: false, shortcut: "2" },
  ];
}

function pointer(type: string, pointerId: number, clientX: number, clientY = 20) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: "touch" },
    clientX: { value: clientX },
    clientY: { value: clientY },
    button: { value: 0 },
    isPrimary: { value: true },
  });
  return event;
}

describe("Keyboard as a pure view", () => {
  beforeEach(() => setActivePinia(undefined));
  afterEach(() => vi.restoreAllMocks());

  function mountView() {
    expect(getActivePinia()).toBeUndefined();
    return mount(Keyboard, {
      props: { rows, chords: chordViews(), mainOctave: 4 },
      // The colour context the app provides; without it, Note reads the
      // animated Music Color clock.
      global: { provide: { [noteColorResolverKey as symbol]: staticNoteColorResolver } },
      attachTo: document.body,
    });
  }

  it("renders its props: keys, held chord snapshots, and every QWERTY shortcut", () => {
    const wrapper = mountView();
    const keys = wrapper.findAll(".keyboard__row button");
    const chords = wrapper.findAll(".keyboard__chord-row button");

    expect(keys).toHaveLength(2);
    expect(keys[0].attributes("aria-keyshortcuts")).toBe("A ,");
    expect(keys[1].attributes("aria-keyshortcuts")).toBeUndefined();
    expect(keys[1].attributes("aria-label")).toBe("Re, scale degree two, D four, main octave");

    expect(chords).toHaveLength(2);
    expect(chords.map((chord) => chord.attributes("aria-keyshortcuts"))).toEqual(["1", "2"]);
    expect(chords[0].attributes("data-alteration")).toBe("dark");
    expect(chords[0].classes()).toContain("chord-key--pressed");
    expect(chords[1].classes()).not.toContain("chord-key--pressed");
    wrapper.unmount();
  });

  it("emits press, expression and release intents from real pointer events", () => {
    const wrapper = mountView();
    const key = wrapper.get<HTMLButtonElement>('[data-key-id="0_4"]');
    const root = wrapper.get<HTMLElement>(".keyboard");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(key.element);

    key.element.dispatchEvent(pointer("pointerdown", 5, 50));
    root.element.dispatchEvent(pointer("pointermove", 5, 73));
    root.element.dispatchEvent(pointer("pointerup", 5, 73));

    const press = wrapper.emitted<[KeyboardIntent]>("press")?.[0][0];
    expect(press).toMatchObject({ inputId: "touch:5", keyId: "0_4", scaleIndex: 0, octave: 4, source: "pointer" });
    expect(wrapper.emitted<[{ cents: number; sampleTime?: number }]>("pitchBend")?.[0][0])
      .toMatchObject({ keyId: "0_4", cents: 50, sampleTime: expect.any(Number) });
    expect(wrapper.emitted<[KeyboardIntent]>("release")?.[0][0]).toMatchObject({ keyId: "0_4" });
    wrapper.unmount();
  });

  it("attacks a chord with its live harmony and releases it with the press-time one", async () => {
    const wrapper = mountView();
    const chord = wrapper.get<HTMLButtonElement>('[data-chord-id="degree-1"]');
    const root = wrapper.get<HTMLElement>(".keyboard");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(chord.element);

    chord.element.dispatchEvent(pointer("pointerdown", 6, 50));
    const [tonic] = buildHarmony({ tonic: "C", scaleType: "major", octave: 4 });
    expect(wrapper.emitted<[{ chord: unknown }]>("chordPress")?.[0][0].chord).toEqual(tonic);

    // The host rebuilds the chord row (the Joystick moved); the release still
    // carries the chord that was pressed.
    await wrapper.setProps({ chords: chordViews().map((view) => ({ ...view, attackHarmony: view.harmony })) });
    root.element.dispatchEvent(pointer("pointerup", 6, 50));
    expect(wrapper.emitted<[{ chord: unknown }]>("chordRelease")?.[0][0].chord).toEqual(tonic);
    wrapper.unmount();
  });
});
