<template>
  <section class="preview-port preview-port--primitive-bar-tape">
    <div class="card">
      <div class="label">BAR TAPE · CHROMATIC 7-SEGMENT</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <!-- hero: bar-tape embedded under a panel header, in situ -->
        <div class="hero-panel">
          <div class="hero-head">
            <span class="title">Piano</span>
            <span class="meta">C Major · 4/4 · Live</span>
          </div>
          <div class="bar-tape major live" style="position:relative">
            <span class="do"></span>
            <span class="re"></span>
            <span class="mi"></span>
            <span class="fa"></span>
            <span class="sol"></span>
            <span class="la"></span>
            <span class="ti"></span>
            <span class="ph" style="left:18%"></span>
          </div>
          <div class="hero-ticks">
            <span></span><span></span><span></span><span></span>
            <span></span><span></span><span></span><span></span>
          </div>
        </div>
    
        <!-- anatomy spec table -->
        <div class="anatomy">
          <div class="row"><b>Panel</b><div>ink bg · 1px hairline</div></div>
          <div class="row"><b>Height</b><div>8px default · 4px thin · 16px tall</div></div>
          <div class="row"><b>Segments</b><div>7 spans · one per diatonic seat</div></div>
          <div class="row"><b>Color</b><div>--note-do … --note-ti per seat</div></div>
          <div class="row"><b>Width</b><div>major: 2-2-1-2-2-2-1 flex ratio</div></div>
          <div class="row"><b>Equal</b><div>uniform flex:1 per segment</div></div>
          <div class="row"><b>Playhead</b><div>2px ivory · glow 6px · absolute</div></div>
          <div class="row"><b>Downbeat</b><div>--brass + --shadow-glow-brass on seg</div></div>
          <div class="row"><b>Dim</b><div>opacity 0.18 on unplayed segments</div></div>
          <div class="row"><b>Tilt</b><div>none — strip sits flush, no rotation</div></div>
        </div>
      </div>
    
      <div class="section-head">Variants</div>
      <div class="variants-full" style="grid-template-columns:repeat(3,1fr)">
    
        <!-- 1. Major proportions, rest state -->
        <div class="var-cell">
          <div class="var-name">01 · Major proportions</div>
          <div class="bar-tape major">
            <span class="do"></span><span class="re"></span><span class="mi"></span>
            <span class="fa"></span><span class="sol"></span><span class="la"></span><span class="ti"></span>
          </div>
          <div class="var-label">2-2-1-2-2-2-1 ratio · rest state</div>
        </div>
    
        <!-- 2. Equal segments -->
        <div class="var-cell">
          <div class="var-name">02 · Equal segments</div>
          <div class="bar-tape equal">
            <span class="do"></span><span class="re"></span><span class="mi"></span>
            <span class="fa"></span><span class="sol"></span><span class="la"></span><span class="ti"></span>
          </div>
          <div class="var-label">Uniform flex · grid-mode</div>
        </div>
    
        <!-- 3. Playhead live -->
        <div class="var-cell">
          <div class="var-name">03 · Playhead live</div>
          <div class="bar-tape equal live" style="position:relative">
            <span class="do"></span><span class="re"></span><span class="mi"></span>
            <span class="fa"></span><span class="sol"></span><span class="la"></span><span class="ti"></span>
            <span class="ph" style="left:34%"></span>
          </div>
          <div class="var-label">2px ivory · glow · current position</div>
        </div>
    
        <!-- 4. Sparse playback: some lit, some dim -->
        <div class="var-cell">
          <div class="var-name">04 · Sparse playback</div>
          <div class="bar-tape equal">
            <span class="do"></span>
            <span class="re dim"></span>
            <span class="mi"></span>
            <span class="fa dim"></span>
            <span class="sol"></span>
            <span class="la dim"></span>
            <span class="ti dim"></span>
          </div>
          <div class="var-label">Played lit · unplayed dim 18%</div>
        </div>
    
        <!-- 5. Downbeat brass-lit signal -->
        <div class="var-cell">
          <div class="var-name">05 · Downbeat brass</div>
          <div class="bar-tape major">
            <span class="do downbeat"></span>
            <span class="re dim"></span><span class="mi dim"></span>
            <span class="fa dim"></span><span class="sol dim"></span>
            <span class="la dim"></span><span class="ti dim"></span>
          </div>
          <div class="var-label">Do = brass · one lit signal max</div>
        </div>
    
        <!-- 6. Tall: 16px hero strip -->
        <div class="var-cell">
          <div class="var-name">06 · Tall · 16px</div>
          <div class="bar-tape major tall">
            <span class="do"></span><span class="re"></span><span class="mi"></span>
            <span class="fa"></span><span class="sol"></span><span class="la"></span><span class="ti"></span>
          </div>
          <div class="var-label">Section anchor · hero strip scale</div>
        </div>
    
        <!-- 7. Thin: 4px meta row -->
        <div class="var-cell">
          <div class="var-name">07 · Thin · 4px</div>
          <div class="bar-tape major thin">
            <span class="do"></span><span class="re"></span><span class="mi"></span>
            <span class="fa"></span><span class="sol"></span><span class="la"></span><span class="ti"></span>
          </div>
          <div class="var-label">Under a meta row · beat-grid inline</div>
        </div>
    
        <!-- 8. Single segment focus: only Fa shows, rest ink -->
        <div class="var-cell">
          <div class="var-name">08 · Single focus · Fa</div>
          <div class="bar-tape equal">
            <span class="do dim"></span><span class="re dim"></span><span class="mi dim"></span>
            <span class="fa"></span>
            <span class="sol dim"></span><span class="la dim"></span><span class="ti dim"></span>
          </div>
          <div class="var-label">Scale-degree spotlight state</div>
        </div>
    
        <!-- 9. Full diatonic row with major + live playhead -->
        <div class="var-cell">
          <div class="var-name">09 · In context · under header</div>
          <div class="hero-panel" style="margin-top:0">
            <div class="hero-head" style="padding:8px 10px 6px">
              <span class="title" style="font-size:11px;padding:2px 7px 2px">Synth</span>
              <span class="meta" style="font-size:9px">D Dorian</span>
            </div>
            <div class="bar-tape major live" style="position:relative">
              <span class="do"></span><span class="re"></span><span class="mi"></span>
              <span class="fa"></span><span class="sol"></span><span class="la"></span><span class="ti"></span>
              <span class="ph" style="left:52%"></span>
            </div>
          </div>
          <div class="var-label">Flush to panel bottom · situ reference</div>
        </div>
    
      </div>
    
      <div class="caption">
        The 7 segments map diatonic seats of the current mode — segment widths follow the interval pattern.
        Sits flush beneath a panel header. The single edge where UI chrome and chromatic music color share a line.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   BAR TAPE — chromatic 7-segment diatonic strip.
   Sits flush beneath a panel header. The single place where
   UI chrome and chromatic music color share a line.
   Note segments use --note-* (music feedback); chrome stays ink/ivory.
   ===================================================================== */

/* ── core primitive ─────────────────────────────────────────────────── */
.bar-tape {
  height: 8px;
  display: flex;
  border: 1px solid var(--hairline);
  background: var(--ink);
  overflow: hidden;
}
.bar-tape span {
  display: block;
  height: 100%;
  flex: 1;
}
.bar-tape .do  { background: var(--note-do); }
.bar-tape .re  { background: var(--note-re); }
.bar-tape .mi  { background: var(--note-mi); }
.bar-tape .fa  { background: var(--note-fa); }
.bar-tape .sol { background: var(--note-sol); }
.bar-tape .la  { background: var(--note-la); }
.bar-tape .ti  { background: var(--note-ti); }

/* size variants */
.bar-tape.tall { height: 16px; }
.bar-tape.thin { height: 4px; }

/* segmentation: major-scale proportions (2-2-1-2-2-2-1) */
.bar-tape.major .do  { flex: 16; }
.bar-tape.major .re  { flex: 16; }
.bar-tape.major .mi  { flex: 16; }
.bar-tape.major .fa  { flex: 8;  }
.bar-tape.major .sol { flex: 16; }
.bar-tape.major .la  { flex: 16; }
.bar-tape.major .ti  { flex: 8;  }

/* segmentation: equal */
.bar-tape.equal span { flex: 1; }

/* sparse-playback: dim unplayed segments */
.bar-tape span.dim { opacity: 0.18; }

/* playhead */
.bar-tape.live { position: relative; }
.bar-tape .ph {
  position: absolute; top: -3px; bottom: -3px;
  width: 2px;
  background: var(--ivory);
  box-shadow: 0 0 6px rgba(244,239,230,.6);
  flex: 0 0 auto;
  pointer-events: none;
}

/* downbeat brass-lit segment */
.bar-tape span.downbeat {
  background: var(--brass);
  box-shadow: var(--shadow-glow-brass);
}

/* ── shared grammar ─────────────────────────────────────────────────── */
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

/* ── hero panel ─────────────────────────────────────────────────────── */
.hero-panel {
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
  padding: 0;
}
.hero-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 12px 14px 10px;
}
.hero-head .title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ivory);
  border: 1px solid var(--ink-5);
  padding: 4px 9px 3px;
}
.hero-head .meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--ivory-3);
  text-transform: uppercase;
}
.hero-ticks {
  display: flex;
  height: 6px;
  align-items: stretch;
  border: 1px solid var(--hairline);
  border-top: 0;
}
.hero-ticks span {
  flex: 1;
  border-right: 1px solid var(--hairline);
}
.hero-ticks span:last-child { border-right: 0; }

/* ── variant cells ──────────────────────────────────────────────────── */
.var-cell {
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
  padding: 12px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.var-cell .var-name {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin-bottom: 2px;
}
.var-cell .var-label {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-3);
  margin-top: 4px;
}
</style>
