<template>
  <div class="keyboard-action-bar">
    <!-- Main controls row -->
    <div class="action-row">
      <!-- Octave controls -->
      <div class="control-group">
        <Knob
          :model-value="store.keyboardConfig.mainOctave"
          type="range"
          label="Octave"
          :min="1"
          :max="8"
          :step="1"
          @update:modelValue="store.setMainOctave"
        />
      </div>

      <!-- Row count controls -->
      <div class="control-group">
        <Knob
          :model-value="store.keyboardConfig.rowCount"
          type="range"
          label="Rows"
          :min="1"
          :max="8"
          :step="2"
          @update:modelValue="store.setRowCount"
        />
      </div>

      <!-- Key selector -->
      <div class="control-group">
        <Knob
          :model-value="musicStore.currentKey"
          type="options"
          :options="CHROMATIC_NOTES"
          label="Key"
          @update:modelValue="musicStore.setKey"
        />
      </div>

      <!-- Mode selector -->
      <div class="control-group">
        <Knob
          :model-value="musicStore.currentMode"
          type="options"
          :options="[
            {
              label: 'Major',
              value: 'major',
              color: 'hsl(0, 40%, 75%)', // warm white
            },
            {
              label: 'Minor',
              value: 'minor',
              color: 'hsl(240, 40%, 75%)', // cool white
            },
            // {
            //   label: 'Pentatonic',
            //   value: 'pentatonic',
            //   color: 'hsl(120, 100%, 95%)',
            // }, // light green
            // {
            //   label: 'Chromatic',
            //   value: 'chromatic',
            //   color: 'hsl(60, 100%, 95%)',
            // }, // light yellow
          ]"
          label="Mode"
          @update:modelValue="musicStore.setMode"
        />
      </div>

      <!-- Drawer toggle -->
      <div class="control-group">
        <Knob
          :model-value="store.drawer.isOpen"
          type="boolean"
          label="Drawer"
          @update:modelValue="
            (isOpen) => (isOpen ? store.openDrawer() : store.closeDrawer())
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useMusicStore } from "@/stores/music";
import { CHROMATIC_NOTES } from "@/data/musicData";
import { Knob } from "@/components/knobs";

// Store references
const store = useKeyboardDrawerStore();
const musicStore = useMusicStore();
</script>

<style scoped>
.keyboard-action-bar {
  background-color: rgba(0, 0, 0, 0.8); /* bg-black/80 */
  -webkit-backdrop-filter: blur(16px); /* backdrop-blur-lg */
  backdrop-filter: blur(16px);
  border-bottom-width: 1px; /* border-b */
  border-bottom-style: solid;
  border-bottom-color: rgba(255, 255, 255, 0.1); /* border-white/10 */
  padding-left: 1rem; /* px-4 */
  padding-right: 1rem; /* px-4 */
  padding-top: 0.5rem; /* py-2 */
  padding-bottom: 0.5rem; /* py-2 */
  user-select: none; /* select-none */

  /* Performance optimizations */
  contain: layout style;
  will-change: auto;
}

.action-row,
.secondary-row {
  display: flex; /* flex */
  align-items: center; /* items-center */
  justify-content: space-between; /* justify-between */
  gap: 0.5rem; /* gap-2 */
  min-height: 3rem; /* min-h-12 */
}

.secondary-row {
  margin-top: 0.5rem; /* mt-2 */
  padding-top: 0.5rem; /* pt-2 */
  border-top-width: 1px; /* border-t */
  border-top-style: solid;
  border-top-color: rgba(255, 255, 255, 0.1); /* border-white/10 */
  transition-property: all; /* transition-all */
  transition-duration: 300ms; /* duration-300 */
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); /* ease-in-out */
}

.control-group {
  flex: 1 1 0%; /* flex-1 */
  min-width: 0; /* min-w-0 */
  max-width: 5rem; /* max-w-20 */
}

.toggle-row {
  display: flex; /* flex */
  justify-content: center; /* justify-center */
  padding-top: 0.25rem; /* pt-1 */
}

.secondary-toggle {
  display: flex; /* flex */
  align-items: center; /* items-center */
  gap: 0.5rem; /* gap-2 */
  padding-left: 0.75rem; /* px-3 */
  padding-right: 0.75rem; /* px-3 */
  padding-top: 0.25rem; /* py-1 */
  padding-bottom: 0.25rem; /* py-1 */
  font-size: 0.75rem; /* text-xs */
  line-height: 1rem; /* text-xs default line-height */
  color: rgba(255, 255, 255, 0.7); /* text-white/70 */
  background-color: rgba(255, 255, 255, 0.05); /* bg-white/5 */
  border-radius: 9999px; /* rounded-full */
  border-width: 1px; /* border */
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.1); /* border-white/10 */
  transition-property: all; /* transition-all */
  transition-duration: 200ms; /* duration-200 */
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.secondary-toggle:hover {
  color: rgba(255, 255, 255, 0.9); /* hover:text-white/90 */
  background-color: rgba(255, 255, 255, 0.1); /* hover:bg-white/10 */
}

.secondary-toggle:focus {
  outline: none; /* focus:outline-none */
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.5); /* focus:ring-2 focus:ring-blue-400/50 */
}

.toggle-icon {
  transition-property: transform; /* transition-transform */
  transition-duration: 300ms; /* duration-300 */
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.8rem;
}

.toggle-text {
  font-size: 0.75rem; /* text-xs */
  line-height: 1rem; /* text-xs default line-height */
  font-weight: 500; /* font-medium */
  min-width: 2rem; /* min-w-8 */
  text-align: center; /* text-center */
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .keyboard-action-bar {
    padding-left: 0.5rem; /* px-2 */
    padding-right: 0.5rem; /* px-2 */
    padding-top: 0.25rem; /* py-1 */
    padding-bottom: 0.25rem; /* py-1 */
  }

  .action-row,
  .secondary-row {
    gap: 0.25rem; /* gap-1 */
    min-height: 2.5rem; /* min-h-10 */
  }

  .control-group {
    max-width: 4rem; /* max-w-16 */
  }

  .secondary-toggle {
    padding-left: 0.5rem; /* px-2 */
    padding-right: 0.5rem; /* px-2 */
    font-size: 0.6875rem; /* replacement for text-2xs (non-standard) */
    line-height: 1rem;
  }
}

/* Compact mode for very small screens */
@media (max-width: 360px) {
  .control-group {
    max-width: 3.5rem; /* max-w-14 */
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  .keyboard-action-bar {
    border-bottom-color: rgba(255, 255, 255, 0.3); /* border-white/30 */
  }

  .secondary-row {
    border-top-color: rgba(255, 255, 255, 0.3); /* border-white/30 */
  }

  .secondary-toggle {
    border-color: rgba(255, 255, 255, 0.3); /* border-white/30 */
    background-color: rgba(255, 255, 255, 0.1); /* bg-white/10 */
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .secondary-row,
  .toggle-icon,
  .secondary-toggle {
    transition: none; /* transition-none */
  }
}
</style>
