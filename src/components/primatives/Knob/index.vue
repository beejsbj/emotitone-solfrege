<template>
  <component
    :is="knobTag"
    ref="wrapperRef"
    class="knob-wrapper"
    :type="knobType === 'boolean' ? 'button' : undefined"
    :disabled="knobType === 'boolean' ? isDisabled : undefined"
    :aria-pressed="knobType === 'boolean' ? Boolean(actualValue) : undefined"
    :aria-label="knobType === 'boolean' ? actualLabel : undefined"
    :class="{
      'cursor-not-allowed opacity-50 pointer-events-none': isDisabled,
      'cursor-not-allowed pointer-events-none saturate-50': isDisplayMode,
    }"
    @mousedown="handleStart"
    @touchstart="handleStart"
    @click="handleClick"
  >
    <div class="knob-wrapper__face">
      <!-- Range Knob -->
      <RangeKnob
        v-if="knobType === 'range'"
        :model-value="actualValue as number"
        :min="min"
        :max="max"
        :step="step"
        :is-display="isDisplay"
        :format-value="formatValue"
        :is-disabled="isDisabled"
        :show-progress="true"
        :theme-color="themeColor || defaultThemeColor"
        :visual="visual"
        :tone="tone"
      />

      <!-- Boolean Knob -->
      <BooleanKnob
        v-else-if="knobType === 'boolean'"
        :model-value="actualValue as boolean"
        :is-disabled="isDisabled"
        :theme-color="themeColor || defaultThemeColor"
        :visual="visual"
        :tone="tone"
        :value-label-true="valueLabelTrue"
        :value-label-false="valueLabelFalse"
      />

      <!-- Options Knob -->
      <OptionsKnob
        v-else-if="knobType === 'options'"
        :model-value="actualValue as string | number"
        :options="options!"
        :is-disabled="isDisabled"
        :theme-color="themeColor || defaultThemeColor"
        :visual="visual"
        :tone="tone"
      />

    </div>

    <DragValue
      v-if="showDragValue"
      :x="interactionView.point.x"
      :y="interactionView.point.y"
      :value="dragValue"
    />

    <!-- Label -->
    <span
      class="knob-wrapper__label"
      :class="{ 'opacity-50': isDisabled }"
    >
      {{ actualLabel }}
    </span>
  </component>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  type PropType,
} from "vue";
import useGSAP from "@/composables/useGSAP";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import { createKnobInteraction, knobScrollContextKey } from "./interaction";
import DragValue from "./DragValue.vue";
import RangeKnob from "./RangeKnob.vue";
import BooleanKnob from "./BooleanKnob.vue";
import OptionsKnob from "./OptionsKnob.vue";
import type { KnobTone, KnobType, KnobVisual } from "./types";
import type {
  KnobInteractionContact,
  KnobInteractionOutcome,
  KnobPointerKind,
} from "@/types/knobInteraction";

// Props - keeping the original API for backwards compatibility
const props = defineProps({
  modelValue: {
    type: [Number, String, Boolean],
    default: undefined,
  },
  // Deprecated: keeping 'value' for backwards compatibility
  value: {
    type: [Number, String, Boolean],
    default: undefined,
  },
  type: {
    type: String as () => KnobType,
    default: undefined,
  },
  isDisplay: {
    type: Boolean,
    default: false,
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  step: {
    type: Number,
    default: 1,
  },
  options: {
    type: Array as () =>
      | string[]
      | { label: string; value: string | number; color?: string }[],
    default: undefined,
  },
  label: {
    type: String,
    default: undefined,
  },
  formatValue: {
    type: Function as PropType<(value: number) => string | number>,
    default: (value: number) => value.toString(),
  },
  isDisabled: {
    type: Boolean,
    default: false,
  },
  themeColor: {
    type: String,
    default: undefined,
  },
  visual: {
    type: String as () => KnobVisual,
    default: "arc",
  },
  tone: {
    type: String as () => KnobTone,
    default: "ivory",
  },
  sensitivity: {
    type: Number,
    default: 0.05,
  },
  tapThreshold: {
    type: Number,
    default: 5,
  },
  tapDuration: {
    type: Number,
    default: 200,
  },
  valueLabelTrue: {
    type: [String, Object],
    default: undefined,
  },
  valueLabelFalse: {
    type: [String, Object],
    default: undefined,
  },
});

// Emits - keeping original API
const emit = defineEmits<{
  "update:modelValue": [value: string | number | boolean];
  "update:value": [value: string | number | boolean];
}>();

// Refs
const wrapperRef = ref<HTMLElement>();

// Get the actual value (prioritize modelValue, fallback to value for backwards compatibility)
const actualValue = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue;
  if (props.value !== undefined) return props.value;
  return 0;
});

const isDisplayMode = computed(() => props.isDisplay);

// Auto-detect knob type if not explicitly provided
const knobType = computed((): KnobType => {
  if (props.type) return props.type;

  if (
    props.options &&
    Array.isArray(props.options) &&
    props.options.length > 0
  ) {
    return "options";
  }

  if (
    typeof actualValue.value === "boolean" ||
    (typeof actualValue.value === "number" &&
      props.min === 0 &&
      props.max === 1 &&
      props.step === 1)
  ) {
    return "boolean";
  }

  return "range";
});

const knobTag = computed(() => (knobType.value === "boolean" ? "button" : "div"));

// Get the actual label (prioritize label, fallback to paramName for backwards compatibility)
const actualLabel = computed(() => {
  return props.label || "Knob";
});

const scrollContext = inject(knobScrollContextKey, null);
const interaction = createKnobInteraction(() => ({
  value: actualValue.value,
  kind: knobType.value,
  inert: props.isDisabled || props.isDisplay,
  min: props.min,
  max: props.max,
  step: props.step,
  sensitivity: props.sensitivity,
  tapThreshold: props.tapThreshold,
  tapDuration: props.tapDuration,
  options: (props.options ?? []).map((option) => ({
    value: typeof option === "string" ? option : option.value,
  })),
}));
const interactionView = shallowRef(
  interaction.dispatch({ type: "cancel" }).view,
);
const hapticPulse = ref(0);

const showDragValue = computed(() =>
  interactionView.value.held && !props.isDisabled && !props.isDisplay &&
  knobType.value !== "boolean" &&
  interactionView.value.gesture !== "horizontal_scroll"
);
const dragValue = computed(() => {
  if (knobType.value === "range") return String(props.formatValue(actualValue.value as number));
  const option = props.options?.find((option) =>
    (typeof option === "string" ? option : option.value) === actualValue.value
  );
  return typeof option === "string" ? option : option?.label ?? String(actualValue.value);
});

// Default theme color
const defaultThemeColor = computed(() =>
  props.tone === "brass" ? "var(--brass, #e0a93a)" : "hsla(0, 0%, 82%, 1)"
);

const removeGestureListeners = () => {
  document.removeEventListener("touchmove", handleMove);
  document.removeEventListener("touchend", handleEnd);
  document.removeEventListener("touchcancel", handleEnd);
  document.removeEventListener("mousemove", handleMove);
  document.removeEventListener("mouseup", handleEnd);
  window.removeEventListener("blur", cancelGesture);
};

const captureGesture = (pointer: KnobPointerKind) => {
  removeGestureListeners();
  window.addEventListener("blur", cancelGesture);
  if (pointer === "touch") {
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);
  } else {
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  }
};

const applyOutcome = (result: KnobInteractionOutcome, event?: Event) => {
  interactionView.value = result.view;
  if (result.consume && event) {
    event.preventDefault();
    event.stopPropagation();
  }

  for (const effect of result.effects) {
    if (effect.type === "capture") captureGesture(effect.pointer);
    else if (effect.type === "release") removeGestureListeners();
    else if (effect.type === "scroll") scrollContext?.write(effect.left);
    else if (effect.type === "value") {
      emit("update:modelValue", effect.value);
      emit("update:value", effect.value);
    } else {
      triggerUIHaptic();
      if (effect.pulse === "step") hapticPulse.value += 1;
    }
  }
};

const startContactFrom = (
  event: MouseEvent | TouchEvent,
): KnobInteractionContact | null => {
  if ("touches" in event) {
    const touch =
      event.changedTouches[0] ?? event.touches[event.touches.length - 1];
    return touch
      ? { id: touch.identifier, point: { x: touch.clientX, y: touch.clientY } }
      : null;
  }
  return { id: null, point: { x: event.clientX, y: event.clientY } };
};

const moveContactsFrom = (
  event: MouseEvent | TouchEvent,
): KnobInteractionContact[] => {
  if ("touches" in event) {
    return Array.from(event.touches, (touch) => ({
      id: touch.identifier,
      point: { x: touch.clientX, y: touch.clientY },
    }));
  }
  return [{ id: null, point: { x: event.clientX, y: event.clientY } }];
};

const handleStart = (event: MouseEvent | TouchEvent) => {
  const contact = startContactFrom(event);
  if (!contact) return;
  const pointer: KnobPointerKind = "touches" in event ? "touch" : "mouse";
  applyOutcome(
    interaction.dispatch({
      type: "start",
      pointer,
      contact,
      button: "button" in event ? event.button : undefined,
      scrollLeft: scrollContext?.read() ?? null,
    }),
    event,
  );
};

const handleMove = (event: Event) => {
  const pointerEvent = event as MouseEvent | TouchEvent;
  applyOutcome(
    interaction.dispatch({
      type: "move",
      contacts: moveContactsFrom(pointerEvent),
    }),
    event,
  );
};

const handleEnd = (event: Event) => {
  const pointerEvent = event as MouseEvent | TouchEvent;
  const pointer: KnobPointerKind = "changedTouches" in pointerEvent
    ? "touch"
    : "mouse";
  const endedContactIds = "changedTouches" in pointerEvent
    ? Array.from(pointerEvent.changedTouches, (touch) => touch.identifier)
    : [];
  applyOutcome(
    interaction.dispatch({
      type: "end",
      pointer,
      endedContactIds,
      cancelled: event.type === "touchcancel",
    }),
    event,
  );
};

const handleClick = (event: MouseEvent | TouchEvent) => {
  if ("touches" in event) return;
  applyOutcome(
    interaction.dispatch({ type: "click", keyboard: event.detail === 0 }),
    event,
  );
};

const cancelGesture = () => {
  applyOutcome(interaction.dispatch({ type: "cancel" }));
};

watch(
  () => props.isDisabled || props.isDisplay,
  (inert) => {
    if (inert) cancelGesture();
  },
);

onBeforeUnmount(() => {
  applyOutcome(interaction.dispose());
  removeGestureListeners();
});

// GSAP animation for wrapper scale with enhanced timing
useGSAP(({ gsap }: { gsap: any }) => {
  watch(() => interactionView.value.held, (held) => {
    if (!wrapperRef.value) return;
    gsap.to(wrapperRef.value, {
      scale: held ? 1.15 : 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.3)",
    });
  });

  watch(hapticPulse, () => {
    if (!wrapperRef.value) return;
    gsap.to(wrapperRef.value, {
      scale: 1,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    });
  });
});
</script>

<style scoped>
.knob-wrapper {
  --knob-size: clamp(3rem, 12vw, 4.5rem);

  display: grid;
  justify-items: center;
  inline-size: min(100%, var(--knob-size));
  max-inline-size: 100%;
  margin-inline: auto;
  container-type: inline-size;
  user-select: none;
  touch-action: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.knob-wrapper__face {
  position: relative;
  inline-size: 100%;
  aspect-ratio: 1;
}

.knob-wrapper__label {
  display: block;
  max-inline-size: 100%;
  margin-block-start: 3cqi;
  overflow: hidden;
  color: currentColor;
  font-size: clamp(0.625rem, 18cqi, 0.75rem);
  font-weight: 500;
  line-height: 1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.8;
}
</style>
