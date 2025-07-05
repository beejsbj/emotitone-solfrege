# Low Priority: Event Position Logic Extraction

## 🎯 Goal

Centralize mouse and touch event coordinate calculation into a `useEventPosition` composable. This will remove duplicated logic for handling user input across different interactive components and provide a consistent interface for pointer interactions.

## 📋 Background

Logic for extracting coordinates from `MouseEvent` and `TouchEvent` objects, including calculations relative to an element's bounding box, is repeated in several components. This leads to inconsistencies in interaction handling and makes maintaining touch/mouse compatibility more difficult.

## 🔧 Implementation Steps

### Step 1: Analyze Current Position Logic

**Files with duplicated position logic:**

- `src/components/CanvasSolfegePalette.vue`
- `src/components/KeySelector.vue`
- `src/components/pallete/PaletteControls.vue`

**Common patterns to extract:**

- Mouse/touch coordinate extraction
- Element bounding box calculations
- Relative positioning within elements
- Event type detection

### Step 2: Create Event Position Composable

Create `src/composables/ui/useEventPosition.ts`:

```typescript
interface Point {
  x: number;
  y: number;
}

export function useEventPosition() {
  const getEventCoordinates = (
    event: MouseEvent | TouchEvent,
    element: HTMLElement
  ): Point | null => {
    const rect = element.getBoundingClientRect();
    const touch = (event as TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (event as MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (event as MouseEvent).clientY;

    if (clientX === undefined || clientY === undefined) return null;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getRelativePosition = (
    event: MouseEvent | TouchEvent,
    element: HTMLElement
  ): Point | null => {
    const coords = getEventCoordinates(event, element);
    if (!coords) return null;

    const rect = element.getBoundingClientRect();
    return {
      x: coords.x / rect.width,
      y: coords.y / rect.height,
    };
  };

  const isTouch = (event: MouseEvent | TouchEvent): event is TouchEvent => {
    return "touches" in event;
  };

  return {
    getEventCoordinates,
    getRelativePosition,
    isTouch,
  };
}
```

### Step 3: Refactor Components

**Update each component to use the new composable:**

```vue
<!-- Before -->
<script setup lang="ts">
const handlePointerEvent = (event: MouseEvent | TouchEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect();
  const touch = (event as TouchEvent).touches?.[0];
  const clientX = touch ? touch.clientX : (event as MouseEvent).clientX;
  const clientY = touch ? touch.clientY : (event as MouseEvent).clientY;

  const x = clientX - rect.left;
  const y = clientY - rect.top;
  // ... rest of logic
};
</script>

<!-- After -->
<script setup lang="ts">
import { useEventPosition } from "@/composables/ui/useEventPosition";

const { getEventCoordinates } = useEventPosition();

const handlePointerEvent = (event: MouseEvent | TouchEvent) => {
  const coords = getEventCoordinates(event, canvasRef.value);
  if (!coords) return;

  const { x, y } = coords;
  // ... rest of logic
};
</script>
```

### Step 4: Add Future-Proofing Features

**Extend the composable with additional utilities:**

```typescript
// Add to useEventPosition composable
const detectFlick = (
  startPos: Point,
  endPos: Point,
  duration: number
): { velocity: number; direction: "horizontal" | "vertical" } | null => {
  const distance = Math.sqrt(
    Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
  );
  const velocity = distance / duration;

  if (velocity < 0.1) return null; // Too slow to be a flick

  const deltaX = Math.abs(endPos.x - startPos.x);
  const deltaY = Math.abs(endPos.y - startPos.y);

  return {
    velocity,
    direction: deltaX > deltaY ? "horizontal" : "vertical",
  };
};

const getMultiTouchCenter = (event: TouchEvent): Point | null => {
  if (event.touches.length < 2) return null;

  const touches = Array.from(event.touches);
  const sum = touches.reduce(
    (acc, touch) => ({
      x: acc.x + touch.clientX,
      y: acc.y + touch.clientY,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / touches.length,
    y: sum.y / touches.length,
  };
};
```

### Step 5: Create UI Directory

Create the `src/composables/ui/` directory structure:

```
src/composables/ui/
├── useEventPosition.ts
├── useThemeColors.ts (from color consolidation)
└── index.ts
```

Update `src/composables/ui/index.ts`:

```typescript
export { useEventPosition } from "./useEventPosition";
export { useThemeColors } from "./useThemeColors";
```

## ✅ Verification

1. **Functionality**: All three components behave identically regarding touch and mouse input
2. **Consistency**: Position calculations work the same across all components
3. **Touch Support**: Both mouse and touch interactions work correctly
4. **Performance**: No performance regression from centralized logic
5. **Type Safety**: `npm run type-check` passes
6. **Build**: `npm run build` succeeds

## 📦 Completion

This phase is complete when all event position logic is centralized in the composable, all components use the unified approach, and touch/mouse interactions work consistently across the application.
