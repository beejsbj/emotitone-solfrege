<template>
  <section class="preview-port preview-port--compound-pattern-card">
    <div class="card pc-demo">
      <div class="label">PATTERN CARD · TWO SHAPES</div>

      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">

        <!-- Hero: sleek on top, expanded on bottom -->
        <div class="hero-stack">

          <!-- Shape 1: Sleek / inactive -->
          <button class="stack-card" type="button">
            <div class="sc-row">
              <span class="spine"></span>
              <span class="num">2I</span>
              <span class="nm">
                <span class="name">Glass Bell</span>
                <span class="sub">F&#x266F; DORIAN &middot; 96 BPM &middot; 8 BARS</span>
              </span>
              <span class="when">2d ago</span>
            </div>
            <!-- bar-tape as footer strip, under the content row -->
            <BarTape mode="equal" frame="flush" :segments="glassBellTape" />
          </button>

          <!-- Shape 2: Expanded / active -->
          <article class="active-card">
            <span class="spine"></span>
            <div class="active-inner">
              <!-- head row: num + name/sub + transport buttons -->
              <div class="active-head">
                <span class="num">I0</span>
                <div class="active-copy">
                  <div class="name">Brass Whistle</div>
                  <div class="sub">E LOCRIAN &middot; 120 BPM &middot; 8 BARS &middot; PIANO</div>
                </div>
                <div class="icon-row" aria-label="Pattern controls">
                  <!-- Play — icon-only square chip, geo-sharp, 32px sm -->
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

              <!-- code-strip in expanded shape only -->
              <CodeStrip class="active-code-strip" :tokens="brassWhistleCode" />

              <!-- transport foot -->
              <div class="active-foot">
                <span class="position">Bar 03 / 08 &middot; Steps 16/16</span>
                <span class="rec-tag brass">Rec armed</span>
              </div>
            </div>
          </article>
        </div>

        <!-- Right column: PRIMITIVES USED contract (COMPOUND layer) -->
        <div class="anatomy">
          <div class="row"><b>Bar-tape</b><span>primitive-bar-tape.html &mdash; strip footer in the sleek shape only</span></div>
          <div class="row"><b>Code-strip</b><span>unique-code-strip.html &mdash; strudel notation row in expanded shape only</span></div>
          <div class="row"><b>Buttons</b><span>primitive-buttons.html &mdash; icon-only geo-sharp 32px sm in transport rail</span></div>
          <div class="row"><b>Kicker</b><span>primitive-kicker.html &mdash; pattern num badge; typographic ordinal</span></div>
          <div class="row"><b>Card</b><span>primitive-card.html &mdash; ink-4 base panel; active shape adds ivory-3 border + drop shadow</span></div>
        </div>
      </div>

      <div class="section-head">Shapes</div>
      <div class="variants-full" style="grid-template-columns: repeat(2, 1fr)">

        <!-- Variant 1: Sleek / inactive -->
        <div>
          <button class="stack-card" type="button" style="cursor:default">
            <div class="sc-row">
              <span class="spine"></span>
              <span class="num">I2</span>
              <span class="nm">
                <span class="name">Late Night Tram</span>
                <span class="sub">A MINOR &middot; 72 BPM &middot; 16 BARS</span>
              </span>
              <span class="when">5h ago</span>
            </div>
            <BarTape mode="equal" frame="flush" :segments="lateNightTape" />
          </button>
          <div class="shape-label">Sleek &middot; inactive</div>
        </div>

        <!-- Variant 2: Expanded / active -->
        <div>
          <article class="active-card">
            <span class="spine" style="background:var(--tomato)"></span>
            <div class="active-inner">
              <div class="active-head">
                <span class="num">II</span>
                <div class="active-copy">
                  <div class="name">Hilbert Tape</div>
                  <div class="sub">D&#x266F; LYDIAN &middot; 132 BPM &middot; 4 BARS</div>
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

              <CodeStrip class="active-code-strip" :tokens="hilbertTapeCode" />

              <div class="active-foot">
                <span class="position">Bar 01 / 04 &middot; Steps 16/16</span>
                <span class="rec-tag brass">Rec armed</span>
              </div>
            </div>
          </article>
          <div class="shape-label">Expanded &middot; active</div>
        </div>

      </div>

      <div class="caption">Two shapes, one compound &mdash; sleek cards stack above the active expanded card. The sleek shape carries a bar-tape strip across its bottom edge; the expanded shape shows only the code-strip (strudel notation row) between the head and the transport foot. Promoting a sleek card expands it; the previous active card collapses into the stack.</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BarTape from "../../components/primatives/BarTape.vue";
import CodeStrip from "../../components/primatives/CodeStrip.vue";
import IconButton from "../../components/primatives/IconButton.vue";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";
import type { CodeStripToken } from "../../components/primatives/CodeStrip.vue";

const glassBellTape: BarTapeSegment[] = [
  { note: "re" },
  { note: "mi" },
  { note: "do" },
  { note: "fa" },
  { note: "re" },
  { note: "la" },
  { note: "mi" },
  { note: "ti" },
];

const lateNightTape: BarTapeSegment[] = [
  { note: "sol" },
  { note: "la" },
  { note: "ti" },
  { note: "sol" },
  { note: "la" },
  { note: "do" },
  { note: "re" },
  { note: "mi" },
];

const brassWhistleCode: CodeStripToken[] = [
  { type: "note", note: "mi", text: "Mi", duration: "@0.282" },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol", duration: "@0.128" },
  { type: "rest" },
  { type: "note", note: "la", text: "La", lit: true, duration: "@0.2031" },
  { type: "rest" },
  { type: "note", note: "ti", text: "Ti", duration: "@0.09" },
];

const hilbertTapeCode: CodeStripToken[] = [
  { type: "note", note: "fa", text: "Fa", duration: "@0.0398" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi", duration: "@0.09" },
  { type: "rest" },
  { type: "note", note: "re", text: "Re", lit: true, duration: "@0.3289" },
  { type: "rest" },
  { type: "note", note: "do", text: "Do" },
];
</script>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   PATTERN CARD — COMPOUND · TWO SHAPES
   Decomposed from compound-pattern-reel.html.
   Sleek: content row (spine + num + name/sub + timestamp) + bar-tape footer.
   Expanded: head row + code-strip + transport foot. No bar-tape footer.
   Active card always sits at bottom of the reel; sleek cards stack above.
   ===================================================================== */

/* ── shared token reset ─────────────────────────────────────────────── */
.pc-demo * { box-sizing: border-box; }
.pc-demo { color: var(--ivory); }

/* ── SHAPE 1: SLEEK (stack-card) ────────────────────────────────────── */
/* Lifted verbatim from compound-pattern-reel.html .stack-card */
.stack-card {
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
  transition:
    transform var(--dur-panel) var(--ease-swing),
    opacity var(--dur-panel) var(--ease-brush),
    border-color var(--dur-ui) var(--ease-brush),
    background var(--dur-ui) var(--ease-brush);
}

.stack-card:hover,
.stack-card:focus-visible {
  transform: translateY(-6px) rotate(0deg) scale(1);
  opacity: 1;
  border-color: var(--ink-5);
  background: var(--ink-4);
  outline: none;
}

/* content row inside sleek card */
.stack-card .sc-row {
  display: grid;
  grid-template-columns: 4px 56px minmax(0, 1fr) 74px;
  align-items: center;
  gap: var(--s-5);
  padding: 0 14px 0 0;
  height: 50px;
}

.stack-card .spine {
  align-self: stretch;
  display: block;
  background: var(--tomato);
}

.stack-card .num {
  font: var(--t-display-m);
  line-height: 0.9;
  color: var(--ivory-4);
  text-align: center;
  text-transform: uppercase;
}

.stack-card .nm {
  min-width: 0;
}

.stack-card .name {
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

.stack-card .sub {
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

.stack-card .when {
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-3);
  text-align: right;
}

/* ── SHAPE 2: EXPANDED (active-card) ─────────────────────────────────── */
/* Lifted verbatim from compound-pattern-reel.html .active-card */
.active-card {
  position: relative;
  border: 1px solid var(--ivory-3);
  background: var(--ink-4);
  box-shadow: var(--ring), 0 8px 0 var(--ink);
  display: flex;
  flex-direction: column;
}

.active-card .spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--tomato);
  display: block;
}

/* inner content area (spine excluded) */
.active-inner {
  padding: 18px 18px 16px 22px;
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.active-head {
  display: flex;
  align-items: center;
  gap: var(--s-6);
}

.active-card .num {
  font: var(--t-display-l);
  line-height: 0.9;
  color: var(--ivory-3);
  text-transform: uppercase;
}

.active-copy {
  flex: 1;
  min-width: 0;
}

.active-card .name {
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

.active-card .sub {
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
.icon-row {
  display: flex;
  gap: var(--s-3);
}

/* transport foot */
.active-foot {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  border-top: 1px solid var(--hairline);
  padding-top: var(--s-5);
}

.position {
  font: var(--t-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ivory-3);
}

.rec-tag {
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

.rec-tag::before {
  content: "";
  width: 8px;
  height: 8px;
  background: var(--brass-edge);
}

/* code-strip inside expanded card: flush to inner padding edges */
.active-code-strip {
  border-left: 0;
  border-right: 0;
  margin-left: -22px;
  margin-right: -18px;
  padding-left: 22px;
  padding-right: 18px;
}

/* ── hero stack: sleek on top, expanded on bottom ──────────────────── */
.hero-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── variants side-by-side ──────────────────────────────────────────── */
.shape-label {
  margin-top: 8px;
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  text-align: center;
}

/* ── grammar CSS (from SKILL.md — verbatim) ─────────────────────────── */
.section-head {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin: 24px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
}
.section-head:first-child { margin-top: 6px; }

.anatomy-wrap {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-top: 8px;
}

.anatomy {
  display: grid;
  align-content: start;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-3);
}
.anatomy .row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--ink-5);
}
.anatomy .row:last-child { border-bottom: 0; }
.anatomy .row b { color: var(--ivory); font-weight: 700; }

.variants-full {
  display: grid;
  gap: 12px;
}

/* ── reduced-motion guard ───────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .stack-card,
  .active-card {
    transition-duration: 0ms;
    animation: none;
  }
}
</style>
