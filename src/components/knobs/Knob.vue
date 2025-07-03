<template>
  <div
    ref="wrapperRef"
    class="knob-wrapper"
    @mousedown="handleStart"
    @touchstart="handleStart"
    @click="handleClick"
  >
    <!-- Range Knob -->
    <RangeKnob
      v-if="knobType === 'range'"
      :model-value="actualValue as number"
      :label="actualLabel"
      :min="min"
      :max="max"
      :step="step"
      :format-value="formatValue"
      :is-disabled="isDisabled"
      :is-held="interaction.isHeld.value"
      :theme-color="themeColor || defaultThemeColor"
      @update:modelValue="handleValueUpdate"
    />

    <!-- Boolean Knob -->
    <BooleanKnob
      v-else-if="knobType === 'boolean'"
      :model-value="actualValue as boolean"
      :label="actualLabel"
      :is-disabled="isDisabled"
      :is-held="interaction.isHeld.value"
      :theme-color="themeColor || defaultThemeColor"
      @update:modelValue="handleValueUpdate"
    />

    <!-- Options Knob -->
    <OptionsKnob
      v-else-if="knobType === 'options'"
      :model-value="actualValue as string | number"
      :label="actualLabel"
      :options="options!"
      :is-disabled="isDisabled"
      :is-held="interaction.isHeld.value"
      :theme-color="themeColor || defaultThemeColor"
      @update:modelValue="handleValueUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from "vue";
import useGSAP from "@/composables/useGSAP";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import { RangeKnob, BooleanKnob, OptionsKnob } from "@/components/knobs";
import type { KnobType } from "@/types/knob";

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
  // Deprecated: keeping 'paramName' for backwards compatibility
  paramName: {
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
});

// Emits - keeping original API
const emit = defineEmits(["update:modelValue", "update:value", "click"]);

// Refs
const wrapperRef = ref<HTMLElement>();

// Interaction state (migrated from useKnobInteraction)
const interaction = {
  isDragging: ref(false),
  isHeld: ref(false),
  dragStart: ref({
    y: 0,
    x: 0,
    value: 0,
    time: 0,
    moved: false,
    index: 0,
  }),
  lastPosition: ref({
    y: 0,
    x: 0,
  }),
};

// Get the actual value (prioritize modelValue, fallback to value for backwards compatibility)
const actualValue = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue;
  if (props.value !== undefined) return props.value;
  // Default fallback values
  return 0;
});

// Auto-detect knob type if not explicitly provided
const knobType = computed((): KnobType => {
  // If type is explicitly provided, use it
  if (props.type) return props.type;

  // Auto-detection logic (backwards compatibility)
  if (
    props.options &&
    Array.isArray(props.options) &&
    props.options.length > 0
  ) {
    return "options";
  }

  // Check if this is a boolean toggle (0/1 with step 1)
  if (
    typeof actualValue.value === "boolean" ||
    (typeof actualValue.value === "number" &&
      props.min === 0 &&
      props.max === 1 &&
      props.step === 1)
  ) {
    return "boolean";
  }

  // Default to range
  return "range";
});

// Get the actual label (prioritize label, fallback to paramName for backwards compatibility)
const actualLabel = computed(() => {
  return props.label || props.paramName || "Knob";
});

// Default theme color
const defaultThemeColor = "hsla(158, 100%, 53%, 1)";

// Interaction logic (migrated from useKnobInteraction)
const handleStart = (e: MouseEvent | TouchEvent) => {
  if (props.isDisabled) return;

  e.preventDefault();
  e.stopPropagation();

  interaction.isDragging.value = true;
  interaction.isHeld.value = true;

  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

  interaction.dragStart.value = {
    y: clientY,
    x: clientX,
    value: actualValue.value as number,
    time: Date.now(),
    moved: false,
    index: 0,
  };

  interaction.lastPosition.value = {
    y: clientY,
    x: clientX,
  };

  // Add global event listeners
  if ("touches" in e) {
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
  } else {
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  }

  triggerUIHaptic();
};

const handleMove = (e: Event) => {
  if (!interaction.isDragging.value || props.isDisabled) return;

  const event = e as MouseEvent | TouchEvent;
  event.preventDefault();
  event.stopPropagation();

  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;

  // Mark as moved if the touch has moved more than threshold from start position
  const totalMovement = Math.sqrt(
    Math.pow(clientY - interaction.dragStart.value.y, 2) +
      Math.pow(clientX - interaction.dragStart.value.x, 2)
  );

  if (totalMovement > props.tapThreshold) {
    interaction.dragStart.value.moved = true;
  }

  // Calculate movement deltas based on last position
  const yDiff =
    (clientY - interaction.lastPosition.value.y) * props.sensitivity;

  // Update last position for next move
  interaction.lastPosition.value = {
    y: clientY,
    x: clientX,
  };

  // Handle different knob types
  if (knobType.value === "range") {
    handleRangeMove(-yDiff); // Negative because moving up (negative y) should increase value
  } else if (knobType.value === "options") {
    handleOptionsMove(-yDiff); // Same for options
  }
  // Boolean knobs don't need move handling, they're tap-only
};

const handleEnd = (e: Event) => {
  if (props.isDisabled) return;

  const event = e as MouseEvent | TouchEvent;
  event.preventDefault();
  event.stopPropagation();

  // Handle tap for touch devices
  if ("touches" in event || "changedTouches" in event) {
    const touchDuration = Date.now() - interaction.dragStart.value.time;

    if (
      touchDuration < props.tapDuration &&
      !interaction.dragStart.value.moved
    ) {
      handleTap();
    }
  }

  interaction.isDragging.value = false;
  interaction.isHeld.value = false;

  // Remove global event listeners
  if ("touches" in event) {
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("touchend", handleEnd);
  } else {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleEnd);
  }
};

const handleClick = (e: MouseEvent | TouchEvent) => {
  // Skip click handling for touch events
  if ("touches" in e) return;
  if (props.isDisabled || interaction.isDragging.value) return;

  e.preventDefault();
  e.stopPropagation();
  handleTap();
};

const handleTap = () => {
  if (knobType.value === "boolean") {
    const newValue = !(actualValue.value as boolean);
    handleValueUpdate(newValue);
    triggerUIHaptic();
  } else if (knobType.value === "options" && props.options) {
    // Cycle to next option
    const currentIndex = getCurrentOptionIndex();
    const nextIndex = (currentIndex + 1) % props.options.length;
    const nextOption = props.options[nextIndex];
    const nextValue =
      typeof nextOption === "string" ? nextOption : nextOption.value;
    handleValueUpdate(nextValue);
    triggerUIHaptic();
  }
};

const handleRangeMove = (yDiff: number) => {
  const currentValue = actualValue.value as number;
  const range = props.max - props.min;
  // Moving up (negative y) increases value
  const change = (yDiff / 200) * range;
  let newValue = currentValue + change;

  // Clamp to min/max
  newValue = Math.max(props.min, Math.min(props.max, newValue));

  // Round to step
  if (props.step > 0) {
    newValue = Math.round(newValue / props.step) * props.step;
  }

  if (newValue !== currentValue) {
    handleValueUpdate(newValue);
    triggerUIHaptic();
  }
};

const handleOptionsMove = (yDiff: number) => {
  if (!props.options) return;

  const currentIndex = getCurrentOptionIndex();
  // Moving up (negative y) increases index
  const change = Math.round(yDiff / 50);
  const newIndex = Math.max(
    0,
    Math.min(props.options.length - 1, currentIndex + change)
  );

  if (newIndex !== currentIndex) {
    const newOption = props.options[newIndex];
    const newValue =
      typeof newOption === "string" ? newOption : newOption.value;
    handleValueUpdate(newValue);
    triggerUIHaptic();
  }
};

const getCurrentOptionIndex = (): number => {
  if (!props.options) return 0;

  const currentValue = actualValue.value;
  return props.options.findIndex((option) => {
    const optionValue = typeof option === "string" ? option : option.value;
    return optionValue === currentValue;
  });
};

// Emit handler that emits both events for backwards compatibility
const handleValueUpdate = (newValue: string | number | boolean) => {
  emit("update:modelValue", newValue);
  emit("update:value", newValue); // Backwards compatibility
};

// GSAP animation for wrapper scale
useGSAP(({ gsap }: { gsap: any }) => {
  watch(interaction.isHeld, (held) => {
    if (!wrapperRef.value) return;
    gsap.to(wrapperRef.value, {
      scale: held ? 1.05 : 1,
      duration: 0.15,
      ease: "power2.out",
    });
  });
});
</script>

<style scoped>
.knob-wrapper {
  user-select: none;
  touch-action: none;
}
</style>
