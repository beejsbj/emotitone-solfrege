<template>
  <div
    ref="containerRef"
    class="live-strip-container"
    :class="{ 'is-visible': isVisible }"
  >
    <!-- Horizontal scroll container -->
    <div
      ref="scrollContainerRef"
      class="live-strip-scroll"
      @scroll="handleScroll"
    >
      <!-- Show placeholder if no patterns -->
      <div v-if="patterns.length === 0" class="pattern-strip placeholder">
        <div class="strip-header">
          <span class="pattern-name">No patterns</span>
        </div>
        <div class="strip-body">
          <span class="notation-text">Play some notes to see patterns...</span>
        </div>
      </div>

      <!-- Display each pattern as horizontal strip -->
      <div
        v-for="(pattern, index) in patterns"
        :key="`pattern-${pattern.id}`"
        :ref="(el) => setSegmentRef(el, index)"
        class="pattern-strip"
        :class="{
          'is-default': pattern.isDefault,
          'is-saved': pattern.isSaved && !pattern.isDefault,
          'is-current': isCurrentPattern(pattern),
        }"
      >
        <!-- Compact pattern header with metadata and actions -->
        <div class="strip-header">
          <div class="pattern-info">
            <span class="pattern-name">{{ getPatternName(pattern) }}</span>
            <div class="pattern-meta">
              <span v-if="pattern.isDefault" class="meta-badge meta-default">
                default
              </span>
              <span v-else-if="pattern.isSaved" class="meta-badge meta-saved">
                saved
              </span>
              <span
                v-else-if="isCurrentPattern(pattern)"
                class="meta-badge meta-current"
              >
                current
              </span>
              <span class="meta-info">
                {{ pattern.key || "C" }} {{ pattern.mode || "major" }}
              </span>
              <span class="meta-info">
                {{ pattern.noteCount || pattern.notes?.length || 0 }} notes
              </span>
            </div>
          </div>

          <div class="strip-actions">
            <!-- Backspace button for current pattern -->
            <button
              v-if="isCurrentPattern(pattern) && canBackspace"
              class="action-btn backspace-btn"
              @click="handleBackspace"
              title="Remove last note"
              :disabled="!canBackspace"
            >
              ⌫
            </button>

            <!-- Copy button -->
            <button
              class="action-btn copy-btn"
              @click="copyPattern(pattern)"
              title="Copy notation"
            >
              Copy
            </button>

            <!-- Strudel button -->
            <button
              class="action-btn strudel-btn"
              @click="openInStrudel(pattern)"
              title="Play in Strudel.cc"
            >
              🎵 Strudel
            </button>

            <!-- Save button for unsaved patterns -->
            <button
              v-if="!pattern.isSaved && !pattern.isDefault"
              class="action-btn save-btn"
              @click="savePattern(pattern)"
              title="Save pattern"
            >
              Save
            </button>
          </div>
        </div>

        <!-- Horizontal notation display -->
        <div class="strip-body">
          <div class="notation-display">
            <NotationRenderer
              :pattern="pattern"
              :show-colors="true"
              class="notation-content"
            />
          </div>
        </div>
      </div>

      <!-- End marker for scroll detection -->
      <div ref="endMarkerRef" class="end-marker"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { usePatternsStore } from "@/stores/patterns";
import { usePatternRecording } from "@/composables/usePatternRecording";
import { patternToBracketNotation } from "@/utils/bracketNotation";
import type { Pattern } from "@/types/patterns";
import NotationRenderer from "./NotationRenderer.vue";

// Props
interface Props {
  showMetadata?: boolean;
  showControls?: boolean;
  isVisible?: boolean;
  maxPatterns?: number;
  autoScroll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showMetadata: true,
  showControls: true,
  isVisible: true,
  maxPatterns: 50, // Reasonable limit for performance
  autoScroll: true,
});

// Stores and composables
const patternsStore = usePatternsStore();
const { patterns: storePatterns, currentPattern } = storeToRefs(patternsStore);
const patternRecording = usePatternRecording();

// Refs
const containerRef = ref<HTMLElement>();
const scrollContainerRef = ref<HTMLElement>();
const endMarkerRef = ref<HTMLElement>();
const segmentRefs = ref<Map<number, HTMLElement>>(new Map());

// State for smart auto-scroll
const lastKnownPatternId = ref<string | null>(null);
const lastKnownNoteCount = ref<number>(0);
const isAutoScrolling = ref(false);

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

// Get patterns from store with optional limiting
const patterns = computed(() => {
  const all = storePatterns.value || [];

  // Apply pattern limit if specified
  if (props.maxPatterns && all.length > props.maxPatterns) {
    // Keep default patterns and most recent user patterns
    const defaultPatterns = all.filter((p) => p.isDefault);
    const userPatterns = all.filter((p) => !p.isDefault);
    const recentUserPatterns = userPatterns.slice(
      -(props.maxPatterns - defaultPatterns.length)
    );
    return [...defaultPatterns, ...recentUserPatterns];
  }

  return all;
});

// Check if backspace is available
const canBackspace = computed(() => {
  const current = currentPattern.value;
  return current && current.notes && current.notes.length > 0;
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get display name for a pattern
 */
function getPatternName(pattern: Pattern): string {
  if (pattern.name) return pattern.name;

  const type = pattern.patternType || "pattern";
  const count = pattern.noteCount || pattern.notes?.length || 0;

  if (pattern.isDefault) {
    return pattern.name || `${type}`;
  }

  return `${type} · ${count} notes`;
}

/**
 * Check if a pattern is the current pattern being built
 */
function isCurrentPattern(pattern: Pattern): boolean {
  return (
    !pattern.isDefault &&
    !pattern.isSaved &&
    pattern.id === currentPattern.value?.id
  );
}

/**
 * Set segment ref for animation targeting
 */
function setSegmentRef(el: any, index: number) {
  if (el) {
    segmentRefs.value.set(index, el as HTMLElement);
  } else {
    segmentRefs.value.delete(index);
  }
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Handle backspace action - remove last note
 */
function handleBackspace() {
  if (!canBackspace.value) return;

  const success = patternRecording.removeLastNote();
  if (success) {
    if (import.meta.env.DEV) {
      console.log("🎵 LiveStrip: Removed last note from current pattern");
    }
  }
}

/**
 * Copy pattern notation to clipboard
 */
async function copyPattern(pattern: Pattern) {
  try {
    const result = patternToBracketNotation(pattern, {
      isChromatic: false,
      includeVelocity: false,
    });

    const textToCopy = result.notation;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    if (import.meta.env.DEV) {
      console.log(`📋 LiveStrip: Copied pattern notation: ${textToCopy}`);
    }
  } catch (error) {
    console.error("❌ LiveStrip: Failed to copy pattern:", error);
  }
}

/**
 * Open pattern in Strudel.cc for live coding
 */
function openInStrudel(pattern: Pattern) {
  try {
    const result = patternToBracketNotation(pattern, {
      isChromatic: false,
      includeVelocity: false,
    });

    const content = result.notation;

    // Encode the content as base64 for the URL
    const encodedContent = btoa(content);
    const strudelUrl = `https://strudel.cc/#${encodedContent}`;

    // Open in new tab
    window.open(strudelUrl, "_blank");

    if (import.meta.env.DEV) {
      console.log(`🎵 LiveStrip: Opened pattern in Strudel: ${content}`);
    }
  } catch (error) {
    console.error("❌ LiveStrip: Failed to open pattern in Strudel:", error);
  }
}

/**
 * Save a pattern
 */
function savePattern(pattern: Pattern) {
  const success = patternsStore.savePattern(pattern.id);
  if (success) {
    if (import.meta.env.DEV) {
      console.log(`💾 LiveStrip: Pattern saved: ${pattern.id}`);
    }
  }
}

/**
 * Handle scroll events
 */
function handleScroll() {
  if (!scrollContainerRef.value || isAutoScrolling.value) return;
  // Could add scroll indicators here if needed
}

/**
 * Smart auto-scroll to current pattern - only when needed
 */
function smartScrollToEnd() {
  if (!scrollContainerRef.value || !props.autoScroll) return;

  const container = scrollContainerRef.value;
  const atEnd =
    container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;

  if (import.meta.env.DEV) {
    console.log(
      `🔄 LiveStrip: Smart scroll check - atEnd: ${atEnd}, scrollLeft: ${container.scrollLeft}, clientWidth: ${container.clientWidth}, scrollWidth: ${container.scrollWidth}`
    );
  }

  // Only scroll if we're at the end or if it's a new pattern
  const currentId = currentPattern.value?.id;
  const isNewPattern = currentId !== lastKnownPatternId.value;

  if (atEnd || isNewPattern) {
    if (import.meta.env.DEV) {
      console.log(
        `🔄 LiveStrip: Auto-scrolling to current pattern (atEnd: ${atEnd}, newPattern: ${isNewPattern})`
      );
    }

    isAutoScrolling.value = true;

    // Find the current pattern element and scroll to it
    if (currentPattern.value) {
      const currentPatternIndex = patterns.value.findIndex(
        (p) => p.id === currentId
      );
      if (currentPatternIndex >= 0) {
        const currentElement = segmentRefs.value.get(currentPatternIndex);
        if (currentElement) {
          // Scroll to the current pattern element
          currentElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "end",
          });
        } else {
          // Fallback: scroll to right end
          container.scrollTo({
            left: container.scrollWidth,
            behavior: "smooth",
          });
        }
      } else {
        // Fallback: scroll to right end
        container.scrollTo({
          left: container.scrollWidth,
          behavior: "smooth",
        });
      }
    } else {
      // No current pattern, scroll to end
      container.scrollTo({
        left: container.scrollWidth,
        behavior: "smooth",
      });
    }

    // Reset flag after animation
    setTimeout(() => {
      isAutoScrolling.value = false;
    }, 500);
  } else {
    if (import.meta.env.DEV) {
      console.log(`🔄 LiveStrip: Skipping auto-scroll (user not at end)`);
    }
  }
}

// ============================================================================
// WATCHERS
// ============================================================================

// Watch for pattern changes with smart auto-scroll
watch(
  () => patterns.value.length,
  async (newLength, oldLength) => {
    if (import.meta.env.DEV) {
      console.log(
        "🎵 LiveStrip: Patterns changed:",
        oldLength,
        "->",
        newLength
      );
    }

    if (newLength > oldLength) {
      await nextTick();
      // Auto-scroll to show new content
      if (props.autoScroll) {
        smartScrollToEnd();
      }
    }
  }
);

// Watch for current pattern changes with smart auto-scroll
watch(
  () => currentPattern.value,
  (newPattern, oldPattern) => {
    const newId = newPattern?.id || null;
    const oldId = oldPattern?.id || null;
    const newNoteCount =
      newPattern?.noteCount || newPattern?.notes?.length || 0;

    // DEV-only logging
    if (import.meta.env.DEV) {
      if (newId !== oldId) {
        console.log(`🎵 LiveStrip: Pattern ID changed: ${oldId} → ${newId}`);
      }
      if (newNoteCount !== lastKnownNoteCount.value) {
        console.log(
          `🎵 LiveStrip: Note count changed: ${lastKnownNoteCount.value} → ${newNoteCount}`
        );
      }
    }

    // Update tracking variables
    const patternChanged = newId !== lastKnownPatternId.value;
    const noteCountChanged = newNoteCount !== lastKnownNoteCount.value;

    if (patternChanged || noteCountChanged) {
      lastKnownPatternId.value = newId;
      lastKnownNoteCount.value = newNoteCount;

      // Smart auto-scroll after DOM update
      nextTick(() => {
        smartScrollToEnd();
      });
    }
  },
  { immediate: true }
);

// Watch for visibility changes with minimal animation
watch(
  () => props.isVisible,
  (visible) => {
    if (visible && containerRef.value) {
      // Minimal fade-in animation
      containerRef.value.style.opacity = "1";
      containerRef.value.style.transform = "translateY(0)";
    }
  }
);

// ============================================================================
// LIFECYCLE
// ============================================================================

onMounted(async () => {
  if (import.meta.env.DEV) {
    console.log("🎵 LiveStrip: Mounting horizontal strip...");
  }

  // Ensure patterns store is initialized
  if (!patternsStore.isInitialized) {
    if (import.meta.env.DEV) {
      console.log("🎵 LiveStrip: Initializing patterns store...");
    }
    await patternsStore.initialize();
  }

  // Initial setup with minimal animation
  if (containerRef.value) {
    containerRef.value.style.opacity = props.isVisible ? "1" : "0";
    containerRef.value.style.transform = props.isVisible
      ? "translateY(0)"
      : "translateY(-10px)";
    containerRef.value.style.transition =
      "opacity 0.3s ease, transform 0.3s ease";
  }

  // Initialize tracking variables
  if (currentPattern.value) {
    lastKnownPatternId.value = currentPattern.value.id;
    lastKnownNoteCount.value =
      currentPattern.value.noteCount || currentPattern.value.notes?.length || 0;

    // Initial scroll to end if there's content
    nextTick(() => {
      smartScrollToEnd();
    });
  }

  if (import.meta.env.DEV) {
    console.log("🎵 LiveStrip: Horizontal strip mounted successfully");
  }
});

onUnmounted(() => {
  if (import.meta.env.DEV) {
    console.log("🎵 LiveStrip: Unmounting horizontal strip");
  }
});
</script>

<style scoped>
.live-strip-container {
  position: relative;
  width: 100%;
  height: auto;
  max-height: 120px; /* Reduced height for horizontal layout */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid hsla(0, 0%, 100%, 0.1);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
  contain: layout style paint;
  will-change: opacity, transform;
  z-index: 100;
}

.live-strip-scroll {
  display: block;
  max-height: inherit;
  overflow-x: auto; /* Horizontal scroll */
  overflow-y: hidden; /* No vertical scroll */
  scroll-behavior: smooth;
  scroll-snap-align: center;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 0.75rem;
  white-space: nowrap; /* Prevent wrapping */

  /* Hide scrollbar but maintain functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.live-strip-scroll::-webkit-scrollbar {
  display: none;
}

.pattern-strip {
  display: inline-block; /* Horizontal layout */
  vertical-align: top;
  min-width: 300px; /* Fixed minimum width for each pattern */
  max-width: 500px; /* Maximum width to prevent too wide strips */
  margin-right: 0.5rem; /* Space between patterns */
  background: hsla(0, 0%, 100%, 0.05);
  border: 1px solid hsla(0, 0%, 100%, 0.1);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  contain: layout style;
  overflow: hidden;
  white-space: normal; /* Allow wrapping within the strip */
}

.pattern-strip:hover {
  background: hsla(0, 0%, 100%, 0.08);
  border-color: hsla(0, 0%, 100%, 0.2);
}

/* Pattern type styling */
.pattern-strip.is-default {
  background: hsla(280, 50%, 30%, 0.15);
  border-color: hsla(280, 50%, 50%, 0.3);
}

.pattern-strip.is-saved {
  background: hsla(120, 50%, 30%, 0.15);
  border-color: hsla(120, 50%, 50%, 0.3);
}

.pattern-strip.is-current {
  background: hsla(200, 70%, 50%, 0.15);
  border-color: hsla(200, 70%, 50%, 0.4);
}

.pattern-strip.placeholder {
  opacity: 0.6;
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

.strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem 0.25rem;
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.08);
}

.pattern-info {
  flex: 1;
  min-width: 0;
}

.pattern-name {
  font-size: 0.75rem; /* Smaller for compact header */
  font-weight: 600;
  color: hsla(0, 0%, 100%, 0.9);
  display: block;
  margin-bottom: 0.125rem;
}

.pattern-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.meta-badge {
  padding: 0.0625rem 0.25rem; /* Smaller badges */
  border-radius: 0.25rem;
  font-size: 0.5625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-default {
  background: hsla(280, 50%, 50%, 0.3);
  color: hsla(280, 50%, 90%, 1);
}

.meta-saved {
  background: hsla(120, 50%, 50%, 0.3);
  color: hsla(120, 50%, 90%, 1);
}

.meta-current {
  background: hsla(200, 70%, 50%, 0.3);
  color: hsla(200, 70%, 90%, 1);
}

.meta-info {
  font-size: 0.625rem; /* Smaller meta info */
  color: hsla(0, 0%, 100%, 0.6);
}

.strip-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem; /* Tighter spacing */
}

.action-btn {
  appearance: none;
  background: hsla(0, 0%, 100%, 0.08);
  border: 1px solid hsla(0, 0%, 100%, 0.15);
  color: hsla(0, 0%, 100%, 0.8);
  font-size: 0.625rem; /* Smaller buttons */
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.action-btn:hover:not(:disabled) {
  background: hsla(0, 0%, 100%, 0.12);
  border-color: hsla(0, 0%, 100%, 0.25);
  color: hsla(0, 0%, 100%, 0.95);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.backspace-btn {
  background: hsla(0, 70%, 50%, 0.2);
  border-color: hsla(0, 70%, 50%, 0.3);
  color: hsla(0, 70%, 90%, 1);
  font-size: 0.75rem;
  padding: 0.1875rem 0.375rem;
}

.backspace-btn:hover:not(:disabled) {
  background: hsla(0, 70%, 50%, 0.3);
  border-color: hsla(0, 70%, 50%, 0.4);
}

.save-btn {
  background: hsla(120, 50%, 50%, 0.2);
  border-color: hsla(120, 50%, 50%, 0.3);
  color: hsla(120, 50%, 90%, 1);
}

.save-btn:hover {
  background: hsla(120, 50%, 50%, 0.3);
  border-color: hsla(120, 50%, 50%, 0.4);
}

.strudel-btn {
  background: hsla(280, 60%, 50%, 0.2);
  border-color: hsla(280, 60%, 50%, 0.3);
  color: hsla(280, 60%, 90%, 1);
  font-size: 0.625rem;
}

.strudel-btn:hover {
  background: hsla(280, 60%, 50%, 0.3);
  border-color: hsla(280, 60%, 50%, 0.4);
}

.strip-body {
  background: hsla(0, 0%, 0%, 0.3);
  padding: 0.5rem 0.75rem;
}

.notation-display {
  width: 100%;
  overflow-x: visible; /* Allow horizontal expansion */
  white-space: nowrap; /* Keep notation in single line */
}

.notation-content {
  font-family: "Fira Code", "Monaco", "Courier New", monospace;
  font-size: 0.875rem;
  color: hsla(0, 0%, 100%, 0.9);
  letter-spacing: 0.05em;
  display: inline-block; /* Allow horizontal growth */
}

.notation-text {
  font-family: "Fira Code", "Monaco", "Courier New", monospace;
  font-size: 0.875rem;
  color: hsla(0, 0%, 100%, 0.7);
  letter-spacing: 0.05em;
}

.end-marker {
  display: inline-block;
  width: 1px;
  height: 1px;
  opacity: 0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .live-strip-scroll {
    scroll-behavior: auto !important;
  }

  .pattern-strip {
    transition: none !important;
  }

  .action-btn {
    transition: none !important;
  }

  .live-strip-container {
    transition: none !important;
  }
}

/* Print styles */
@media print {
  .live-strip-container {
    display: none;
  }
}
</style>
