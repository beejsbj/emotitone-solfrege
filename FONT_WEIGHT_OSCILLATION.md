# Font Weight Oscillation System

## Overview

The font weight oscillation system has been simplified from a complex Vue composable to a simple CSS class-based approach. Now you can add oscillating font weight to any element by simply adding a CSS class.

## How to Use

### 1. Add CSS Classes

Simply add one of these classes to any HTML element:

- `.font-weight-oscillate-sm` - Small oscillation (amplitude: 50, base weight: 400)
- `.font-bold` - Medium oscillation (amplitude: 100, base weight: 500)
- `.font-weight-oscillate-lg` - Large oscillation (amplitude: 150, base weight: 600)
- `.font-weight-oscillate-full` - Full oscillation (amplitude: 400, base weight: 500) - Goes from 100-900!

### 2. Examples

```html
<!-- Header with full oscillation (100-900) -->
<h1 class="font-weight-oscillate-full">Emotitone</h1>

<!-- Header with large oscillation -->
<h2 class="font-weight-oscillate-lg">Section Title</h2>

<!-- Subtitle with small oscillation -->
<p class="font-weight-oscillate-sm">Feel the Music Theory</p>

<!-- Button text with medium oscillation -->
<button class="font-bold">Do</button>
```

### 3. How It Works

1. The system automatically initializes when the app starts
2. It watches for changes in the music store's `currentNote` property
3. When a note is playing, all elements with oscillation classes will have their font weight animated
4. When no note is playing, elements return to their default weights
5. The oscillation frequency and amplitude are based on the musical note's frequency

## Migration from Old System

### Before (Complex)

```vue
<script setup>
import {
  useOscillatingFontWeight,
  createFontWeightElement,
} from "@/composables";

const titleElement = createFontWeightElement("header");
useOscillatingFontWeight([titleElement]);
const oscillatingTitleWeight = computed(() => titleElement.weight.value);
</script>

<template>
  <h1 :style="{ fontWeight: oscillatingTitleWeight }">Title</h1>
</template>
```

### After (Simple)

```vue
<template>
  <h1 class="font-weight-oscillate-lg">Title</h1>
</template>
```

## Configuration

The oscillation configurations are defined in `src/composables/useOscillatingFontWeight.ts`:

```typescript
const OSCILLATION_CONFIGS = {
  sm: { amplitude: 50, baseWeight: 400 },
  md: { amplitude: 100, baseWeight: 500 },
  lg: { amplitude: 150, baseWeight: 600 },
  full: { amplitude: 400, baseWeight: 500 }, // Oscillates from 100-900
};
```

## CSS Classes

The CSS classes are defined in `src/style.css`:

```css
.font-weight-oscillate-sm {
  font-weight: 400; /* Default weight for small oscillation */
}

.font-bold {
  font-weight: 500; /* Default weight for medium oscillation */
}

.font-weight-oscillate-lg {
  font-weight: 600; /* Default weight for large oscillation */
}

.font-weight-oscillate-full {
  font-weight: 500; /* Default weight for full oscillation (100-900) */
}
```

## Benefits

1. **Simplicity**: No need to import composables or manage reactive state
2. **Performance**: Direct DOM manipulation instead of Vue reactivity overhead
3. **Flexibility**: Can be applied to any element with just a CSS class
4. **Maintainability**: Much less code to maintain
5. **Reusability**: Works across all components without setup

## Technical Details

- Uses `requestAnimationFrame` for smooth animations
- Automatically starts/stops based on music store state
- Clamps font weight values between 100-900 for full range support
- Uses the same visual frequency mapping as the original system
