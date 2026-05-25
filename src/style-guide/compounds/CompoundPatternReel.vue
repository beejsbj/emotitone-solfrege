<template>
  <section class="preview-port preview-port--compound-pattern-reel">
    <div class="card pattern-merge">
      <div class="card-head">
        <div>
          <div class="kicker"><span class="kicker-dot"></span>Stacked deck · active bottom</div>
          <h2>A deck you flip through</h2>
        </div>
        <div class="head-meta" id="reelMeta">4 patterns<br>last 12h</div>
      </div>

      <section class="panel" aria-label="Interactive pattern reel">
        <span class="panel-label">The reel · interactive</span>

        <div class="reel-head">
          <span class="reel-title">Patterns</span>
          <span class="reel-count">3 stacked · 1 active</span>
        </div>

        <div class="stack">
          <PatternCard
            v-for="(pattern, index) in stackPatterns"
            :key="pattern.id"
            v-bind="pattern"
            :class="['stack-card', depthClass(index)]"
            @click="promotePattern(pattern.id)"
          />
        </div>

        <PatternCard
          v-bind="activePattern"
          shape="active"
          class="active-card"
          footer-text="Bar 03 / 08 · Steps 16/16"
          status-text="Rec armed"
        />
      </section>

      <div class="caption">Click a stacked card to promote it. The previous active card demotes into the stack.</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import PatternCard from "../../components/compounds/PatternCard.vue";
import type { BarTapeMode, BarTapeSegment } from "../../components/primatives/BarTape.vue";
import type { CodeStripToken } from "../../components/primatives/CodeStrip.vue";

type PatternId = "glass" | "tram" | "hilbert" | "brass";

interface PatternReelItem {
  id: PatternId;
  num: string;
  name: string;
  sub: string;
  when: string;
  spine: string;
  barTape: BarTapeSegment[];
  barTapeMode: BarTapeMode;
  codeTokens: CodeStripToken[];
}

const patterns: Record<PatternId, PatternReelItem> = {
  glass: {
    id: "glass",
    num: "2I",
    name: "Glass Bell",
    sub: "F# DORIAN / 96 BPM / 8 BARS",
    when: "2d ago",
    spine: "var(--tomato)",
    barTape: [
      { note: "re" }, { note: "mi" }, { note: "do" }, { note: "fa" },
      { note: "re" }, { note: "la" }, { note: "mi" }, { note: "ti" },
    ],
    barTapeMode: "equal",
    codeTokens: [
      { type: "note", note: "re", text: "Re", duration: "@0.250" },
      { type: "rest" },
      { type: "note", note: "mi", text: "Mi", duration: "@0.125" },
      { type: "rest" },
      { type: "note", note: "do", text: "Do", lit: true, duration: "@0.375" },
      { type: "rest" },
      { type: "note", note: "fa", text: "Fa" },
    ],
  },
  tram: {
    id: "tram",
    num: "I2",
    name: "Late Night Tram",
    sub: "A MINOR / 72 BPM / 16 BARS",
    when: "5h ago",
    spine: "var(--tomato)",
    barTape: [
      { note: "sol" }, { note: "la" }, { note: "ti" }, { note: "sol" },
      { note: "la" }, { note: "do" }, { note: "re" }, { note: "mi" },
    ],
    barTapeMode: "equal",
    codeTokens: [
      { type: "note", note: "sol", text: "Sol", duration: "@0.167" },
      { type: "rest" },
      { type: "note", note: "la", text: "La", lit: true, duration: "@0.333" },
      { type: "rest" },
      { type: "note", note: "ti", text: "Ti", duration: "@0.090" },
      { type: "rest" },
      { type: "note", note: "do", text: "Do" },
    ],
  },
  hilbert: {
    id: "hilbert",
    num: "II",
    name: "Hilbert Tape",
    sub: "D# LYDIAN / 132 BPM / 4 BARS",
    when: "just now",
    spine: "var(--plum)",
    barTape: [
      { note: "fa" }, { note: "mi" }, { note: "re" }, { note: "do" },
      { note: "fa" }, { note: "la" }, { note: "ti" },
    ],
    barTapeMode: "major",
    codeTokens: [
      { type: "note", note: "fa", text: "Fa", duration: "@0.0398" },
      { type: "rest" },
      { type: "note", note: "mi", text: "Mi", duration: "@0.09" },
      { type: "rest" },
      { type: "note", note: "re", text: "Re", lit: true, duration: "@0.3289" },
      { type: "rest" },
      { type: "note", note: "do", text: "Do" },
    ],
  },
  brass: {
    id: "brass",
    num: "I0",
    name: "Brass Whistle",
    sub: "E LOCRIAN / 120 BPM / 8 BARS / PIANO",
    when: "active",
    spine: "var(--tomato)",
    barTape: [
      { note: "mi" }, { note: "sol" }, { note: "la" }, { note: "ti" },
      { note: "do" }, { note: "re" }, { note: "mi" },
    ],
    barTapeMode: "major",
    codeTokens: [
      { type: "note", note: "mi", text: "Mi", duration: "@0.282" },
      { type: "rest" },
      { type: "note", note: "sol", text: "Sol", duration: "@0.128" },
      { type: "rest" },
      { type: "note", note: "la", text: "La", lit: true, duration: "@0.2031" },
      { type: "rest" },
      { type: "note", note: "ti", text: "Ti", duration: "@0.09" },
    ],
  },
};

const stackOrder = ref<PatternId[]>(["glass", "tram", "hilbert"]);
const activeId = ref<PatternId>("brass");

const stackPatterns = computed(() => stackOrder.value.map((id) => patterns[id]));
const activePattern = computed(() => patterns[activeId.value]);

const depthClass = (index: number) => {
  const distance = stackOrder.value.length - 1 - index;
  return distance === 0 ? "s-1" : distance === 1 ? "s-2" : "s-3";
};

const promotePattern = (nextActiveId: PatternId) => {
  stackOrder.value = stackOrder.value.filter((id) => id !== nextActiveId);
  stackOrder.value.push(activeId.value);
  activeId.value = nextActiveId;
};
</script>

<style scoped>
.preview-port {
  display: block;
}
.pattern-merge {
  color: var(--ivory);
}

.pattern-merge * {
  box-sizing: border-box;
}

.pattern-merge .card-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--s-6);
  margin-bottom: var(--s-7);
}

.pattern-merge .kicker {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font: var(--t-label);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-3);
  margin-bottom: var(--s-4);
}

.pattern-merge .kicker-dot {
  width: 8px;
  height: 8px;
  background: var(--tomato);
  display: inline-block;
}

.pattern-merge h2 {
  margin: 0;
  max-width: 15ch;
  font: var(--t-display-l);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.pattern-merge .head-meta {
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-3);
  text-align: right;
}

/* Specimen outer = canonical .panel (in _card.css) + box-shadow + extra padding */
.pattern-merge .panel {
  box-shadow: var(--ring);
  padding: 28px 24px 22px;
  margin-top: 0;
}

.pattern-merge .reel-head {
  display: flex;
  align-items: baseline;
  gap: var(--s-5);
  padding-bottom: var(--s-5);
  border-bottom: 1px solid var(--hairline);
  margin-bottom: var(--s-5);
}

.pattern-merge .reel-title {
  font: var(--t-h2);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.pattern-merge .reel-count {
  margin-left: auto;
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-3);
}

.pattern-merge .stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Reel-only stack depth; PatternCard owns the card anatomy. */
.pattern-merge .stack-card {
  transform-origin: 50% 0;
}

.pattern-merge .stack-card.s-3 {
  transform: rotate(-0.35deg) scale(0.965);
  opacity: 0.62;
}

.pattern-merge .stack-card.s-2 {
  transform: rotate(0.25deg) scale(0.985);
  opacity: 0.80;
}

.pattern-merge .stack-card.s-1 {
  transform: rotate(-0.15deg) scale(1);
  opacity: 1;
}

/* Reel-only active transition; PatternCard owns the active card anatomy. */
.pattern-merge .active-card {
  animation: active-rise var(--dur-panel) var(--ease-swing);
}

.pattern-merge .caption {
  margin-top: var(--s-6);
  font: var(--t-caption);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ivory-3);
}

@keyframes active-rise {
  from {
    transform: translateY(-8px);
    opacity: 0.72;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pattern-merge .stack-card,
  .pattern-merge .active-card {
    transition-duration: 0ms;
    animation: none;
  }
}
</style>
