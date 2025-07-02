<template>
  <div
    class="text-center select-none transition-opacity duration-300"
    :class="{ 'opacity-40 pointer-events-none': isDisabled }"
  >
    <div
      ref="knobWrapperRef"
      class="inline-block cursor-ns-resize touch-none transition-transform duration-200 ease-out will-change-transform hover:cursor-pointer hover:scale-110"
      :class="{ 'scale-125': isHeld }"
      @mousedown="handleStart"
      @touchstart="handleStart"
      @click="handleClick"
      @contextmenu.prevent
    >
      <svg
        class="block will-change-transform transition-transform duration-200 ease-out"
        :style="svgStyle"
      >
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
          class="fill-white text-[9px] font-bold font-mono pointer-events-none transition-[font-size] duration-200"
          :class="{ 'text-[10px]': isHeld }"
        >
          {{ displayValue }}
        </text>
      </svg>
    </div>
    <span
      class="text-gray-300 text-xs select-none capitalize block break-words max-w-20 leading-tight transition-opacity duration-200"
    >
      {{ paramName }}
    </span>

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
  themeColor: {
    type: String,
    default: undefined,
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

// Convert color names to HSLA values
const getColorHsla = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    yellow: "hsla(43, 96%, 56%, 1)", // Yellow-400
    purple: "hsla(271, 91%, 65%, 1)", // Purple-500
    red: "hsla(0, 84%, 60%, 1)", // Red-500
    blue: "hsla(217, 91%, 60%, 1)", // Blue-500
    green: "hsla(158, 64%, 52%, 1)", // Green-500
    orange: "hsla(21, 90%, 48%, 1)", // Orange-500
    pink: "hsla(328, 85%, 70%, 1)", // Pink-500
    cyan: "hsla(188, 95%, 43%, 1)", // Cyan-500
    indigo: "hsla(239, 84%, 67%, 1)", // Indigo-500
    gray: "hsla(220, 9%, 46%, 1)", // Gray-500
  };

  // If it's already an HSLA color, return as is
  if (colorName.startsWith("hsla")) return colorName;

  // If it's a hex color, convert to HSLA (simplified conversion to default green)
  if (colorName.startsWith("#")) return "hsla(158, 100%, 53%, 1)"; // Green equivalent

  // Otherwise lookup in color map or default to green
  return colorMap[colorName.toLowerCase()] || "hsla(158, 100%, 53%, 1)";
};

// Calculate color intensity based on value
const getColorIntensity = (baseColor: string, intensity: number): string => {
  // Convert color name to HSLA if needed
  const hslaColor = getColorHsla(baseColor);

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

  // Extract HSLA values and adjust lightness/alpha
  const hslaMatch = hslaColor.match(
    /hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([0-9.]+)\)/
  );
  if (hslaMatch) {
    const h = hslaMatch[1];
    const s = hslaMatch[2];
    const l = Math.round(parseInt(hslaMatch[3]) * finalIntensity);
    return `hsla(${h}, ${s}%, ${l}%, 1)`;
  }

  return hslaColor;
};

// Constants
const color = computed(() =>
  props.isDisabled ? "hsla(0, 0%, 20%, 1)" : "hsla(0, 0%, 40%, 1)"
);
const activeColor = computed(() => {
  if (props.isDisabled) return "hsla(0, 0%, 27%, 1)";

  // Use theme color if provided
  const baseColor = props.themeColor || "hsla(158, 100%, 53%, 1)";

  // For options mode with color support
  if (isOptionsMode.value && getCurrentColor.value) {
    return getColorIntensity(getCurrentColor.value, 1);
  }

  // For boolean toggles
  if (isBooleanToggle.value) {
    return (props.value as number) === 1
      ? getColorIntensity(baseColor, props.value as number)
      : "hsla(0, 84%, 60%, 1)"; // Red
  }

  // Default numeric mode - use theme color or fallback
  return getColorIntensity(baseColor, 1);
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
}));

const tooltipStyle = computed(() => {
  let backgroundColor = "hsla(0, 0%, 0%, 0.8)";
  let borderColor = "transparent";

  // Use current option color for tooltip if available
  if (isOptionsMode.value && getCurrentColor.value) {
    const hslaColor = getColorHsla(getCurrentColor.value);
    // Extract HSLA and modify alpha
    const hslaMatch = hslaColor.match(
      /hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([0-9.]+)\)/
    );
    if (hslaMatch) {
      const h = hslaMatch[1];
      const s = hslaMatch[2];
      const l = hslaMatch[3];
      backgroundColor = `hsla(${h}, ${s}%, ${l}%, 0.2)`;
      borderColor = `hsla(${h}, ${s}%, ${l}%, 0.6)`;
    }
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
    color: "white",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    pointerEvents: "none" as const,
    backdropFilter: "blur(4px)",
    boxShadow:
      "0 4px 6px -1px hsla(0, 0%, 0%, 0.1), 0 2px 4px -1px hsla(0, 0%, 0%, 0.06)",
    transition: "all 0.1s ease-out",
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
/* Minimal custom styles for tooltip since it uses dynamic positioning */
.knob-tooltip {
  /* All styling moved to computed tooltipStyle for dynamic colors */
}
</style>
