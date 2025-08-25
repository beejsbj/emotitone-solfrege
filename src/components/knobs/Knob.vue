<template>
  <div
    ref="wrapperRef"
    class="knob-wrapper max-w-12 mx-auto select-none"
    :class="{
      'cursor-not-allowed opacity-50 pointer-events-none': isDisabled,
      'cursor-not-allowed pointer-events-none saturate-50': isDisplayMode,
    }"
    @mousedown="handleStart"
    @touchstart="handleStart"
    @click="handleClick"
  >
    <div class="relative">
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
        @update:modelValue="handleValueUpdate"
      />

      <!-- Boolean Knob -->
      <BooleanKnob
        v-else-if="knobType === 'boolean'"
        :model-value="actualValue as boolean"
        :is-disabled="isDisabled"
        :theme-color="themeColor || defaultThemeColor"
        :value-label-true="valueLabelTrue"
        :value-label-false="valueLabelFalse"
        @update:modelValue="handleValueUpdate"
      />

      <!-- Options Knob -->
      <OptionsKnob
        v-else-if="knobType === 'options'"
        :model-value="actualValue as string | number"
        :options="options!"
        :is-disabled="isDisabled"
        :theme-color="themeColor || defaultThemeColor"
        @update:modelValue="handleValueUpdate"
      />

      <!-- Button Knob -->
      <ButtonKnob
        v-else-if="knobType === 'button'"
        :is-disabled="isDisabled"
        :button-text="buttonText"
        :is-loading="isLoading"
        :ready-color="readyColor"
        :active-color="activeColor"
        :loading-color="loadingColor"
        :icon="icon"
        :is-active="isActive"
        v-bind="$attrs"
        @click="handleButtonClick"
      />
    </div>

    <!-- Label -->
    <label
      class="block text-xs font-medium opacity-80 whitespace-nowrap text-center"
      :class="{ 'opacity-50': isDisabled }"
    >
      {{ actualLabel }}
    </label>
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
  isActive: {
    type: Boolean,
    default: false,
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
  click: [event?: MouseEvent | TouchEvent];
}>();

// Refs
const wrapperRef = ref<HTMLElement>();

// Enhanced interaction state with better gesture recognition
const interaction = {
  isDragging: ref(false),
  isHeld: ref(false),
  gestureState: ref<
    "idle" | "potential_tap" | "confirmed_drag" | "gesture_ended"
  >("idle"),

  start: ref({
    y: 0,
    x: 0,
    value: 0,
    time: 0,
    optionIndex: 0,
  }),

  current: ref({
    y: 0,
    x: 0,
    totalMovement: 0,
    velocity: 0,
    lastMoveTime: 0,
  }),

  // Accumulator for smooth value changes
  valueAccumulator: ref(0),
  optionAccumulator: ref(0), // Accumulator for options movement
  lastHapticTrigger: ref(0),
  lastOptionChange: ref(0), // Separate tracker for options debouncing

  // Movement buffer for velocity calculation
  movementBuffer: ref<Array<{ y: number; time: number }>>([]),
};

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

// Get the actual label (prioritize label, fallback to paramName for backwards compatibility)
const actualLabel = computed(() => {
  return props.label || "Knob";
});

// Default theme color
const defaultThemeColor = "hsla(158, 100%, 53%, 1)";

// Enhanced gesture detection and interaction
const handleStart = (e: MouseEvent | TouchEvent) => {
  if (props.isDisabled) return;

  e.preventDefault();
  e.stopPropagation();

  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const now = Date.now();

  // Reset interaction state
  interaction.gestureState.value = "potential_tap";
  interaction.isDragging.value = false;
  interaction.isHeld.value = true;
  interaction.valueAccumulator.value = 0;
  interaction.optionAccumulator.value = 0; // Reset options accumulator
  interaction.lastOptionChange.value = 0; // Reset options debounce
  interaction.movementBuffer.value = [];

  // Store initial state
  interaction.start.value = {
    y: clientY,
    x: clientX,
    value: actualValue.value as number,
    time: now,
    optionIndex: getCurrentOptionIndex(),
  };

  interaction.current.value = {
    y: clientY,
    x: clientX,
    totalMovement: 0,
    velocity: 0,
    lastMoveTime: now,
  };

  // Add global event listeners
  if ("touches" in e) {
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);
  } else {
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  }

  triggerUIHaptic();
};

const handleMove = (e: Event) => {
  if (!interaction.isHeld.value || props.isDisabled) return;

  const event = e as MouseEvent | TouchEvent;
  event.preventDefault();
  event.stopPropagation();

  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
  const now = Date.now();

  // Update current position
  const deltaY = interaction.current.value.y - clientY;
  interaction.current.value.y = clientY;
  interaction.current.value.x = clientX;

  // Calculate total movement from start
  const totalMovement = Math.sqrt(
    Math.pow(clientY - interaction.start.value.y, 2) +
      Math.pow(clientX - interaction.start.value.x, 2)
  );
  interaction.current.value.totalMovement = totalMovement;

  // Update movement buffer for velocity calculation
  interaction.movementBuffer.value.push({ y: clientY, time: now });
  if (interaction.movementBuffer.value.length > 5) {
    interaction.movementBuffer.value.shift();
  }

  // Calculate velocity
  if (interaction.movementBuffer.value.length >= 2) {
    const recent =
      interaction.movementBuffer.value[
        interaction.movementBuffer.value.length - 1
      ];
    const previous =
      interaction.movementBuffer.value[
        interaction.movementBuffer.value.length - 2
      ];
    const timeDelta = recent.time - previous.time;
    if (timeDelta > 0) {
      interaction.current.value.velocity = (previous.y - recent.y) / timeDelta;
    }
  }

  // Gesture state machine
  if (
    interaction.gestureState.value === "potential_tap" &&
    totalMovement > props.tapThreshold
  ) {
    interaction.gestureState.value = "confirmed_drag";
    interaction.isDragging.value = true;
  }

  // Only process movement if we're in confirmed drag state
  if (interaction.gestureState.value !== "confirmed_drag") return;

  // Apply movement based on knob type with enhanced algorithms
  const timeDelta = now - interaction.current.value.lastMoveTime;
  interaction.current.value.lastMoveTime = now;

  if (knobType.value === "range") {
    handleRangeMovement(deltaY, timeDelta);
  } else if (knobType.value === "boolean") {
    handleBooleanMovement(deltaY);
  } else if (knobType.value === "options" && props.options?.length) {
    handleOptionsMovement(deltaY, timeDelta);
  }
};

const handleRangeMovement = (deltaY: number, timeDelta: number) => {
  // Enhanced range movement with controlled sensitivity
  const range = props.max - props.min;

  // Much more conservative base sensitivity
  let sensitivity = props.sensitivity * 0.25; // Reduce base sensitivity significantly

  // More conservative dynamic scaling based on range
  if (range < 1) sensitivity *= 0.4; // Even more precise for small ranges
  else if (range > 100) sensitivity *= 1.2; // Less aggressive for large ranges

  // Reduced velocity-based acceleration (optional and subtle)
  const velocityFactor = Math.min(
    Math.abs(interaction.current.value.velocity) * 0.02,
    0.3
  );
  const finalSensitivity = sensitivity * (1 + velocityFactor);

  // Calculate raw change with reduced multiplier
  const rawChange = deltaY * finalSensitivity * range * 0.4; // Additional reduction

  // Add to accumulator for smoother transitions
  interaction.valueAccumulator.value += rawChange;

  // Higher threshold for changes to require more deliberate movement
  const changeThreshold = props.step * 0.6; // Increased from 0.3
  if (Math.abs(interaction.valueAccumulator.value) >= changeThreshold) {
    let newValue =
      (actualValue.value as number) + interaction.valueAccumulator.value;

    // Clamp to bounds
    newValue = Math.max(props.min, Math.min(props.max, newValue));

    // Apply step quantization - ensure we land on valid step values
    if (props.step > 0) {
      const stepsFromMin = Math.round((newValue - props.min) / props.step);
      newValue = props.min + (stepsFromMin * props.step);
      // Ensure we stay within bounds after step adjustment
      newValue = Math.max(props.min, Math.min(props.max, newValue));
    }

    // Only update if value actually changed
    if (newValue !== actualValue.value) {
      handleValueUpdate(newValue);
      triggerSmartHaptic();
      interaction.valueAccumulator.value = 0; // Reset accumulator
    }
  }
};

const handleBooleanMovement = (deltaY: number) => {
  // Enhanced boolean toggle with higher threshold for deliberate action
  const TOGGLE_THRESHOLD = 15; // Increased from 8 to require more intentional movement

  if (Math.abs(deltaY) >= TOGGLE_THRESHOLD) {
    const newValue = deltaY > 0; // Down = true, up = false

    if (newValue !== actualValue.value) {
      handleValueUpdate(newValue);
      triggerSmartHaptic();
    }
  }
};

const handleOptionsMovement = (deltaY: number, timeDelta: number) => {
  // Enhanced options cycling with cumulative movement and smooth debouncing
  const CYCLE_THRESHOLD = 15; // Threshold for one option change
  const MIN_CYCLE_INTERVAL = 100; // Minimum time between option changes

  // Add movement to accumulator
  interaction.optionAccumulator.value += deltaY;

  // Check if we've accumulated enough movement for a change
  if (Math.abs(interaction.optionAccumulator.value) >= CYCLE_THRESHOLD) {
    const now = Date.now();
    if (now - interaction.lastOptionChange.value < MIN_CYCLE_INTERVAL) {
      return; // Debounce rapid cycling
    }

    const currentIndex = getCurrentOptionIndex();
    const direction = interaction.optionAccumulator.value > 0 ? 1 : -1;

    // Calculate how many steps we should take based on accumulated movement
    const steps = Math.floor(
      Math.abs(interaction.optionAccumulator.value) / CYCLE_THRESHOLD
    );

    const nextIndex =
      (currentIndex + direction * steps + props.options!.length) %
      props.options!.length;
    const nextOption = props.options![nextIndex];
    const nextValue =
      typeof nextOption === "string" ? nextOption : nextOption.value;

    if (nextValue !== actualValue.value) {
      handleValueUpdate(nextValue);
      triggerSmartHaptic();
      interaction.lastOptionChange.value = now;

      // Reset accumulator after successful change
      interaction.optionAccumulator.value = 0;
    }
  }
};

const handleEnd = (e: Event) => {
  if (props.isDisabled) return;

  const event = e as MouseEvent | TouchEvent;
  event.preventDefault();
  event.stopPropagation();

  const now = Date.now();
  const touchDuration = now - interaction.start.value.time;

  // Handle tap gesture if we never entered drag state
  if (
    interaction.gestureState.value === "potential_tap" &&
    touchDuration < props.tapDuration &&
    interaction.current.value.totalMovement <= props.tapThreshold
  ) {
    handleTap();
  }

  // Clean up state
  interaction.gestureState.value = "gesture_ended";
  interaction.isDragging.value = false;
  interaction.isHeld.value = false;
  interaction.valueAccumulator.value = 0;
  interaction.optionAccumulator.value = 0;
  interaction.movementBuffer.value = [];

  // Remove global event listeners
  if ("touches" in event || "changedTouches" in event) {
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("touchend", handleEnd);
    document.removeEventListener("touchcancel", handleEnd);
  } else {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleEnd);
  }

  // Reset to idle after a brief delay
  setTimeout(() => {
    interaction.gestureState.value = "idle";
  }, 50);
};

const handleClick = (e: MouseEvent | TouchEvent) => {
  // Skip click handling for touch events (handled in handleEnd)
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
    emit("click");
    triggerUIHaptic();
  } else if (knobType.value === "options" && props.options) {
    const currentIndex = getCurrentOptionIndex();
    const nextIndex = (currentIndex + 1) % props.options.length;
    const nextOption = props.options[nextIndex];
    const nextValue =
      typeof nextOption === "string" ? nextOption : nextOption.value;
    handleValueUpdate(nextValue);
    triggerUIHaptic();
  }
};

const handleButtonClick = (event: MouseEvent | TouchEvent) => {
  emit("click", event);
  triggerUIHaptic();
};

const getCurrentOptionIndex = (): number => {
  if (!props.options) return 0;
  const currentValue = actualValue.value;
  return props.options.findIndex((option) => {
    const optionValue = typeof option === "string" ? option : option.value;
    return optionValue === currentValue;
  });
};

// Smart haptic feedback with throttling
const triggerSmartHaptic = () => {
  const now = Date.now();
  const MIN_HAPTIC_INTERVAL = 50; // Minimum time between haptic triggers

  if (now - interaction.lastHapticTrigger.value >= MIN_HAPTIC_INTERVAL) {
    triggerUIHaptic();
    interaction.lastHapticTrigger.value = now;
  }
};

// Emit handler that emits both events for backwards compatibility
const handleValueUpdate = (newValue: string | number | boolean) => {
  emit("update:modelValue", newValue);
  emit("update:value", newValue); // Backwards compatibility
};

// GSAP animation for wrapper scale with enhanced timing
useGSAP(({ gsap }: { gsap: any }) => {
  watch(interaction.isHeld, (held) => {
    if (!wrapperRef.value) return;
    gsap.to(wrapperRef.value, {
      scale: held ? 1.15 : 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.3)",
    });
  });

  watch(interaction.lastHapticTrigger, () => {
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
  user-select: none;
  touch-action: none;
}
</style>
