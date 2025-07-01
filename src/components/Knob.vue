<template>
  <div class="knob-container" :class="{ disabled: isDisabled }">
    <div
      ref="knobWrapperRef"
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

    <!-- Floating tooltip -->
    <div v-if="showTooltip" class="knob-tooltip" :style="tooltipStyle">
      {{ displayValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from "vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// Props
const props = defineProps({
  value: {
    type: [Number, String],
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
  options: {
    type: Array as () =>
      | string[]
      | { label: string; value: string | number; color?: string }[],
    default: undefined,
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
});

// Emits
const emit = defineEmits(["update:value", "click"]);

// Reactive data
const isDragging = ref(false);
const isHeld = ref(false);
const showTooltip = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const dragStart = ref({
  y: 0,
  value: 0,
  time: 0, // Track touch start time
  moved: false, // Track if touch moved
  index: 0, // Track starting index for options mode
});

// Check if we're in options mode
const isOptionsMode = computed(() => {
  return (
    props.options && Array.isArray(props.options) && props.options.length > 0
  );
});

// Check if this is a boolean toggle (0/1 with step 1) - only for numeric mode
const isBooleanToggle = computed(() => {
  return (
    !isOptionsMode.value &&
    props.min === 0 &&
    props.max === 1 &&
    props.step === 1
  );
});

// Get current option index (for options mode)
const currentOptionIndex = computed(() => {
  if (!isOptionsMode.value || !props.options) return 0;

  const options = props.options;
  if (typeof options[0] === "string") {
    return (options as string[]).indexOf(props.value as string);
  } else {
    return (
      options as { label: string; value: string | number; color?: string }[]
    ).findIndex((opt) => opt.value === props.value);
  }
});

// Get current option (for accessing color and label)
const getCurrentOption = () => {
  if (!isOptionsMode.value || !props.options) return null;

  const options = props.options;
  if (typeof options[0] === "string") {
    return null; // String arrays don't have color property
  } else {
    return (
      options as { label: string; value: string | number; color?: string }[]
    ).find((opt) => opt.value === props.value);
  }
};

// Get current option's color
const getCurrentColor = computed(() => {
  const currentOption = getCurrentOption();
  return currentOption?.color || null;
});

// Get display label for current value
const getDisplayLabel = (value: string | number | undefined = props.value) => {
  if (!isOptionsMode.value || !props.options) {
    return props.formatValue(value as number);
  }

  const options = props.options;
  if (typeof options[0] === "string") {
    return value as string;
  } else {
    const option = (
      options as { label: string; value: string | number; color?: string }[]
    ).find((opt) => opt.value === value);
    return option?.label || String(value);
  }
};

// Convert color names to hex values
const getColorHex = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    yellow: "#fbbf24", // Yellow-400
    purple: "#a855f7", // Purple-500
    red: "#ef4444", // Red-500
    blue: "#3b82f6", // Blue-500
    green: "#10b981", // Green-500
    orange: "#f97316", // Orange-500
    pink: "#ec4899", // Pink-500
    cyan: "#06b6d4", // Cyan-500
    indigo: "#6366f1", // Indigo-500
    gray: "#6b7280", // Gray-500
  };

  // If it's already a hex color, return as is
  if (colorName.startsWith("#")) return colorName;

  // Otherwise lookup in color map or default to green
  return colorMap[colorName.toLowerCase()] || "#00ff88";
};

// Calculate color intensity based on value
const getColorIntensity = (baseColor: string, intensity: number): string => {
  // Convert color name to hex if needed
  const hexColor = getColorHex(baseColor);

  // Parse hex color
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  let normalizedValue: number;

  if (isOptionsMode.value && props.options) {
    // For options mode, use the index position
    normalizedValue = currentOptionIndex.value / (props.options.length - 1);
  } else {
    // For numeric mode, use the actual value
    normalizedValue =
      ((props.value as number) - props.min) / (props.max - props.min);
  }

  // Apply intensity (0.2 to 1.0 range for visibility)
  const finalIntensity = 0.2 + 0.8 * normalizedValue;

  const finalR = Math.round(r * finalIntensity);
  const finalG = Math.round(g * finalIntensity);
  const finalB = Math.round(b * finalIntensity);

  return `rgb(${finalR}, ${finalG}, ${finalB})`;
};

// Constants
const color = computed(() => (props.isDisabled ? "#333" : "#666"));
const activeColor = computed(() => {
  if (props.isDisabled) return "#444";

  // For options mode with color support
  if (isOptionsMode.value && getCurrentColor.value) {
    return getColorIntensity(getCurrentColor.value, 1);
  }

  // For boolean toggles
  if (isBooleanToggle.value) {
    return (props.value as number) === 1
      ? getColorIntensity("#00ff88", props.value as number)
      : "#ff6b6b";
  }

  // Default numeric mode
  return getColorIntensity("#00ff88", 1);
});

const knobRadius = 18;
const knobStrokeWidth = 6;
const topArcStrokeWidth = 2;
const topArcRadius = knobRadius + topArcStrokeWidth + 1;
const startAngle = -137;
const endAngle = 137;
const centerX = knobRadius + knobStrokeWidth;
const centerY = knobRadius + knobStrokeWidth;

// Computed properties
const svgStyle = computed(() => ({
  height: `${2 * (knobRadius + knobStrokeWidth)}px`,
  width: `${2 * (knobRadius + knobStrokeWidth)}px`,
  transform: isHeld.value ? "scale(1.2)" : "scale(1)",
  transition: "transform 0.2s ease",
}));

const tooltipStyle = computed(() => {
  let backgroundColor = "rgba(0, 0, 0, 0.8)";
  let borderColor = "transparent";

  // Use current option color for tooltip if available
  if (isOptionsMode.value && getCurrentColor.value) {
    const hexColor = getColorHex(getCurrentColor.value);
    backgroundColor = hexColor + "20"; // Add 20% opacity
    borderColor = hexColor + "60"; // Add 60% opacity for border
  }

  return {
    position: "fixed" as const,
    left: `${tooltipPosition.value.x}px`,
    top: `${tooltipPosition.value.y}px`,
    transform: "translate(-50%, -100%)",
    zIndex: 9999,
    isolation: "isolate" as const,
    backgroundColor,
    borderColor,
    borderWidth: getCurrentColor.value ? "1px" : "0",
    borderStyle: "solid",
  };
});

const displayValue = computed(() => {
  if (isOptionsMode.value) {
    return getDisplayLabel();
  }

  const formatted = props.formatValue(props.value as number);
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
  return describeArc(centerX, centerY, topArcRadius, startAngle, endAngle);
});

const dynamicArcPath = computed(() => {
  let normalizedValue: number;

  if (isOptionsMode.value && props.options) {
    // For options mode, use the index position
    normalizedValue = currentOptionIndex.value / (props.options.length - 1);
  } else {
    // For numeric mode, use the actual value
    normalizedValue =
      ((props.value as number) - props.min) / (props.max - props.min);
  }

  const currentAngle = startAngle + normalizedValue * (endAngle - startAngle);
  return describeArc(centerX, centerY, knobRadius, startAngle, currentAngle);
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

const clampIndex = (index: number): number => {
  if (!props.options) return 0;
  return Math.max(0, Math.min(props.options.length - 1, Math.round(index)));
};

const getValueFromIndex = (index: number) => {
  if (!isOptionsMode.value || !props.options) return index;

  const clampedIndex = clampIndex(index);
  const options = props.options;

  if (typeof options[0] === "string") {
    return (options as string[])[clampedIndex];
  } else {
    return (options as { label: string; value: string | number }[])[
      clampedIndex
    ].value;
  }
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
    const newValue = (props.value as number) === 1 ? 0 : 1;
    emit("update:value", newValue);
    triggerUIHaptic();
  }

  // Handle click for options mode - cycle to next option
  if (isOptionsMode.value && props.options) {
    e.preventDefault();
    e.stopPropagation();
    const nextIndex = (currentOptionIndex.value + 1) % props.options.length;
    const newValue = getValueFromIndex(nextIndex);
    emit("update:value", newValue);
    triggerUIHaptic();
  }
};

const updateTooltipPosition = (event: MouseEvent | TouchEvent) => {
  let x: number, y: number;

  if (event instanceof TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0];
    x = touch.pageX;
    y = touch.pageY;
  } else {
    x = event.pageX;
    y = event.pageY;
  }

  tooltipPosition.value = {
    x,
    y: y - 40, // 40px above finger/cursor
  };
};

const handleStart = (e: MouseEvent | TouchEvent) => {
  if (props.isDisabled) return;

  e.preventDefault();
  e.stopPropagation();

  isDragging.value = true;
  isHeld.value = true;
  showTooltip.value = true;

  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

  // Set initial tooltip position
  updateTooltipPosition(e);

  dragStart.value = {
    y: clientY,
    value: isOptionsMode.value ? 0 : (props.value as number),
    time: Date.now(),
    moved: false,
    index: isOptionsMode.value ? currentOptionIndex.value : 0,
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
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

  // Update tooltip position
  updateTooltipPosition(e);

  // Mark as moved if the touch has moved more than a few pixels
  if (Math.abs(clientY - dragStart.value.y) > 5) {
    dragStart.value.moved = true;
  }

  // Only use vertical movement, inverted (up = increase)
  const yDiff = (dragStart.value.y - clientY) * 0.5; // Sensitivity factor

  if (isOptionsMode.value && props.options) {
    // Options mode: discrete steps between options
    const sensitivity = props.options.length / 100; // Adjust based on number of options
    const newIndex = dragStart.value.index + yDiff * sensitivity;
    const clampedIndex = clampIndex(newIndex);

    if (clampedIndex !== currentOptionIndex.value) {
      const newValue = getValueFromIndex(clampedIndex);
      emit("update:value", newValue);
      triggerUIHaptic();
    }
  } else {
    // Numeric mode: continuous values
    const valueRange = props.max - props.min;
    const sensitivity = valueRange / 100; // Adjust based on range
    const newValue = dragStart.value.value + yDiff * sensitivity;
    const clampedValue = clampValue(newValue);

    if (clampedValue !== (props.value as number)) {
      emit("update:value", clampedValue);
      triggerUIHaptic();
    }
  }
};

const handleEnd = (e: MouseEvent | TouchEvent) => {
  if (props.isDisabled) return;

  e.preventDefault();
  e.stopPropagation();

  // Handle tap for boolean toggles and options on touch devices
  if ("touches" in e || "changedTouches" in e) {
    const touchDuration = Date.now() - dragStart.value.time;
    // If it was a short touch (< 200ms) and didn't move much, treat as tap
    if (touchDuration < 200 && !dragStart.value.moved) {
      if (isBooleanToggle.value) {
        const newValue = (props.value as number) === 1 ? 0 : 1;
        emit("update:value", newValue);
        triggerUIHaptic();
      } else if (isOptionsMode.value && props.options) {
        const nextIndex = (currentOptionIndex.value + 1) % props.options.length;
        const newValue = getValueFromIndex(nextIndex);
        emit("update:value", newValue);
        triggerUIHaptic();
      }
    }
  }

  isDragging.value = false;
  isHeld.value = false;
  showTooltip.value = false;

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

.knob-tooltip {
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  position: fixed;
  isolation: isolate;
  z-index: 9999;
  transform: translate(-50%, 0);
  pointer-events: none;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.1s ease-out;
}
</style>
