<template>
  <div class="knob-container" :class="{ disabled: isDisabled }">
    <div
      class="knob-wrapper"
      @mousedown="handleStart"
      @touchstart="handleStart"
      @click="handleClick"
      @contextmenu.prevent
    >
      <svg class="knob-svg" :style="svgStyle">
        <!-- background static arc -->
        <path
          fill="none"
          :stroke="color"
          :stroke-width="topArcStrokeWidth"
          :d="backgroundArcPath"
        />
        <!-- dynamic arc -->
        <path
          fill="none"
          :stroke="activeColor"
          :stroke-width="knobStrokeWidth"
          :d="dynamicArcPath"
        />
        <!-- Value text in center -->
        <text
          :x="centerX"
          :y="centerY"
          text-anchor="middle"
          dominant-baseline="central"
          class="knob-value"
        >
          {{ displayValue }}
        </text>
      </svg>
    </div>
    <span class="knob-title">{{ paramName }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from "vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// Props
const props = defineProps({
  value: {
    type: Number,
    required: true,
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
  paramName: {
    type: String,
    required: true,
  },
  formatValue: {
    type: Function,
    default: (value: number) => value.toString(),
  },
  isDisabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: Number,
    default: 48,
  },
});

// Emits
const emit = defineEmits(["update:value", "click"]);

// Reactive data
const isDragging = ref(false);
const isHeld = ref(false);
const dragStart = ref({
  y: 0,
  value: 0,
  time: 0, // Track touch start time
  moved: false, // Track if touch moved
});

// Check if this is a boolean toggle (0/1 with step 1)
const isBooleanToggle = computed(() => {
  return props.min === 0 && props.max === 1 && props.step === 1;
});

// Calculate color intensity based on value
const getColorIntensity = (baseColor: string, intensity: number): string => {
  // For the green component, we'll make it more intense as the value increases
  if (baseColor === "#00ff88") {
    const normalizedValue = (props.value - props.min) / (props.max - props.min);
    const r = 0;
    const g = Math.round(255 * (0.2 + 0.8 * normalizedValue)); // Varies from 20% to 100% intensity
    const b = Math.round(136 * (0.2 + 0.8 * normalizedValue)); // Varies from 20% to 100% intensity
    return `rgb(${r}, ${g}, ${b})`;
  }
  return baseColor;
};

// Constants
const color = computed(() => (props.isDisabled ? "#333" : "#666"));
const activeColor = computed(() => {
  if (props.isDisabled) return "#444";
  if (isBooleanToggle.value) {
    return props.value === 1
      ? getColorIntensity("#00ff88", props.value)
      : "#ff6b6b";
  }
  return getColorIntensity("#00ff88", props.value);
});

const knobRadius = computed(() => (props.size / 2) - 6);
const knobStrokeWidth = 6;
const topArcStrokeWidth = 2;
const topArcRadius = computed(() => knobRadius.value + topArcStrokeWidth + 1);
const startAngle = -137;
const endAngle = 137;
const centerX = computed(() => knobRadius.value + knobStrokeWidth);
const centerY = computed(() => knobRadius.value + knobStrokeWidth);

// Computed properties
const svgStyle = computed(() => ({
  height: `${2 * (knobRadius.value + knobStrokeWidth)}px`,
  width: `${2 * (knobRadius.value + knobStrokeWidth)}px`,
  transform: isHeld.value ? "scale(1.2)" : "scale(1)",
  transition: "transform 0.2s ease",
}));

const displayValue = computed(() => {
  const formatted = props.formatValue(props.value);
  // If it's a number, format it with 1 decimal place, otherwise return as-is
  if (typeof formatted === "number") {
    return formatted.toFixed(1);
  }
  // If it's already a string that represents a number, try to parse and format
  if (typeof formatted === "string") {
    const parsed = parseFloat(formatted);
    if (!isNaN(parsed) && !isBooleanToggle.value) {
      return parsed.toFixed(1);
    }
    return formatted;
  }
  return String(formatted);
});

const backgroundArcPath = computed(() => {
  return describeArc(centerX.value, centerY.value, topArcRadius.value, startAngle, endAngle);
});

const dynamicArcPath = computed(() => {
  const normalizedValue = (props.value - props.min) / (props.max - props.min);
  const currentAngle = startAngle + normalizedValue * (endAngle - startAngle);

  return describeArc(centerX.value, centerY.value, knobRadius.value, startAngle, currentAngle);
});

// Utility functions
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  const d = [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
  return d;
};

const clampValue = (value: number): number => {
  const clamped = Math.max(props.min, Math.min(props.max, value));
  return Math.round(clamped / props.step) * props.step;
};

// Event handlers
const handleClick = (e: MouseEvent | TouchEvent) => {
  // Skip click handling for touch events - we'll handle those in touchend
  if ("touches" in e) return;

  if (props.isDisabled || isDragging.value) return;

  // Handle click for boolean toggles
  if (isBooleanToggle.value) {
    e.preventDefault();
    e.stopPropagation();
    const newValue = props.value === 1 ? 0 : 1;
    emit("update:value", newValue);
    triggerUIHaptic();
  }
};

const handleStart = (e: MouseEvent | TouchEvent) => {
  if (props.isDisabled) return;

  e.preventDefault();
  e.stopPropagation();

  isDragging.value = true;
  isHeld.value = true;

  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  dragStart.value = {
    y: clientY,
    value: props.value,
    time: Date.now(),
    moved: false,
  };

  // Add global event listeners
  if ("touches" in e) {
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
  } else {
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  }
};

const handleMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || props.isDisabled) return;

  e.preventDefault();
  e.stopPropagation();

  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  // Mark as moved if the touch has moved more than a few pixels
  if (Math.abs(clientY - dragStart.value.y) > 5) {
    dragStart.value.moved = true;
  }

  // Only use vertical movement, inverted (up = increase)
  const yDiff = (dragStart.value.y - clientY) * 0.5; // Sensitivity factor
  const valueRange = props.max - props.min;
  const sensitivity = valueRange / 100; // Adjust based on range

  const newValue = dragStart.value.value + yDiff * sensitivity;
  const clampedValue = clampValue(newValue);

  if (clampedValue !== props.value) {
    emit("update:value", clampedValue);
    triggerUIHaptic();
  }
};

const handleEnd = (e: MouseEvent | TouchEvent) => {
  if (props.isDisabled) return;

  e.preventDefault();
  e.stopPropagation();

  // Handle tap for boolean toggles on touch devices
  if ("touches" in e || "changedTouches" in e) {
    const touchDuration = Date.now() - dragStart.value.time;
    // If it was a short touch (< 200ms) and didn't move much, treat as tap
    if (
      isBooleanToggle.value &&
      touchDuration < 200 &&
      !dragStart.value.moved
    ) {
      const newValue = props.value === 1 ? 0 : 1;
      emit("update:value", newValue);
      triggerUIHaptic();
    }
  }

  isDragging.value = false;
  isHeld.value = false;

  // Remove global event listeners
  if ("touches" in e) {
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("touchend", handleEnd);
  } else {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleEnd);
  }
};
</script>

<style scoped>
.knob-container {
  text-align: center;
  user-select: none;
  transition: opacity 0.3s ease;
}

.knob-container.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.knob-wrapper {
  display: inline-block;
  cursor: ns-resize;
  touch-action: none; /* Prevent scrolling on touch */
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.knob-wrapper:hover {
  cursor: pointer;
  transform: scale(1.1);
}

.knob-title {
  color: #ccc;
  font-size: 10px;
  user-select: none;
  text-transform: capitalize;
  margin-top: 4px;
  display: block;
  word-wrap: break-word;
  max-width: 80px;
  line-height: 1.2;
  transition: opacity 0.2s ease;
}

.knob-svg {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  display: block;
  will-change: transform;
}

.knob-wrapper:active .knob-svg,
.knob-wrapper:active {
  transform: scale(1.2);
}

.knob-value {
  fill: #fff;
  font-size: 9px;
  font-weight: bold;
  font-family: monospace;
  pointer-events: none;
  transition: font-size 0.2s ease;
}

.knob-wrapper:active .knob-value {
  font-size: 10px;
}
</style>
