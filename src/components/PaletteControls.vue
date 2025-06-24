<template>
  <div class="bg-gray-800 h-5">
    <!-- Complete control grid including toggle -->
    <div class="grid grid-cols-5 h-full">
      <!-- Left Flick Area -->
      <div
        class="flex items-center justify-start pl-2 cursor-grab active:cursor-grabbing select-none bg-gray-700/50 hover:bg-gray-600/50 transition-colors duration-150"
        @wheel="handleWheel"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <!-- Left flick indicator -->
        <div class="text-white/60 text-xs">◀</div>
      </div>

      <!-- Central Drag Handle (spans 2 columns) -->
      <div
        class="col-span-2 flex items-center justify-center cursor-ns-resize select-none bg-gray-900 hover:bg-gray-800 transition-colors duration-150 border-x border-gray-600"
        @mousedown="handleResizeStart"
        @touchstart="handleResizeStart"
      >
        <!-- Enhanced drag handle (3 horizontal lines with better contrast) -->
        <div
          class="flex flex-col gap-1 opacity-80 hover:opacity-100 transition-opacity duration-150"
        >
          <div class="w-10 h-0.5 bg-white rounded-full shadow-sm"></div>
          <div class="w-10 h-0.5 bg-white rounded-full shadow-sm"></div>
          <div class="w-10 h-0.5 bg-white rounded-full shadow-sm"></div>
        </div>
      </div>

      <!-- Right Flick Area -->
      <div
        class="flex items-center justify-end pr-2 cursor-grab active:cursor-grabbing select-none bg-gray-700/50 hover:bg-gray-600/50 transition-colors duration-150"
        @wheel="handleWheel"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <!-- Right flick indicator -->
        <div class="text-white/60 text-xs">▶</div>
      </div>

      <!-- Toggle for last solfege note -->
      <div
        class="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors duration-150 bg-gray-800/50"
        @click="toggleLastSolfege"
      >
        <div class="text-white/60 hover:text-white/80 text-xs">
          {{ showLastSolfege ? "7" : "+" }}
        </div>
      </div>
    </div>

    <!-- Sustain Hooks Row (visible when notes are sustained) -->
    <div
      v-if="sustainedNotes.length > 0"
      class="absolute top-full left-0 right-0 h-2 bg-gray-900/80 border-t border-gray-600 flex items-center justify-center gap-2"
    >
      <div
        v-for="(note, index) in sustainedNotes"
        :key="`${note.solfegeIndex}_${note.octave}`"
        class="w-3 h-3 bg-yellow-400 rounded-full cursor-pointer hover:bg-yellow-300 transition-colors duration-150 relative"
        @click="releaseSustainedNote(index)"
      >
        <!-- Hook indicator -->
        <div
          class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0.5 h-1 bg-gray-400"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { triggerControlHaptic, triggerUIHaptic } from "@/utils/hapticFeedback";

// Sustained note interface
interface SustainedNote {
  solfegeIndex: number;
  octave: number;
  noteId: string;
}

// Props
interface Props {
  mainOctave: number;
  paletteHeight?: number;
  showLastSolfege?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showLastSolfege: false,
});

// Emits
interface Emits {
  (e: "update:mainOctave", value: number): void;
  (e: "update:paletteHeight", value: number): void;
  (e: "update:showLastSolfege", value: boolean): void;
  (e: "sustainNote", note: SustainedNote): void;
  (e: "releaseSustainedNote", noteId: string): void;
}

const emit = defineEmits<Emits>();

// Sustain system state
const sustainedNotes = ref<SustainedNote[]>([]);

// Toggle for last solfege note
const toggleLastSolfege = () => {
  emit("update:showLastSolfege", !props.showLastSolfege);
};

// Sustain system functions
const addSustainedNote = (note: SustainedNote) => {
  // Check if note is already sustained
  const existingIndex = sustainedNotes.value.findIndex(
    (n) => n.solfegeIndex === note.solfegeIndex && n.octave === note.octave
  );

  if (existingIndex === -1) {
    sustainedNotes.value.push(note);
    emit("sustainNote", note);
  }
};

const releaseSustainedNote = (index: number) => {
  const note = sustainedNotes.value[index];
  if (note) {
    sustainedNotes.value.splice(index, 1);
    emit("releaseSustainedNote", note.noteId);
  }
};

// Functions to change octave range
const increaseOctave = () => {
  if (props.mainOctave < 7) {
    triggerControlHaptic();
    emit("update:mainOctave", props.mainOctave + 1);
  }
};

const decreaseOctave = () => {
  if (props.mainOctave > 3) {
    triggerControlHaptic();
    emit("update:mainOctave", props.mainOctave - 1);
  }
};

// Flick interaction state
const isDragging = ref(false);
const startY = ref(0);
const startTime = ref(0);

// Touch/Mouse event handlers for flick interaction
const handleTouchStart = (e: TouchEvent) => {
  isDragging.value = true;
  startY.value = e.touches[0].clientY;
  startTime.value = Date.now();
};

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true;
  startY.value = e.clientY;
  startTime.value = Date.now();
  e.preventDefault();
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!isDragging.value) return;
  handleFlickEnd(e.changedTouches[0].clientY);
};

const handleMouseUp = (e: MouseEvent) => {
  if (!isDragging.value) return;
  handleFlickEnd(e.clientY);
};

const handleFlickEnd = (endY: number) => {
  const deltaY = startY.value - endY;
  const deltaTime = Date.now() - startTime.value;
  const velocity = Math.abs(deltaY) / deltaTime;

  // Flick threshold: minimum distance and velocity
  if (Math.abs(deltaY) > 30 && velocity > 0.3) {
    if (deltaY > 0) {
      // Flicked up - decrease octave (lower pitch)
      decreaseOctave();
    } else {
      // Flicked down - increase octave (higher pitch)
      increaseOctave();
    }
  }

  isDragging.value = false;
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    decreaseOctave();
  } else {
    increaseOctave();
  }
};

// Resize state
const isResizing = ref(false);
const resizeStartY = ref(0);
const resizeStartHeight = ref(0);

// Resize event handlers
const handleResizeStart = (e: MouseEvent | TouchEvent) => {
  e.preventDefault();
  e.stopPropagation();

  // Light haptic feedback when starting resize
  triggerUIHaptic();

  isResizing.value = true;
  resizeStartHeight.value = props.paletteHeight || 192;

  if (e instanceof MouseEvent) {
    resizeStartY.value = e.clientY;
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  } else {
    resizeStartY.value = e.touches[0].clientY;
    document.addEventListener("touchmove", handleResizeMove);
    document.addEventListener("touchend", handleResizeEnd);
  }
};

const handleResizeMove = (e: MouseEvent | TouchEvent) => {
  if (!isResizing.value) return;

  e.preventDefault();

  const currentY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
  const deltaY = resizeStartY.value - currentY; // Inverted: drag up = increase height
  const newHeight = resizeStartHeight.value + deltaY;

  // Clamp height between min and max (min 128px, max 400px for more rows)
  const clampedHeight = Math.max(128, Math.min(400, newHeight));
  emit("update:paletteHeight", clampedHeight);
};

const handleResizeEnd = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
  document.removeEventListener("touchmove", handleResizeMove);
  document.removeEventListener("touchend", handleResizeEnd);
};

// Cleanup on unmount
onUnmounted(() => {
  if (isResizing.value) {
    handleResizeEnd();
  }
});

// Expose functions for parent component
defineExpose({
  addSustainedNote,
  releaseSustainedNote,
  sustainedNotes,
});
</script>

<style scoped>
/* Component-specific styles */
div {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  touch-action: manipulation;
}

/* Resize handle styles */
.cursor-ns-resize {
  cursor: ns-resize;
}

.cursor-ns-resize:active {
  cursor: ns-resize;
}
</style>
