# Medium Priority: Large File Breakdown

## 🎯 Goal

Break down large, monolithic files that violate the single responsibility principle into smaller, focused modules. This will improve maintainability, testability, and make the codebase easier to understand and navigate.

## 📋 Background

Several files in the codebase are excessively large and handle multiple responsibilities:

- `src/composables/palette/useRenderer.ts` (587 lines)
- `src/components/KeySelector.vue` (553 lines)
- Other large composables and components over 400 lines

## 🔧 Implementation Steps

### Step 1: Identify Large Files

Find files that are candidates for breakdown:

```bash
find src -name "*.ts" -o -name "*.vue" | xargs wc -l | sort -n | tail -20
```

**Prioritize by:**

- Files over 400 lines
- Frequently imported/used files
- Files handling multiple responsibilities
- Files that are difficult to understand

### Step 2: Break Down Palette Renderer

The `src/composables/palette/useRenderer.ts` file (587 lines) should be split:

**Analyze responsibilities:**

- Canvas rendering logic
- Shape drawing functions
- Visual effects rendering
- Shared utilities

**Create focused modules:**

```
src/composables/palette/
├── useCanvasRenderer.ts     # Canvas-specific rendering
├── useShapeRenderer.ts      # Shape drawing logic
├── useEffectRenderer.ts     # Visual effects rendering
├── useRenderingUtils.ts     # Shared utilities
└── useRenderer.ts          # Main composable (orchestrates others)
```

**Example breakdown:**

```typescript
// useCanvasRenderer.ts
export function useCanvasRenderer() {
  const setupCanvas = (canvas: HTMLCanvasElement) => {
    /* ... */
  };
  const clearCanvas = (context: CanvasRenderingContext2D) => {
    /* ... */
  };

  return { setupCanvas, clearCanvas };
}

// useShapeRenderer.ts
export function useShapeRenderer() {
  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) => {
    /* ... */
  };
  const drawPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    /* ... */
  };

  return { drawCircle, drawPath };
}

// useRenderer.ts (main orchestrator)
export function useRenderer() {
  const canvasRenderer = useCanvasRenderer();
  const shapeRenderer = useShapeRenderer();
  const effectRenderer = useEffectRenderer();

  return {
    ...canvasRenderer,
    ...shapeRenderer,
    ...effectRenderer,
  };
}
```

### Step 3: Break Down KeySelector Component

The `src/components/KeySelector.vue` file (553 lines) should be split:

**Extract sub-components:**

```
src/components/selector/
├── KeySelection.vue         # Key selection UI
├── ScaleSelection.vue       # Scale selection UI
├── ModeSelection.vue        # Mode selection UI
├── KeyPreview.vue          # Preview/display component
└── KeySelectorControls.vue  # Control buttons
```

**Main component orchestration:**

```vue
<!-- KeySelector.vue -->
<template>
  <div class="key-selector">
    <KeySelection v-model="selectedKey" />
    <ScaleSelection v-model="selectedScale" />
    <ModeSelection v-model="selectedMode" />
    <KeyPreview
      :key="selectedKey"
      :scale="selectedScale"
      :mode="selectedMode"
    />
    <KeySelectorControls @apply="applySelection" @cancel="cancelSelection" />
  </div>
</template>
```

### Step 4: Review Other Large Files

1. **Audit remaining files**: Check for other breakdown candidates
2. **Apply same principles**: Extract focused modules while maintaining compatibility
3. **Document changes**: Keep track of what was split and why

### Step 5: Maintain API Compatibility

**For all breakdowns:**

- Keep the main file as an orchestrator
- Export the same interface as before
- Ensure existing imports continue to work
- Test all functionality after splitting

## ✅ Verification

1. **Functionality**: All affected components work correctly
2. **API Compatibility**: Existing imports and usage patterns continue to work
3. **File Size**: Large files are successfully broken down into smaller modules
4. **Type Safety**: `npm run type-check` passes
5. **Build**: `npm run build` succeeds
6. **Performance**: No performance regression from file splits

## 📦 Completion

This phase is complete when large files are broken down into focused modules, all functionality is preserved, and the codebase is more maintainable and understandable.
