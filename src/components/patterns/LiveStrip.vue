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
          class="pattern-segment placeholder"
        >
          <div class="pattern-notation">
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
            'is-saved': pattern.isSaved,
            'is-current':
              !pattern.isDefault &&
              !pattern.isSaved &&
              index === patterns.length - 1,
          }"
        >
          <div class="card-header">
            <div class="flex gap-4 items-center">
              <span class="pattern-name">{{ getPatternName(pattern) }}</span>
              <span class="meta-type" v-if="pattern.isDefault">default</span>
              <span class="meta-type" v-else-if="pattern.isSaved">saved</span>
              <span class="meta-key"
                >{{ pattern.key || "C" }} {{ pattern.mode || "major" }}</span
              >
              <span class="meta-notes"
                >{{
                  pattern.noteCount || pattern.notes?.length || 0
                }}
                notes</span
              >
            </div>
            <div class="card-actions">
              <button class="copy-btn" @click="copyNotation(pattern)">
                Copy
              </button>
            </div>
          </div>
          <div class="card-body">
            <code
              class="flex items-center gap-4 notation-text"
              v-html="getPatternNotation(pattern)"
            ></code>
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
import {
  patternToBracketNotation,
  historyNotesToDisplay,
} from "@/utils/bracketNotation";
import type { Pattern } from "@/types/patterns";
import type { MusicalMode } from "@/types";
import { useColorSystem } from "@/composables/useColorSystem";

const { getStaticPrimaryColorFromSolfegeInput, createGradient } =
  useColorSystem();

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
  maxPatterns: 100, // Show more patterns since they're the ledger
  autoScroll: true,
});

// Store
const patternsStore = usePatternsStore();

// Refs
const containerRef = ref<HTMLElement>();
const scrollContainerRef = ref<HTMLElement>();
const endMarkerRef = ref<HTMLElement>();
const segmentRefs = ref<Map<number, HTMLElement>>(new Map());

// Scroll state
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const isAutoScrolling = ref(false);

// Animation context
let animationContext: any | null = null;

// Set segment ref for animation targeting
function setSegmentRef(el: any, index: number) {
  if (el) {
    segmentRefs.value.set(index, el as HTMLElement);
  } else {
    segmentRefs.value.delete(index);
  }
}

// Get patterns from store - this is reactive and updates immediately
const patterns = computed(() => {
  const allPatterns = patternsStore.patterns;

  // Limit if needed
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

// Pattern name fallback
function getPatternName(pattern: Pattern): string {
  if (pattern.name) return pattern.name;
  const type = pattern.patternType || "pattern";
  const count = pattern.noteCount || pattern.notes?.length || 0;
  return `${type} · ${count} notes`;
}

// Convert pattern to display notation
function getPatternNotation(pattern: Pattern): string {
  if (!pattern.notes || pattern.notes.length === 0) {
    return pattern.name || "~";
  }

  // For longer patterns, use bracket notation
  const { notation } = patternToBracketNotation(pattern, {
    isChromatic: false,
    includeVelocity: false,
  });

  console.log("notation", notation);

  const key = pattern.key || "C";
  const mode = pattern.mode || "major";

  const notationTemplate = `
	<div class="inline-grid justify-items-center select-none">	
		<div class="note w-full text-center text-white font-black clip-path-note text-sm leading-none" style="background: {{ color }};">
			{{ content }}
		</div>
		<div class="duration w-full bg-black text-white text-center text-xs">
			{{ duration }}
		</div>
      </div>
    </div>
    `;

  // Smaller inner template for grouped notes
  const innerNotationTemplate = `
	<div class="inline-grid justify-items-center select-none">	
		<div class="note w-full text-center text-white font-semibold text-xs leading-none" style="background: {{ color }};">
			{{ note }}
		</div>
		<div class="duration w-full bg-black text-white text-center text-[10px]">
			{{ duration }}
		</div>
      </div>
    `;

  // Tokenize notation respecting curly-brace groups
  function tokenizeNotationString(input: string): string[] {
    const tokens: string[] = [];
    let buffer = "";
    let depth = 0;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "{") {
        depth++;
        buffer += ch;
        continue;
      }
      if (ch === "}") {
        depth = Math.max(0, depth - 1);
        buffer += ch;
        continue;
      }
      if (ch === " " && depth === 0) {
        if (buffer.trim().length > 0) tokens.push(buffer.trim());
        buffer = "";
        continue;
      }
      buffer += ch;
    }
    if (buffer.trim().length > 0) tokens.push(buffer.trim());
    return tokens;
  }

  type SimpleToken = { type: "simple"; note: string; duration: string };
  type GroupToken = {
    type: "group";
    items: (SimpleToken | GroupToken)[];
    duration: string;
  };

  function parseToken(token: string): SimpleToken | GroupToken {
    if (token.startsWith("{")) {
      // Format: { ... }@duration
      const closeIdx = token.lastIndexOf("}@");
      if (closeIdx !== -1) {
        const inner = token.slice(1, closeIdx);
        const duration = token.slice(closeIdx + 2 + 1); // skip }@
        const innerTokens = tokenizeNotationString(inner).map(parseToken);
        return { type: "group", items: innerTokens, duration };
      }
      // Fallback: treat as simple if malformed
    }
    const [note, duration = ""] = token.split("@");
    return { type: "simple", note, duration };
  }

  function flattenFirstSimple(t: SimpleToken | GroupToken): SimpleToken | null {
    if (t.type === "simple") return t;
    for (const it of t.items) {
      const found = flattenFirstSimple(it);
      if (found) return found;
    }
    return null;
  }

  function renderSimple(token: SimpleToken, mode: MusicalMode): string {
    const note = token.note;
    const duration = token.duration;
    const scaleIndex = Number(note);
    const color =
      note === "~"
        ? "hsla(0, 0%, 10%, 1)"
        : getStaticPrimaryColorFromSolfegeInput(
            isNaN(scaleIndex) ? 0 : scaleIndex,
            "scaleIndex",
            mode
          );
    const durationFormatted = isNaN(Number(duration))
      ? duration
      : Number(duration).toFixed(4);
    return notationTemplate
      .replace("{{ color }}", color)
      .replace("{{ content }}", note)
      .replace("{{ duration }}", durationFormatted);
  }

  function renderGroup(token: GroupToken, mode: MusicalMode): string {
    // Build gradient from all inner simple note colors
    const collectColors = (t: SimpleToken | GroupToken, acc: string[]) => {
      if (t.type === "simple") {
        const note = t.note;
        const idx = Number(note);
        if (note !== "~") {
          const c = getStaticPrimaryColorFromSolfegeInput(
            isNaN(idx) ? 0 : idx,
            "scaleIndex",
            mode
          );
          acc.push(c);
        }
        return acc;
      }
      t.items.forEach((it) => collectColors(it, acc));
      return acc;
    };
    const colors = collectColors(token, [] as string[]);
    const outerColor =
      colors.length > 0 ? createGradient(colors) : "hsla(0, 0%, 10%, 1)";

    // Render inner items using the inner template
    const innerHTML = token.items
      .map((it) => {
        if (it.type === "simple") {
          const note = it.note;
          const duration = it.duration;
          const scaleIndex = Number(note);
          const color =
            note === "~"
              ? "hsla(0, 0%, 10%, 1)"
              : getStaticPrimaryColorFromSolfegeInput(
                  isNaN(scaleIndex) ? 0 : scaleIndex,
                  "scaleIndex",
                  mode
                );
          const durationFormatted = isNaN(Number(duration))
            ? duration
            : Number(duration).toFixed(4);
          return innerNotationTemplate
            .replace("{{ color }}", color)
            .replace("{{ note }}", note)
            .replace("{{ duration }}", durationFormatted);
        } else {
          return renderGroup(it, mode);
        }
      })
      .join("");

    const durationFormatted = isNaN(Number(token.duration))
      ? token.duration
      : Number(token.duration).toFixed(4);

    return notationTemplate
      .replace("{{ color }}", outerColor)
      .replace("{{ content }}", innerHTML)
      .replace("{{ duration }}", durationFormatted);
  }

  const rawTokens = tokenizeNotationString(notation);
  const parsedTokens = rawTokens.map(parseToken);

  const notationString = parsedTokens
    .map((tok) =>
      tok.type === "simple"
        ? renderSimple(tok, mode as MusicalMode)
        : renderGroup(tok, mode as MusicalMode)
    )
    .join("");

  console.log("notationArray", parsedTokens);

  return notationString || pattern.name || "~";
}

// Copy notation to clipboard
async function copyNotation(pattern: Pattern) {
  const text = getPatternNotation(pattern);
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
    } catch {}
    document.body.removeChild(textarea);
  }
}

// Handle scroll events
function handleScroll() {
  if (!scrollContainerRef.value || isAutoScrolling.value) return;

  const container = scrollContainerRef.value;
  canScrollLeft.value = container.scrollLeft > 0;
  canScrollRight.value =
    container.scrollLeft < container.scrollWidth - container.clientWidth;
}

// Scroll to start
function scrollToStart() {
  if (!scrollContainerRef.value) return;
  scrollContainerRef.value.scrollTo({
    left: 0,
    behavior: "smooth",
  });
}

// Scroll to end (auto-scroll)
function scrollToEnd() {
  if (!scrollContainerRef.value || !props.autoScroll) return;

  isAutoScrolling.value = true;
  const container = scrollContainerRef.value;
  container.scrollTo({
    left: container.scrollWidth,
    behavior: "smooth",
  });

  // Reset flag after animation
  setTimeout(() => {
    isAutoScrolling.value = false;
  }, 500);
}

// Clear history
function clearHistory() {
  if (
    confirm(
      "Clear all playing history? This will remove all auto-detected patterns."
    )
  ) {
    patternsStore.clearAllData();
  }
}

// Animate new segments
function animateNewSegment(index: number) {
  const element = segmentRefs.value.get(index);
  if (!element || !animationContext) return;

  animationContext.add(() => {
    gsap.from(element, {
      opacity: 0,
      scale: 0.9,
      x: 20,
      duration: 0.3,
      ease: "power2.out",
      clearProps: "all",
    });

    // Highlight new user patterns
    if (!patterns.value[index]?.isDefault) {
      gsap.to(element, {
        boxShadow: "0 0 20px hsla(200, 70%, 50%, 0.3)",
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut",
      });
    }
  });
}

// Watch for pattern changes
watch(
  () => patterns.value.length,
  async (newLength, oldLength) => {
    console.log("LiveStrip: Patterns changed:", oldLength, "->", newLength);

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

// Lifecycle
onMounted(async () => {
  console.log("LiveStrip: Mounting...");

  // Ensure patterns store is initialized
  if (!patternsStore.isInitialized) {
    console.log("LiveStrip: Initializing patterns store...");
    await patternsStore.initialize();
  }

  console.log("LiveStrip: Patterns available:", patterns.value.length);

  // Create GSAP context for cleanup
  animationContext = gsap.context(() => {}, containerRef.value);

  // Initial setup
  if (containerRef.value) {
    gsap.set(containerRef.value, {
      opacity: props.isVisible ? 1 : 0,
      y: props.isVisible ? 0 : -20,
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
  max-height: 120px;
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
  justify-content: center;
  align-items: stretch;
  min-width: 0;
  height: auto;
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
  transform: scale(1.02);
}

/* Default patterns (library) */
.pattern-card.is-default {
  background: hsla(280, 50%, 30%, 0.2);
  border-color: hsla(280, 50%, 50%, 0.3);
}

.pattern-card.is-default:hover {
  background: hsla(280, 50%, 35%, 0.25);
  border-color: hsla(280, 50%, 50%, 0.4);
}

/* Saved patterns (bookmarked) */
.pattern-card.is-saved {
  background: hsla(120, 50%, 30%, 0.2);
  border-color: hsla(120, 50%, 50%, 0.3);
}

.pattern-card.is-saved:hover {
  background: hsla(120, 50%, 35%, 0.25);
  border-color: hsla(120, 50%, 50%, 0.4);
}

/* Current pattern being played */
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

.pattern-card.is-complete {
  opacity: 0.7;
}

.pattern-card.placeholder {
  opacity: 0.5;
  font-style: italic;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  padding: 0.5rem 1rem;
}

.pattern-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: hsla(0, 0%, 100%, 0.9);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.copy-btn {
  appearance: none;
  background: hsla(0, 0%, 100%, 0.08);
  border: 1px solid hsla(0, 0%, 100%, 0.18);
  color: hsla(0, 0%, 100%, 0.85);
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
}

.copy-btn:hover {
  background: hsla(0, 0%, 100%, 0.12);
}

.card-body {
  white-space: nowrap;
  /* width: max-content; */
  border-top: 1px solid hsla(0, 0%, 100%, 0.08);
  background: hsla(0, 0%, 0%, 0.95);
  padding: 0.375rem;
  overflow-x: auto;
}

.notation-text {
  font-family: "Fira Code", "Monaco", "Courier New", monospace;
  font-size: 0.9rem;
  color: hsla(0, 0%, 100%, 0.9);
  letter-spacing: 0.05em;
}

.pattern-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.65rem;
  color: hsla(0, 0%, 100%, 0.5);
}

.meta-type {
  padding: 0 0.25rem;
  background: hsla(0, 0%, 100%, 0.1);
  border-radius: 0.25rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.55rem;
}

.meta-key {
  font-weight: 500;
  font-size: 0.65rem;
}

.meta-notes {
  opacity: 0.7;
  font-size: 0.65rem;
}

.end-marker {
  flex: 0 0 1px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.live-strip-controls {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 0.25rem;
  pointer-events: none;
}

.control-btn {
  pointer-events: all;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: hsla(0, 0%, 0%, 0.8);
  border: 1px solid hsla(0, 0%, 100%, 0.2);
  border-radius: 50%;
  color: hsla(0, 0%, 100%, 0.7);
  font-size: 0.7rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.control-btn:hover:not(:disabled) {
  background: hsla(0, 0%, 100%, 0.1);
  color: hsla(0, 0%, 100%, 0.9);
  border-color: hsla(0, 0%, 100%, 0.3);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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
  transform: translateX(20px) scale(0.9);
}

.pattern-segment-leave-to {
  opacity: 0;
  transform: translateX(-20px) scale(0.9);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .live-strip-scroll {
    scroll-behavior: auto !important;
  }

  .pattern-segment {
    transition: none !important;
  }

  .pattern-segment-enter-active,
  .pattern-segment-leave-active {
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
