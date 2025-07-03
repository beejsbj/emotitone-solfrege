<template>
  <div
    ref="wrapperRef"
    class="knob-wrapper max-w-12 max-h-12 mx-auto relative select-none"
    :class="{
      'cursor-not-allowed opacity-50 pointer-events-none':
        isDisabled || isDisplayMode,
    }"
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
      :mode="rangeMode"
      :format-value="formatValue"
      :is-disabled="isDisabled"
      :show-progress="true"
      :theme-color="themeColor || defaultThemeColor"
      @update:modelValue="handleValueUpdate"
    />

    <!-- Boolean Knob -->
    <BooleanKnob
      v-else-if="knobType === 'boolean'"
      :model-value="actualValue as boolean"
      :label="actualLabel"
      :is-disabled="isDisabled"
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
      :theme-color="themeColor || defaultThemeColor"
      @update:modelValue="handleValueUpdate"
    />

    <!-- Button Knob -->
    <ButtonKnob
      v-else-if="knobType === 'button'"
      :model-value="actualValue as boolean"
      :label="actualLabel"
      :is-disabled="isDisabled"
      :button-text="buttonText"
      :active-text="activeText"
      :is-loading="isLoading"
      :ready-color="readyColor"
      :active-color="activeColor"
      :loading-color="loadingColor"
      :icon="icon"
      @update:modelValue="handleValueUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from "vue";
import useGSAP from "@/composables/useGSAP";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import {
  RangeKnob,
  BooleanKnob,
  OptionsKnob,
  ButtonKnob,
} from "@/components/knobs";
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
  rangeMode: {
    type: String as () => "interactive" | "display",
    default: "interactive",
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
  buttonText: {
    type: String,
    default: undefined,
  },
  activeText: {
    type: String,
    default: undefined,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  readyColor: {
    type: String,
    default: "hsla(120, 70%, 50%, 1)",
  },
  activeColor: {
    type: String,
    default: "hsla(0, 84%, 60%, 1)",
  },
  loadingColor: {
    type: String,
    default: "hsla(43, 96%, 56%, 1)",
  },
  icon: {
    type: [String, Object],
    default: undefined,
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
  lastY: ref(0),
  lastX: ref(0),
};

// Get the actual value (prioritize modelValue, fallback to value for backwards compatibility)
const actualValue = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue;
  if (props.value !== undefined) return props.value;
  // Default fallback values
  return 0;
});

const isDisplayMode = computed(() => props.rangeMode === "display");

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

  interaction.lastY.value = clientY;
  interaction.lastX.value = clientX;

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

  // Calculate movement relative to last position
  const yDiff = interaction.lastY.value - clientY;

  // Update last known position
  interaction.lastY.value = clientY;
  interaction.lastX.value = clientX;

  // Check if moved beyond threshold (for tap detection)
  const totalMovement = Math.sqrt(
    Math.pow(clientY - interaction.dragStart.value.y, 2) +
      Math.pow(clientX - interaction.dragStart.value.x, 2)
  );

  if (totalMovement > props.tapThreshold) {
    interaction.dragStart.value.moved = true;
  }

  const MOVEMENT_THRESHOLD = 3; // Increased threshold for better control

  // Handle movement based on knob type
  if (knobType.value === "range") {
    // For range, apply continuous movement
    const range = props.max - props.min;
    const change = yDiff * 0.01 * range;
    let newValue = (actualValue.value as number) + change;

    // Clamp to min/max
    newValue = Math.max(props.min, Math.min(props.max, newValue));

    // Round to step
    if (props.step > 0) {
      newValue = Math.round(newValue / props.step) * props.step;
    }

    if (newValue !== actualValue.value) {
      handleValueUpdate(newValue);
      triggerUIHaptic();
    }
  } else if (knobType.value === "boolean") {
    // For boolean, simple up/down toggle
    if (Math.abs(yDiff) >= MOVEMENT_THRESHOLD) {
      // Moving down is true, up is false
      const newValue = yDiff > 0;

      if (newValue !== actualValue.value) {
        handleValueUpdate(newValue);
        triggerUIHaptic();
      }
    }
  } else if (knobType.value === "options" && props.options?.length) {
    // Enhanced options cycling with continuous dragging
    if (Math.abs(yDiff) >= MOVEMENT_THRESHOLD) {
      const currentIndex = getCurrentOptionIndex();
      // Determine direction based on movement
      const direction = yDiff > 0 ? 1 : -1;
      // Calculate new index with wrapping
      const nextIndex =
        (currentIndex + direction + props.options.length) %
        props.options.length;
      const nextOption = props.options[nextIndex];
      const nextValue =
        typeof nextOption === "string" ? nextOption : nextOption.value;

      if (nextValue !== actualValue.value) {
        handleValueUpdate(nextValue);
        triggerUIHaptic();
      }

      // Reset the last Y position to prevent rapid cycling
      interaction.lastY.value = clientY;
    }
  }
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
  } else if (knobType.value === "button") {
    // For button type, toggle the value and trigger haptic
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
