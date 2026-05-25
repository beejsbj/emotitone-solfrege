<template>
  <section class="pattern-reel" aria-label="Interactive pattern reel">
    <span v-if="eyebrow" class="pattern-reel__label">{{ eyebrow }}</span>

    <div class="pattern-reel__head">
      <span class="pattern-reel__title">{{ title }}</span>
      <span class="pattern-reel__count">{{ stackPatterns.length }} stacked · 1 active</span>
    </div>

    <div class="pattern-reel__stack">
      <PatternCard
        v-for="(pattern, index) in stackPatterns"
        :key="pattern.id"
        v-bind="pattern"
        :class="['pattern-reel__stack-card', depthClass(index)]"
        @click="promotePattern(pattern.id)"
      />
    </div>

    <PatternCard
      v-if="activePattern"
      v-bind="activePattern"
      shape="active"
      class="pattern-reel__active-card"
      :footer-text="footerText"
      :status-text="statusText"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import PatternCard from "./PatternCard.vue";
import type { BarTapeMode, BarTapeSegment } from "../primatives/BarTape.vue";
import type { CodeStripToken } from "../primatives/CodeStrip.vue";

export interface PatternReelItem {
  id: string;
  num: string;
  name: string;
  sub: string;
  spine?: string;
  when?: string;
  barTape?: BarTapeSegment[];
  barTapeMode?: BarTapeMode;
  codeTokens?: CodeStripToken[];
}

const props = withDefaults(
  defineProps<{
    patterns: PatternReelItem[];
    initialActiveId?: string;
    title?: string;
    eyebrow?: string;
    footerText?: string;
    statusText?: string;
  }>(),
  {
    initialActiveId: undefined,
    title: "Patterns",
    eyebrow: "The reel · interactive",
    footerText: "Bar 03 / 08 · Steps 16/16",
    statusText: "Rec armed",
  },
);

const initialActiveId = computed(
  () => props.initialActiveId ?? props.patterns[props.patterns.length - 1]?.id,
);

const activeId = ref(initialActiveId.value);
const stackOrder = ref(
  props.patterns
    .map((pattern) => pattern.id)
    .filter((id) => id !== activeId.value),
);

const patternById = computed(() =>
  Object.fromEntries(props.patterns.map((pattern) => [pattern.id, pattern])),
);

const stackPatterns = computed(() =>
  stackOrder.value
    .map((id) => patternById.value[id])
    .filter((pattern): pattern is PatternReelItem => Boolean(pattern)),
);

const activePattern = computed(() => patternById.value[activeId.value ?? ""]);

const depthClass = (index: number) => {
  const distance = stackOrder.value.length - 1 - index;
  return distance === 0 ? "s-1" : distance === 1 ? "s-2" : "s-3";
};

const promotePattern = (nextActiveId: string) => {
  if (nextActiveId === activeId.value) {
    return;
  }

  stackOrder.value = stackOrder.value.filter((id) => id !== nextActiveId);
  if (activeId.value) {
    stackOrder.value.push(activeId.value);
  }
  activeId.value = nextActiveId;
};
</script>

<style scoped>
.pattern-reel {
  position: relative;
  margin-top: 0;
  padding: 28px 24px 22px;
  box-shadow: var(--ring);
}

.pattern-reel__label {
  position: absolute;
  top: -9px;
  left: 14px;
  background: var(--ink);
  color: var(--ivory-4);
  font: var(--t-label);
  letter-spacing: .16em;
  padding: 0 8px;
  text-transform: uppercase;
}

.pattern-reel__head {
  display: flex;
  align-items: baseline;
  gap: var(--s-5);
  border-bottom: 1px solid var(--hairline);
  margin-bottom: var(--s-5);
  padding-bottom: var(--s-5);
}

.pattern-reel__title {
  color: var(--ivory);
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.pattern-reel__count {
  margin-left: auto;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.pattern-reel__stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pattern-reel__stack-card {
  transform-origin: 50% 0;
}

.pattern-reel__stack-card.s-3 {
  opacity: .62;
  transform: rotate(-.35deg) scale(.965);
}

.pattern-reel__stack-card.s-2 {
  opacity: .80;
  transform: rotate(.25deg) scale(.985);
}

.pattern-reel__stack-card.s-1 {
  opacity: 1;
  transform: rotate(-.15deg) scale(1);
}

.pattern-reel__active-card {
  animation: active-rise var(--dur-panel) var(--ease-swing);
}

@keyframes active-rise {
  from {
    opacity: .72;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pattern-reel__stack-card,
  .pattern-reel__active-card {
    transition-duration: 0ms;
    animation: none;
  }
}
</style>
