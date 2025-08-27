<template>
  <div
    ref="containerRef"
    class="live-strip-container"
    :class="{ 'is-visible': isVisible }"
  >
    <!-- Scroll container -->
    <div
      ref="scrollContainerRef"
      class="live-strip-scroll"
      @scroll="handleScroll"
    >
      <!-- Pattern segments -->
      <TransitionGroup
        name="pattern-segment"
        tag="div"
        class="live-strip-content"
      >
        <!-- Show placeholder if no patterns -->
        <div
          v-if="patterns.length === 0"
          key="placeholder"
          class="pattern-card placeholder"
        >
          <div class="card-body">
            <span class="notation-text"
              >Play some notes to see patterns...</span
            >
          </div>
        </div>

        <!-- Display each pattern -->
        <div
          v-for="(pattern, index) in patterns"
          :key="`pattern-${pattern.id}`"
          :ref="(el) => setSegmentRef(el, index)"
          class="pattern-card"
          :class="{
            'is-default': pattern.isDefault,
            'is-saved': pattern.isSaved && !pattern.isDefault,
            'is-current': isCurrentPattern(pattern, index),
          }"
        >
          <!-- Pattern header with metadata and actions -->
          <div class="card-header">
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
                  v-else-if="isCurrentPattern(pattern, index)"
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

            <div class="card-actions">
              <!-- Backspace button for current pattern -->
              <button
                v-if="isCurrentPattern(pattern, index) && canBackspace"
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

          <!-- Pattern notation display (safe rendering) -->
          <div class="card-body">
            <div class="notation-display">
              <NotationRenderer
                :pattern="pattern"
                :show-colors="true"
                class="notation-content"
              />
            </div>
          </div>
        </div>
      </TransitionGroup>

      <!-- End marker for auto-scroll -->
      <div ref="endMarkerRef" class="end-marker"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { gsap } from "gsap";
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
const patternRecording = usePatternRecording();

// Refs
const containerRef = ref<HTMLElement>();
const scrollContainerRef = ref<HTMLElement>();
const endMarkerRef = ref<HTMLElement>();
const segmentRefs = ref<Map<number, HTMLElement>>(new Map());

// State
const isAutoScrolling = ref(false);

// Animation context
let animationContext: any | null = null;

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

// Get patterns from store with optional limiting
const patterns = computed(() => {
  const allPatterns = patternsStore.patterns;

  // Apply pattern limit if specified
  if (props.maxPatterns && allPatterns.length > props.maxPatterns) {
    // Keep default patterns and most recent user patterns
    const defaultPatterns = allPatterns.filter((p) => p.isDefault);
    const userPatterns = allPatterns.filter((p) => !p.isDefault);
    const recentUserPatterns = userPatterns.slice(
      -(props.maxPatterns - defaultPatterns.length)
    );
    return [...defaultPatterns, ...recentUserPatterns];
  }

  return allPatterns;
});

// Check if backspace is available
const canBackspace = computed(() => {
  const current = patternsStore.currentPattern;
  return current && current.notes && current.notes.length > 0;
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a pattern is the current pattern being built
 */
function isCurrentPattern(pattern: Pattern, index: number): boolean {
  // Current pattern is the last non-default, non-saved pattern
  return (
    !pattern.isDefault &&
    !pattern.isSaved &&
    pattern.id === patternsStore.currentPattern?.id
  );
}

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
    console.log("🎵 Removed last note from current pattern");
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

    console.log(`📋 Copied pattern notation: ${textToCopy}`);
  } catch (error) {
    console.error("❌ Failed to copy pattern:", error);
  }
}

/**
 * Save a pattern
 */
function savePattern(pattern: Pattern) {
  const success = patternsStore.savePattern(pattern.id);
  if (success) {
    console.log(`💾 Pattern saved: ${pattern.id}`);
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
 * Scroll to end (auto-scroll for new patterns)
 */
function scrollToEnd() {
  if (!scrollContainerRef.value || !props.autoScroll) return;

  isAutoScrolling.value = true;
  const container = scrollContainerRef.value;

  // Scroll to bottom (vertical scroll)
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth",
  });

  // Reset flag after animation
  setTimeout(() => {
    isAutoScrolling.value = false;
  }, 500);
}

/**
 * Animate new pattern segments
 */
function animateNewSegment(index: number) {
  const element = segmentRefs.value.get(index);
  if (!element || !animationContext) return;

  animationContext.add(() => {
    gsap.from(element, {
      opacity: 0,
      scale: 0.95,
      y: -10,
      duration: 0.3,
      ease: "power2.out",
      clearProps: "all",
    });

    // Highlight new user patterns
    const pattern = patterns.value[index];
    if (pattern && !pattern.isDefault && !pattern.isSaved) {
      gsap.to(element, {
        boxShadow: "0 0 15px hsla(200, 70%, 50%, 0.4)",
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut",
      });
    }
  });
}

// ============================================================================
// WATCHERS
// ============================================================================

// Watch for pattern changes
watch(
  () => patterns.value.length,
  async (newLength, oldLength) => {
    console.log("LiveStrip V2: Patterns changed:", oldLength, "->", newLength);

    if (newLength > oldLength) {
      await nextTick();

      // Animate new patterns
      for (let i = oldLength; i < newLength; i++) {
        animateNewSegment(i);
      }

      // Auto-scroll to show new content
      if (props.autoScroll) {
        scrollToEnd();
      }
    }
  }
);

// Watch for visibility changes
watch(
  () => props.isVisible,
  (visible) => {
    if (visible && containerRef.value) {
      gsap.to(containerRef.value, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }
);

// ============================================================================
// LIFECYCLE
// ============================================================================

onMounted(async () => {
  console.log("LiveStrip V2: Mounting...");

  // Ensure patterns store is initialized
  if (!patternsStore.isInitialized) {
    console.log("LiveStrip V2: Initializing patterns store...");
    await patternsStore.initialize();
  }

  console.log("LiveStrip V2: Patterns available:", patterns.value.length);

  // Create GSAP context for cleanup
  animationContext = gsap.context(() => {}, containerRef.value);

  // Initial setup
  if (containerRef.value) {
    gsap.set(containerRef.value, {
      opacity: props.isVisible ? 1 : 0,
      y: props.isVisible ? 0 : -10,
    });
  }

  // Scroll to end if there's content
  if (patterns.value.length > 0) {
    nextTick(() => {
      scrollToEnd();
    });
  }
});

onUnmounted(() => {
  // Clean up GSAP animations
  if (animationContext) {
    animationContext.revert();
  }
});
</script>

<style scoped>
.live-strip-container {
  position: relative;
  width: 100%;
  height: auto;
  max-height: 300px; /* Increased for better visibility */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid hsla(0, 0%, 100%, 0.1);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
  contain: layout style paint;
  will-change: opacity, transform;
  z-index: 100;
}

.live-strip-scroll {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-height: inherit;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scroll-snap-type: y proximity;
  -webkit-overflow-scrolling: touch;
  padding: 0.75rem;
  gap: 0.5rem;

  /* Hide scrollbar but maintain functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.live-strip-scroll::-webkit-scrollbar {
  display: none;
}

.live-strip-content {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  min-height: 100%;
  padding: 0;
}

.pattern-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: hsla(0, 0%, 100%, 0.05);
  border: 1px solid hsla(0, 0%, 100%, 0.1);
  border-radius: 0.5rem;
  scroll-snap-align: start;
  transition: all 0.2s ease;
  contain: layout style;
  overflow: hidden;
}

.pattern-card:hover {
  background: hsla(0, 0%, 100%, 0.08);
  border-color: hsla(0, 0%, 100%, 0.2);
  transform: translateY(-1px);
}

/* Pattern type styling */
.pattern-card.is-default {
  background: hsla(280, 50%, 30%, 0.15);
  border-color: hsla(280, 50%, 50%, 0.3);
}

.pattern-card.is-saved {
  background: hsla(120, 50%, 30%, 0.15);
  border-color: hsla(120, 50%, 50%, 0.3);
}

.pattern-card.is-current {
  background: hsla(200, 70%, 50%, 0.15);
  border-color: hsla(200, 70%, 50%, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.pattern-card.placeholder {
  opacity: 0.6;
  font-style: italic;
  text-align: center;
  padding: 2rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.5rem;
}

.pattern-info {
  flex: 1;
  min-width: 0;
}

.pattern-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsla(0, 0%, 100%, 0.9);
  display: block;
  margin-bottom: 0.25rem;
}

.pattern-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
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
  font-size: 0.75rem;
  color: hsla(0, 0%, 100%, 0.6);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.action-btn {
  appearance: none;
  background: hsla(0, 0%, 100%, 0.08);
  border: 1px solid hsla(0, 0%, 100%, 0.15);
  color: hsla(0, 0%, 100%, 0.8);
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
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
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
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

.card-body {
  border-top: 1px solid hsla(0, 0%, 100%, 0.08);
  background: hsla(0, 0%, 0%, 0.3);
  padding: 0.75rem 1rem;
}

.notation-display {
  width: 100%;
  overflow-x: auto;
}

.notation-content {
  font-family: "Fira Code", "Monaco", "Courier New", monospace;
  font-size: 0.875rem;
  color: hsla(0, 0%, 100%, 0.9);
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.notation-text {
  font-family: "Fira Code", "Monaco", "Courier New", monospace;
  font-size: 0.875rem;
  color: hsla(0, 0%, 100%, 0.7);
  letter-spacing: 0.05em;
}

.end-marker {
  flex: 0 0 1px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

/* Animation classes for TransitionGroup */
.pattern-segment-enter-active {
  transition: all 0.3s ease-out;
}

.pattern-segment-leave-active {
  transition: all 0.2s ease-in;
}

.pattern-segment-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.pattern-segment-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .live-strip-scroll {
    scroll-behavior: auto !important;
  }

  .pattern-segment-enter-active,
  .pattern-segment-leave-active {
    transition: none !important;
  }

  .pattern-card {
    transition: none !important;
  }

  .action-btn {
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
