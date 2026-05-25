<template>
  <div :class="stripClasses" :aria-label="ariaLabel" role="group">
    <span v-if="showChevron" class="code-strip__chevron">&lt;</span>
    <div class="code-strip__sequence">
      <template v-for="(token, tokenIndex) in tokens" :key="`${token.type}-${tokenIndex}`">
        <template v-if="token.type === 'note'">
          <span v-if="token.stackedDuration" class="code-strip__stack">
            <span :class="noteClasses(token)">
              {{ token.text }}
            </span>
            <span class="code-strip__stack-duration">{{ token.stackedDuration }}</span>
          </span>
          <template v-else>
            <span :class="noteClasses(token)">{{ token.text }}</span>
            <span v-if="token.accidental" class="code-strip__accidental">{{ token.accidental }}</span>
            <span v-if="token.duration" class="code-strip__duration">{{ token.duration }}</span>
            <span
              v-if="token.durationBarWidth"
              class="code-strip__duration-bar"
              :style="{ width: `${token.durationBarWidth}px` }"
            ></span>
          </template>
        </template>
        <template v-else-if="token.type === 'rest'">
          <span class="code-strip__rest">~</span>
          <span v-if="token.duration" class="code-strip__duration">{{ token.duration }}</span>
        </template>
        <span v-else-if="token.type === 'bracket'" class="code-strip__bracket">{{ token.text }}</span>
        <span v-else class="code-strip__separator">{{ token.text ?? "," }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type CodeStripNote = "do" | "re" | "mi" | "fa" | "sol" | "la" | "ti";
export type CodeStripGlyph = "syl" | "deg" | "raw";
export type CodeStripDensity = "default" | "dense" | "spaced";

export type CodeStripToken =
  | {
      type: "note";
      note: CodeStripNote;
      text: string;
      glyph?: CodeStripGlyph;
      lit?: boolean;
      accidental?: string;
      duration?: string;
      durationBarWidth?: number;
      stackedDuration?: string;
    }
  | { type: "rest"; duration?: string }
  | { type: "bracket"; text: "{" | "}" }
  | { type: "separator"; text?: "," | "/" };

const props = withDefaults(
  defineProps<{
    tokens: CodeStripToken[];
    density?: CodeStripDensity;
    wrapped?: boolean;
    showChevron?: boolean;
    ariaLabel?: string;
  }>(),
  {
    density: "default",
    wrapped: false,
    showChevron: true,
    ariaLabel: "Pattern notation",
  },
);

const stripClasses = computed(() => [
  "code-strip",
  `code-strip--${props.density}`,
  {
    "code-strip--wrapped": props.wrapped,
  },
]);

const noteClasses = (token: Extract<CodeStripToken, { type: "note" }>) => [
  "code-strip__note",
  `code-strip__note--${token.glyph ?? "syl"}`,
  `code-strip__note--${token.note}`,
  {
    "code-strip__note--lit": token.lit,
  },
];
</script>

<style scoped>
.code-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  overflow: hidden;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
}

.code-strip__chevron {
  flex: 0 0 auto;
  color: var(--ivory-4);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0;
}

.code-strip__sequence {
  display: flex;
  align-items: baseline;
  flex: 1;
  flex-wrap: nowrap;
  gap: 4px;
  min-width: 0;
  overflow-x: hidden;
}

.code-strip__rest {
  color: var(--ivory-4);
  font-size: 11px;
}

.code-strip__bracket {
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.code-strip__separator {
  color: var(--ivory-4);
  font-size: 10px;
}

.code-strip__duration {
  margin-left: -4px;
  color: var(--ivory-3);
  font-size: 9px;
  letter-spacing: .04em;
}

.code-strip__accidental {
  margin-left: -4px;
  color: var(--ivory-3);
  font-size: 9px;
}

.code-strip__note {
  color: currentColor;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: .02em;
  line-height: 1;
}

.code-strip__note--syl,
.code-strip__note--raw {
  text-transform: uppercase;
}

.code-strip__note--do { color: var(--note-do); }
.code-strip__note--re { color: var(--note-re); }
.code-strip__note--mi { color: var(--note-mi); }
.code-strip__note--fa { color: var(--note-fa); }
.code-strip__note--sol { color: var(--note-sol); }
.code-strip__note--la { color: var(--note-la); }
.code-strip__note--ti { color: var(--note-ti); }

.code-strip__note--lit {
  text-shadow: 0 0 14px currentColor;
}

.code-strip__note--lit::after {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-left: 3px;
  vertical-align: 3px;
  background: currentColor;
  content: "";
}

.code-strip__duration-bar {
  display: inline-block;
  height: 4px;
  margin-left: 2px;
  background: currentColor;
  opacity: .55;
  vertical-align: 5px;
}

.code-strip__stack {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.code-strip__stack-duration {
  width: 20px;
  border-top: 1px solid var(--hairline);
  padding-top: 2px;
  color: var(--ivory-3);
  font-size: 9px;
  text-align: center;
}

.code-strip--wrapped .code-strip__sequence {
  flex-wrap: wrap;
  row-gap: 4px;
}

.code-strip--dense .code-strip__sequence {
  gap: 3px;
}

.code-strip--dense .code-strip__note {
  font-size: 13px;
}

.code-strip--spaced .code-strip__sequence {
  gap: 12px;
}
</style>
