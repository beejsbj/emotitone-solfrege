<template>
  <section class="preview-port preview-port--primitive-beat-indicator">
    <div class="card">
    
      <div class="label">Beat Indicator · primitive</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="stage">
          <div class="beats n4">
            <b></b><b></b><b></b><b></b>
          </div>
          <div class="lbl">4/4 · 120 BPM</div>
        </div>
        <div class="anatomy">
          <div class="row"><b>Cell</b><div>18px sq · 1px hairline border · transparent rest</div></div>
          <div class="row"><b>Lit</b><div>ivory fill · 18% of loop · keyframe beat-cell</div></div>
          <div class="row"><b>Downbeat</b><div>brass fill + glow on (1) · keyframe beat-down</div></div>
          <div class="row"><b>Loop</b><div>--rate · steps(1) · stagger = rate / N</div></div>
          <div class="row"><b>Default</b><div>2s loop = 4-beat bar at 120 BPM</div></div>
          <div class="row"><b>Reduced</b><div>downbeat held lit · cells static</div></div>
        </div>
      </div>
    
      <div class="section-head">Variants</div>
      <div class="variants-full">
    
        <div class="v">
          <div class="beats n4"><b></b><b></b><b></b><b></b></div>
          <div class="tag">4/4 standard</div>
        </div>
    
        <div class="v">
          <div class="beats n3"><b></b><b></b><b></b></div>
          <div class="tag">3/4 waltz</div>
        </div>
    
        <div class="v">
          <div class="beats n2"><b></b><b></b></div>
          <div class="tag">2/4 march</div>
        </div>
    
        <div class="v">
          <div class="beats n6"><b></b><b></b><b></b><b></b><b></b><b></b></div>
          <div class="tag">6/8 compound</div>
        </div>
    
        <div class="v">
          <div class="beats n4 sm"><b></b><b></b><b></b><b></b></div>
          <div class="tag">small · 12px</div>
        </div>
    
        <div class="v">
          <div class="beats n4 lg"><b></b><b></b><b></b><b></b></div>
          <div class="tag">large · 28px</div>
        </div>
    
        <div class="v">
          <div class="beats n4 even"><b></b><b></b><b></b><b></b></div>
          <div class="tag">even · no downbeat</div>
        </div>
    
        <div class="v">
          <div class="beats n4 static"><b></b><b></b><b></b><b></b></div>
          <div class="tag">static · idle</div>
        </div>
    
      </div>
    
      <div class="caption">
        The chrome's metronome — N cells in a row, each strobing ivory on its beat; the downbeat strobes brass. One indicator per panel. Borrowed by knobs, panel headers, and brand marks wherever the chrome needs to feel the kick.
      </div>
    
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   BEAT INDICATOR — chrome that ticks the bar.
   N cells in a row · each cell strobes ivory on its beat · downbeat (1)
   strobes brass. Keyframes `beat-cell` and `beat-down` live in
   colors_and_type.css (hoisted Phase 8 Wave 1). This card consumes them.
   ===================================================================== */

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
  grid-template-columns: 78px 1fr;
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

/* ── hero stage ───────────────────────────────────────────── */
.stage {
  background: #0a0908;
  border: 1px solid var(--hairline);
  padding: 28px 22px 22px;
  display: flex; flex-direction: column; gap: 14px;
  align-items: center; justify-content: center;
}
.stage .lbl {
  font-family: var(--font-display); font-weight: 700;
  font-size: 13px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--ivory-2);
}

/* ── the beat-indicator primitive ─────────────────────────
   `beats` is the row; each `<b>` is one cell.
   `--cell` (size) and `--rate` (full-loop duration) are knobs.
   By default: 18px cell, 2s loop (4-beat bar at 120bpm).
   Lift from mot-primitives-beat-pulse.html — keyframes already
   in colors_and_type.css. ─────────────────────────────────── */
.beats {
  --cell: 18px;
  --rate: 2s;
  display: flex; gap: 8px; align-items: center;
}
.beats b {
  width: var(--cell); height: var(--cell);
  border: 1px solid var(--hairline);
  background: transparent;
  animation: beat-cell var(--rate) steps(1) infinite;
}
/* 4-cell default stagger */
.beats.n4 b:nth-child(1) { animation-delay: calc(var(--rate) * 0/4); animation-name: beat-down; }
.beats.n4 b:nth-child(2) { animation-delay: calc(var(--rate) * 1/4); }
.beats.n4 b:nth-child(3) { animation-delay: calc(var(--rate) * 2/4); }
.beats.n4 b:nth-child(4) { animation-delay: calc(var(--rate) * 3/4); }
/* 3-cell stagger (waltz) */
.beats.n3 b:nth-child(1) { animation-delay: calc(var(--rate) * 0/3); animation-name: beat-down; }
.beats.n3 b:nth-child(2) { animation-delay: calc(var(--rate) * 1/3); }
.beats.n3 b:nth-child(3) { animation-delay: calc(var(--rate) * 2/3); }
/* 2-cell stagger (march) */
.beats.n2 b:nth-child(1) { animation-delay: calc(var(--rate) * 0/2); animation-name: beat-down; }
.beats.n2 b:nth-child(2) { animation-delay: calc(var(--rate) * 1/2); }
/* 6-cell stagger (compound) */
.beats.n6 b:nth-child(1) { animation-delay: calc(var(--rate) * 0/6); animation-name: beat-down; }
.beats.n6 b:nth-child(2) { animation-delay: calc(var(--rate) * 1/6); }
.beats.n6 b:nth-child(3) { animation-delay: calc(var(--rate) * 2/6); }
.beats.n6 b:nth-child(4) { animation-delay: calc(var(--rate) * 3/6); }
.beats.n6 b:nth-child(5) { animation-delay: calc(var(--rate) * 4/6); }
.beats.n6 b:nth-child(6) { animation-delay: calc(var(--rate) * 5/6); }
/* even mode — no brass downbeat */
.beats.even b:nth-child(1) { animation-name: beat-cell !important; }
/* static (loading / off) */
.beats.static b { animation: none; }
.beats.static b:nth-child(1) { background: var(--brass); border-color: var(--brass); }

/* ── variant cells ──────────────────────────────────────── */
.variants-full {
  grid-template-columns: repeat(4, 1fr);
}
.v {
  background: #0a0908;
  border: 1px solid var(--hairline);
  padding: 18px 14px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  min-height: 88px;
  justify-content: center;
}
.v .tag {
  font-family: var(--font-mono);
  font-size: 9px; letter-spacing: .18em;
  text-transform: uppercase; color: var(--ivory-3);
}

/* size variants */
.beats.sm { --cell: 12px; gap: 6px; }
.beats.lg { --cell: 28px; gap: 12px; }

/* tempo variants */
.beats.t90  { --rate: 2.667s; }   /* 90bpm 4/4 */
.beats.t140 { --rate: 1.714s; }   /* 140bpm 4/4 */

@media (prefers-reduced-motion: reduce) {
  .beats b { animation: none !important; }
  .beats b:nth-child(1) { background: var(--brass); border-color: var(--brass); }
}
</style>
