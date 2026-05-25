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
          <button
            v-for="(pattern, index) in stackPatterns"
            :key="pattern.id"
            :class="['stack-card', depthClass(index)]"
            type="button"
            @click="promotePattern(pattern.id)"
          >
            <div class="sc-row">
              <span class="spine" :style="{ background: pattern.spine }"></span>
              <span class="num">{{ pattern.num }}</span>
              <span class="nm">
                <span class="name">{{ pattern.name }}</span>
                <span class="sub">{{ pattern.sub }}</span>
              </span>
              <span class="when">{{ pattern.when }}</span>
            </div>
            <BarTape :mode="pattern.barTapeMode" frame="flush" :segments="pattern.barTape" />
          </button>
        </div>

        <article class="active-card">
          <span class="spine" :style="{ background: activePattern.spine }"></span>
          <div class="active-inner">
            <div class="active-head">
              <span class="num">{{ activePattern.num }}</span>
              <div class="active-copy">
                <div class="name">{{ activePattern.name }}</div>
                <div class="sub">{{ activePattern.sub }}</div>
              </div>
              <div class="icon-row" aria-label="Pattern controls">
                <IconButton size="sm" geometry="sharp" title="Play" aria-label="Play">
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
                  </svg>
                </IconButton>
                <IconButton size="sm" geometry="sharp" title="Arm take" aria-label="Arm take">
                  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"><circle cx="8" cy="8" r="4"></circle></svg>
                </IconButton>
                <IconButton size="sm" geometry="sharp" title="Duplicate" aria-label="Duplicate">
                  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"><path d="M3 5H11V13H3Z"></path><path d="M5 3H13V11"></path></svg>
                </IconButton>
                <IconButton size="sm" geometry="sharp" title="Send down" aria-label="Send down">
                  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"><path d="M8 2V12"></path><path d="M4 8L8 12L12 8"></path></svg>
                </IconButton>
              </div>
            </div>
            <CodeStrip class="active-code-strip" :tokens="activePattern.codeSeq" />
            <div class="active-foot">
              <span class="position">Bar 03 / 08 &middot; Steps 16/16</span>
              <span class="rec-tag brass">Rec armed</span>
            </div>
          </div>
        </article>
      </section>

      <div class="caption">Click a stacked card to promote it. The previous active card demotes into the stack.</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BarTape from "../../components/primatives/BarTape.vue";
import CodeStrip from "../../components/primatives/CodeStrip.vue";
import IconButton from "../../components/primatives/IconButton.vue";
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
  codeSeq: CodeStripToken[];
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
    codeSeq: [
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
    codeSeq: [
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
    codeSeq: [
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
    codeSeq: [
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

/* ── SHAPE 1: SLEEK (stack-card) — lifted verbatim from compound-pattern-card.html ── */
.pattern-merge .stack-card {
  appearance: none;
  position: relative;
  width: 100%;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
  color: var(--ivory);
  display: flex;
  flex-direction: column;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transform-origin: 50% 0;
  transition:
    transform var(--dur-panel) var(--ease-swing),
    opacity var(--dur-panel) var(--ease-brush),
    border-color var(--dur-ui) var(--ease-brush),
    background var(--dur-ui) var(--ease-brush);
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

.pattern-merge .stack-card:hover,
.pattern-merge .stack-card:focus-visible {
  transform: translateY(-6px) rotate(0deg) scale(1);
  opacity: 1;
  border-color: var(--ink-5);
  background: var(--ink-4);
  outline: none;
}

/* content row inside sleek card */
.pattern-merge .stack-card .sc-row {
  display: grid;
  grid-template-columns: 4px 56px minmax(0, 1fr) 74px;
  align-items: center;
  gap: var(--s-5);
  padding: 0 14px 0 0;
  height: 50px;
}

.pattern-merge .stack-card .spine {
  align-self: stretch;
  display: block;
}

.pattern-merge .stack-card .num {
  font: var(--t-display-m);
  line-height: 0.9;
  color: var(--ivory-4);
  text-align: center;
  text-transform: uppercase;
}

.pattern-merge .stack-card .nm {
  min-width: 0;
}

.pattern-merge .stack-card .name {
  display: block;
  font: var(--t-h2);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-merge .stack-card .sub {
  display: block;
  margin-top: 3px;
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--ivory-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-merge .stack-card .when {
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-3);
  text-align: right;
}

/* ── SHAPE 2: EXPANDED (active-card) — lifted verbatim from compound-pattern-card.html ── */
.pattern-merge .active-card {
  position: relative;
  border: 1px solid var(--ivory-3);
  background: var(--ink-4);
  box-shadow: var(--ring), 0 8px 0 var(--ink);
  display: flex;
  flex-direction: column;
  animation: active-rise var(--dur-panel) var(--ease-swing);
}

.pattern-merge .active-card .spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  display: block;
}

/* inner content area (spine excluded) */
.pattern-merge .active-inner {
  padding: 18px 18px 16px 22px;
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.pattern-merge .active-head {
  display: flex;
  align-items: center;
  gap: var(--s-6);
}

.pattern-merge .active-card .num {
  font: var(--t-display-l);
  line-height: 0.9;
  color: var(--ivory-3);
  text-transform: uppercase;
}

.pattern-merge .active-copy {
  flex: 1;
  min-width: 0;
}

.pattern-merge .active-card .name {
  display: block;
  font: var(--t-display-m);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-merge .active-card .sub {
  display: block;
  margin-top: 3px;
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--ivory-3);
}

/* ── icon-only transport rail ───────────────────────────────────────── */
.pattern-merge .icon-row {
  display: flex;
  gap: var(--s-3);
}

/* transport foot */
.pattern-merge .active-foot {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  border-top: 1px solid var(--hairline);
  padding-top: var(--s-5);
}

.pattern-merge .position {
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ivory-3);
}

.pattern-merge .rec-tag {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
  padding: 4px 10px;
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border-radius: 0;
}

.pattern-merge .rec-tag::before {
  content: "";
  width: 8px;
  height: 8px;
  background: var(--brass-edge);
}

/* code-strip inside expanded card: flush to inner padding edges */
.pattern-merge .active-code-strip {
  border-left: 0;
  border-right: 0;
  margin-left: -22px;
  margin-right: -18px;
  padding-left: 22px;
  padding-right: 18px;
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
