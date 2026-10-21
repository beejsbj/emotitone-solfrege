import { defineComponent, h } from "vue";
import Keyboard from "@/components/compounds/Keyboard.vue";
import { useKeyboardPerformance } from "@/composables/useKeyboardPerformance";

/**
 * The production Keyboard seam, as the Performance Deck builds it: the
 * container composable feeding the pure Keyboard view and taking its intents.
 * `showKeyboard: false` keeps the container (and its QWERTY registration)
 * while the view is not rendered.
 */
export const KeyboardPerformanceHost = defineComponent({
  name: "KeyboardPerformanceHost",
  props: {
    availableHeight: { type: Number, default: undefined },
    showKeyboard: { type: Boolean, default: true },
  },
  setup(props) {
    const performance = useKeyboardPerformance();
    return () => props.showKeyboard
      ? h(Keyboard, {
        ...performance.view.value,
        availableHeight: props.availableHeight,
        onPress: performance.press,
        onRelease: performance.release,
        onPitchBend: performance.pitchBend,
        onGainChange: performance.gainChange,
        onChordPress: performance.chordPress,
        onChordRelease: performance.chordRelease,
        onChordPitchBend: performance.chordPitchBend,
        onChordGainChange: performance.chordGainChange,
      })
      : null;
  },
});
