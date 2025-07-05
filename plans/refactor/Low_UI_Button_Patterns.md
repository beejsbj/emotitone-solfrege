# Low Priority: UI Button Pattern Extraction

## 🎯 Goal

Create a standardized, theme-aware `SequencerButton.vue` component to eliminate repeated button markup and styling logic in the sequencer controls. This will improve UI consistency and reduce maintenance overhead.

## 📋 Background

Buttons within the sequencer controls share common styling for theming, hover states, and layout, but are implemented as duplicated markup and classes. This makes UI changes inconsistent and inefficient.

## 🔧 Implementation Steps

### Step 1: Analyze Current Button Patterns

**Files with similar button patterns:**

- `src/components/sequencer/controls/SequencerHeader.vue`
- `src/components/sequencer/controls/SequencerPlayback.vue`

**Common patterns to extract:**

- Base styling (padding, transitions, font styles, border-radius)
- Theming (background, text, border colors)
- State management (active, disabled, pressed states)
- Icon and text content handling

### Step 2: Create SequencerButton Component

Create `src/components/ui/SequencerButton.vue`:

```vue
<script setup lang="ts">
import type { Component } from "vue";

interface Props {
  variant?: "action" | "playback" | "toggle";
  state?: "default" | "active" | "pressed" | "disabled";
  themeColor?: string;
  icon?: Component;
  size?: "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "action",
  state: "default",
  themeColor: "hsl(0, 0%, 50%)",
  size: "md",
});

const buttonClasses = computed(() => {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg";

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variants = {
    action: "border border-opacity-30",
    playback: "bg-opacity-20 hover:bg-opacity-30",
    toggle: "border-2 border-opacity-50",
  };

  const states = {
    default: "hover:scale-105 active:scale-95",
    active: "scale-105 brightness-125",
    pressed: "scale-95 brightness-90",
    disabled: "opacity-50 cursor-not-allowed",
  };

  return [
    base,
    sizes[props.size],
    variants[props.variant],
    states[props.state],
  ].join(" ");
});

const buttonStyle = computed(() => {
  const color = props.themeColor;

  return {
    "--btn-color": color,
    "--btn-bg": color.replace(")", ", 0.1)"),
    "--btn-border": color.replace(")", ", 0.3)"),
    "--btn-text": color,
    backgroundColor: "var(--btn-bg)",
    borderColor: "var(--btn-border)",
    color: "var(--btn-text)",
  };
});
</script>

<template>
  <button
    :class="buttonClasses"
    :style="buttonStyle"
    :disabled="state === 'disabled'"
  >
    <component
      v-if="icon"
      :is="icon"
      class="w-5 h-5"
      :class="{ 'mr-2': $slots.default }"
    />
    <span v-if="$slots.default">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.inline-flex:hover:not(:disabled) {
  background-color: var(--btn-bg);
  border-color: var(--btn-border);
}
</style>
```

### Step 3: Refactor Sequencer Controls

**Update SequencerHeader.vue:**

```vue
<script setup lang="ts">
import { SequencerButton } from "@/components/ui";
import { CloseIcon, DuplicateIcon } from "@/components/icons";

// ... existing code
</script>

<template>
  <div class="sequencer-header">
    <!-- Before -->
    <button class="close-btn" @click="closeSequencer">
      <CloseIcon />
      Close
    </button>

    <!-- After -->
    <SequencerButton
      :icon="CloseIcon"
      :theme-color="themeColor"
      @click="closeSequencer"
    >
      Close
    </SequencerButton>

    <SequencerButton
      :icon="DuplicateIcon"
      :theme-color="themeColor"
      variant="action"
      @click="duplicateSequencer"
    >
      Duplicate
    </SequencerButton>
  </div>
</template>
```

**Update SequencerPlayback.vue:**

```vue
<script setup lang="ts">
import { SequencerButton } from "@/components/ui";
import { PlayIcon, PauseIcon, StopIcon } from "@/components/icons";

// ... existing code
</script>

<template>
  <div class="playback-controls">
    <SequencerButton
      :icon="isPlaying ? PauseIcon : PlayIcon"
      :theme-color="themeColor"
      variant="playback"
      :state="isPlaying ? 'active' : 'default'"
      @click="togglePlayback"
    >
      {{ isPlaying ? "Pause" : "Play" }}
    </SequencerButton>

    <SequencerButton
      :icon="StopIcon"
      :theme-color="themeColor"
      variant="playback"
      :state="isPlaying ? 'default' : 'disabled'"
      @click="stopPlayback"
    >
      Stop
    </SequencerButton>
  </div>
</template>
```

### Step 4: Update UI Components Index

Update `src/components/ui/index.ts`:

```typescript
export { default as SequencerButton } from "./SequencerButton.vue";
export { default as Tabs } from "./Tabs.vue";
export { default as TabsContent } from "./TabsContent.vue";
export { default as TabsList } from "./TabsList.vue";
export { default as TabsTrigger } from "./TabsTrigger.vue";
```

### Step 5: Add Icon Components

Create basic icon components if they don't exist:

```vue
<!-- src/components/icons/PlayIcon.vue -->
<template>
  <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
    <path d="M8 5v14l11-7z" />
  </svg>
</template>

<!-- src/components/icons/PauseIcon.vue -->
<template>
  <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
</template>
```

## ✅ Verification

1. **Visual Consistency**: All sequencer buttons have consistent styling
2. **Functionality**: All button interactions work as before
3. **Theming**: Buttons correctly apply theme colors
4. **States**: Active, disabled, and pressed states work correctly
5. **Responsiveness**: Buttons work well on different screen sizes
6. **Accessibility**: Buttons are properly accessible with keyboard navigation

## 📦 Completion

This phase is complete when the `SequencerButton` component is implemented, the sequencer controls are refactored to use it, and the UI maintains identical look and feel with improved consistency and maintainability.
