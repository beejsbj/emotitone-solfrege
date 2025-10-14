<template>
  <div class="notation-renderer" :class="{ 'show-colors': showColors }">
    <!-- Simple text fallback if no pattern or notes -->
    <span
      v-if="!pattern || !pattern.notes || pattern.notes.length === 0"
      class="notation-empty"
    >
      {{ pattern?.name || "~" }}
    </span>

    <!-- Safe notation rendering -->
    <ul v-else ref="notationSequenceRef" class="notation-sequence">
      <li
        v-for="(token, index) in notationTokens"
        :key="index"
        class="notation-token"
        :class="token.type"
        :style="token.style"
      >
        {{ token.text }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { patternToBracketNotation } from "@/utils/bracketNotation";
import { useColorSystem } from "@/composables/useColorSystem";
import type { Pattern } from "@/types/patterns";
import type { MusicalMode } from "@/types";

interface Props {
  pattern: Pattern;
  showColors?: boolean;
  isChromatic?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showColors: true,
  isChromatic: false,
});

const { getStaticPrimaryColorFromSolfegeInput } = useColorSystem();

// Template ref for the notation sequence
const notationSequenceRef = ref<HTMLElement | null>(null);

interface NotationToken {
  text: string;
  type: "note" | "rest" | "duration" | "separator";
  style?: Record<string, string>;
  scaleIndex?: number;
}

// Parse bracket notation into safe tokens for rendering
const notationTokens = computed((): NotationToken[] => {
  if (
    !props.pattern ||
    !props.pattern.notes ||
    props.pattern.notes.length === 0
  ) {
    return [];
  }

  try {
    const result = patternToBracketNotation(props.pattern, {
      isChromatic: props.isChromatic,
      includeVelocity: false,
    });

    return parseNotationSafely(result.notation, props.pattern.mode || "major");
  } catch (error) {
    console.error("Error parsing notation:", error);
    return [{ text: props.pattern.name || "Error", type: "note" }];
  }
});

/**
 * Parse bracket notation string into safe tokens
 */
function parseNotationSafely(
  notation: string,
  mode: MusicalMode
): NotationToken[] {
  if (!notation || notation.trim() === "") {
    return [{ text: "~", type: "rest" }];
  }

  const tokens: NotationToken[] = [];
  const parts = notation.split(" ");

  for (const part of parts) {
    if (!part.trim()) continue;

    if (part.startsWith("~")) {
      // Rest token
      const [restSymbol, duration] = part.split("@");
      tokens.push({
        text: restSymbol,
        type: "rest",
        style: { color: "hsla(0, 0%, 50%, 0.7)" },
      });
      if (duration) {
        tokens.push({
          text: `@${duration}`,
          type: "duration",
          style: { color: "hsla(0, 0%, 40%, 0.8)", fontSize: "0.8em" },
        });
      }
    } else {
      // Note token
      const [noteSymbol, duration] = part.split("@");
      const scaleIndex = parseInt(noteSymbol);

      let noteStyle: Record<string, string> = {};

      if (props.showColors && !isNaN(scaleIndex)) {
        const color = getStaticPrimaryColorFromSolfegeInput(
          scaleIndex,
          "scaleIndex",
          mode
        );
        noteStyle = {
          color: "white",
          backgroundColor: color,
          padding: "0.125rem 0.25rem",
          borderRadius: "0.25rem",
          fontWeight: "bold",
        };
      }

      tokens.push({
        text: noteSymbol,
        type: "note",
        style: noteStyle,
        scaleIndex: isNaN(scaleIndex) ? undefined : scaleIndex,
      });

      if (duration) {
        tokens.push({
          text: `@${duration}`,
          type: "duration",
          style: { color: "hsla(0, 0%, 60%, 0.8)", fontSize: "0.8em" },
        });
      }
    }

    // Add separator space (except for last token)
    if (part !== parts[parts.length - 1]) {
      tokens.push({ text: " ", type: "separator" });
    }
  }

  return tokens;
}

// Scroll to end when pattern notes change
watch(
  () => props.pattern?.notes?.length,
  (newLength, oldLength) => {
    console.log(" scroll 🎵 Pattern notes length changed:", {
      newLength,
      oldLength,
      notes: props.pattern?.notes,
    });

    nextTick(() => {
      if (notationSequenceRef.value) {
        console.log(" scroll 📜 Scrolling notation sequence:", {
          scrollLeft: notationSequenceRef.value.scrollLeft,
          scrollWidth: notationSequenceRef.value.scrollWidth,
          clientWidth: notationSequenceRef.value.clientWidth,
        });

        notationSequenceRef.value.scrollLeft =
          notationSequenceRef.value.scrollWidth;

        console.log(
          "✅ After scroll, scrollLeft:",
          notationSequenceRef.value.scrollLeft
        );
      } else {
        console.log(" scroll ❌ notationSequenceRef is null");
      }
    });
  }
);
</script>

<style scoped>
.notation-renderer {
  font-family: "Fira Code", "Monaco", "Courier New", monospace;
  font-size: inherit;
  line-height: 1.4;
}

.notation-empty {
  color: hsla(0, 0%, 100%, 0.5);
  font-style: italic;
}

.notation-sequence {
  display: flex;
  overflow-x: scroll;
  max-width: 90vw;
  align-items: center;
  gap: 1px;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
}

.notation-token {
  display: inline-block;
  transition: all 0.2s ease;
  scroll-snap-align: end;
}

.notation-token.note {
  font-weight: 600;
}

.notation-token.rest {
  opacity: 0.7;
}

.notation-token.duration {
  font-size: 0.8em;
  opacity: 0.8;
}

.notation-token.separator {
  width: 0.25rem;
}

/* Hover effects for colored notes */
.show-colors .notation-token.note:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .notation-token {
    transition: none !important;
  }

  .show-colors .notation-token.note:hover {
    transform: none !important;
  }
}
</style>
