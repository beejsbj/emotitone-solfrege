# Mobile-First Tooltip System

This project includes a powerful, mobile-first tooltip system designed specifically for touch interactions with beautiful animations and finger tracking capabilities.

## Features

- ✨ **Beautiful animations** using GSAP with spring-like easing
- 📱 **Mobile-first design** with touch events (touchstart, touchmove, touchend)
- 🤏 **Long press detection** for showing tooltips on touch and hold
- 🎯 **Touch tracking** tooltip that follows your finger movement
- 🎨 **Gorgeous styling** with gradient accents and smooth rotations
- 🚀 **Performance optimized** with proper cleanup and event management
- 🎛️ **Perfect for knobs** and other touch-based controls

## Basic Usage

### v-tooltip-press

Long press tooltip (touch and hold for 300ms):

```vue
<template>
  <button v-tooltip-press="'Hold me down to see tooltip! 📱'">
    Long Press Me
  </button>
</template>
```

### v-tooltip-drag

Tooltip that follows your finger during touch and drag:

```vue
<template>
  <div v-tooltip-drag="'I follow your finger! ✨'">Touch & Drag Me</div>
</template>
```

## Advanced Usage

### Custom Long Press Duration

```vue
<template>
  <button
    v-tooltip-press="{
      content: 'Custom delay tooltip',
      longPressDuration: 1000,
    }"
  >
    Touch & Hold (1 second)
  </button>
</template>
```

### Perfect for Knob Controls

```vue
<template>
  <div
    v-tooltip-drag="`Value: ${knobValue}% - Drag to adjust`"
    @touchmove="handleKnobDrag"
    class="knob-control"
  >
    {{ knobValue }}
  </div>
</template>

<script setup>
import { ref } from "vue";

const knobValue = ref(50);

const handleKnobDrag = (event) => {
  // Your knob rotation logic here
  // Tooltip will automatically follow the touch
};
</script>
```

### Dynamic Content

```vue
<template>
  <div
    v-for="item in items"
    :key="item.id"
    v-tooltip-drag="item.description"
    class="touch-element"
  >
    {{ item.name }}
  </div>
</template>

<script setup>
const items = [
  { id: 1, name: "🎵", description: "Music note - Touch and drag!" },
  { id: 2, name: "🎹", description: "Piano - Feel the keys!" },
];
</script>
```

## Available Directives

- **`v-tooltip-press`** - Shows tooltip after long press (300ms default)
- **`v-tooltip-drag`** - Shows tooltip immediately on touch and follows finger
- **`v-tooltip`** - Alias for `v-tooltip-press` (backward compatibility)
- **`v-tooltip-track`** - Alias for `v-tooltip-drag` (backward compatibility)

## Options

```typescript
interface TooltipOptions {
  content: string; // Tooltip text content
  longPressDuration?: number; // Long press duration in ms (default: 300)
  showOnDrag?: boolean; // Auto-set by directive type
  offset?: { x: number; y: number }; // Position offset
  className?: string; // Additional CSS class
}
```

## Touch Interaction Patterns

### Long Press Pattern

1. User touches element
2. Timer starts (300ms default)
3. If finger stays down, tooltip appears
4. Moving finger updates tooltip position
5. Lifting finger hides tooltip

### Drag Pattern

1. User touches element
2. Tooltip appears immediately
3. Dragging finger updates tooltip position with smooth rotation/translation
4. Lifting finger hides tooltip

## Styling

The tooltips feature beautiful mobile-optimized styling:

- Black background with proper touch target sizing
- White text with bold, readable typography
- Emerald and sky blue gradient accents
- Smooth GSAP animations optimized for 60fps
- Subtle rotation and translation effects that follow touch
- Proper z-index management for mobile interfaces

## Performance Notes

- Touch events use `{ passive: false }` to allow preventDefault for scroll prevention
- Tooltips are globally managed with a single renderer
- Event listeners are properly cleaned up on component unmount
- GSAP animations are optimized for mobile performance
- Only one tooltip can be visible at a time

## Mobile Considerations

- Designed specifically for touch interfaces
- Prevents page scrolling during tooltip interactions
- Optimized touch target sizes
- Smooth animations that don't interfere with touch feedback
- Works perfectly with haptic feedback systems

## Example Component

Check out `src/components/TooltipExample.vue` for a complete demonstration of all mobile tooltip features, including a working knob simulation!

## Integration

The tooltip system is automatically available in all components once installed. No additional imports needed - just use the directives directly in your mobile-first Vue components!
