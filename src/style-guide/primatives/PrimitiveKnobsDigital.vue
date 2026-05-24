<template>
  <section class="preview-port preview-port--primitive-knobs-digital">
    <div class="card">
      <div class="label">KNOBS · DIGITAL · ARC</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="knob-hero">
          <div class="knob knob--arc knob--range is-hero">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path class="trk bg" d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"/>
              <path class="trk brass" pathLength="100"
                    d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"
                    stroke-dasharray="58 100"/>
            </svg>
            <div class="center"><span class="num is-lit">64</span></div>
          </div>
        </div>
        <div class="anatomy">
          <div class="row"><b>Visual</b><span>Arc — flat SVG sweep, 270deg, butt caps</span></div>
          <div class="row"><b>Track</b><span>ivory @ .18 opacity · 2px bg stroke</span></div>
          <div class="row"><b>Value</b><span>brass 8px stroke · drop-shadow glow when lit</span></div>
          <div class="row"><b>Center</b><span>Jazz display · ivory rest · brass-hi when lit</span></div>
          <div class="row"><b>Roles</b><span>range · boolean · options · button</span></div>
          <div class="row"><b>Signal</b><span>one brass mark only — value arc or ball</span></div>
          <div class="row"><b>Motion</b><span>button segment spins beat×5 · stops reduced-motion</span></div>
        </div>
      </div>
    
      <div class="section-head">Variants — with brass</div>
      <div class="variants-full grid-4">
    
        <!-- Range: continuous 0–127, value marks how far the sweep has gone -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Range</span></div>
          <div class="knob knob--arc knob--range">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path class="trk bg" d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"/>
              <path class="trk brass" pathLength="100"
                    d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"
                    stroke-dasharray="58 100"/>
            </svg>
            <div class="center"><span class="num is-lit">64</span></div>
          </div>
          <div class="knob-foot">Volume</div>
        </div>
    
        <!-- Boolean: lit = on (full arc + brass ball); rest = no arc -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Boolean</span></div>
          <div class="knob knob--arc knob--boolean is-lit">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path class="trk brass" pathLength="100"
                    d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"
                    stroke-dasharray="80 100"/>
            </svg>
            <span class="ball is-lit"></span>
          </div>
          <div class="knob-foot">Sync</div>
        </div>
    
        <!-- Options: full 360 circle, discrete ivory segments; active segment brass-lit -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Options</span></div>
          <div class="knob knob--arc knob--options">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="trk bg" cx="50" cy="50" r="42" pathLength="100"/>
              <g transform="rotate(-90 50 50)">
                <circle class="trk val" cx="50" cy="50" r="42" pathLength="100"
                        stroke-dasharray="12.5 87.5" stroke-dashoffset="6.25"/>
                <circle class="trk val" cx="50" cy="50" r="42" pathLength="100"
                        stroke-dasharray="12.5 87.5" stroke-dashoffset="-43.75"/>
              </g>
            </svg>
            <div class="center"><span class="num">SQ</span></div>
          </div>
          <div class="knob-foot">Wave</div>
        </div>
    
        <!-- Button: spinning brass segment; tap fires action, hold arms repeat -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Button</span></div>
          <div class="knob knob--arc knob--button">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="trk bg" cx="50" cy="50" r="42"/>
              <g class="seg-rotate">
                <g transform="rotate(-90 50 50)">
                  <circle class="trk brass" cx="50" cy="50" r="42" pathLength="100"
                          stroke-dasharray="25 75" stroke-dashoffset="12.5"/>
                </g>
              </g>
            </svg>
            <div class="center">
              <span class="glyph">
                <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="2.2" fill="currentColor"/>
                  <path d="M3.5 8a4.5 4.5 0 0 1 9 0M2 8a6 6 0 0 1 12 0"
                        fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="butt"/>
                </svg>
              </span>
            </div>
          </div>
          <div class="knob-foot">Live</div>
        </div>
    
      </div>
    
      <div class="section-head">Variants — without brass (ivory only)</div>
      <div class="variants-full grid-4">
    
        <!-- Range: ivory arc indicator -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Range</span></div>
          <div class="knob knob--arc knob--range">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path class="trk bg" d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"/>
              <path class="trk ivory-only" pathLength="100"
                    d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"
                    stroke-dasharray="58 100"/>
            </svg>
            <div class="center"><span class="num">64</span></div>
          </div>
          <div class="knob-foot">Volume</div>
        </div>
    
        <!-- Boolean: full ivory arc when on -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Boolean</span></div>
          <div class="knob knob--arc knob--boolean">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path class="trk ivory-only" pathLength="100"
                    d="M 25.31 83.98 A 42 42 0 1 1 74.69 83.98"
                    stroke-dasharray="80 100"/>
            </svg>
          </div>
          <div class="knob-foot">Sync</div>
        </div>
    
        <!-- Options: all segments ivory (no brass accent) -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Options</span></div>
          <div class="knob knob--arc knob--options">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="trk bg" cx="50" cy="50" r="42" pathLength="100"/>
              <g transform="rotate(-90 50 50)">
                <circle class="trk ivory-only" cx="50" cy="50" r="42" pathLength="100"
                        stroke-dasharray="12.5 87.5" stroke-dashoffset="6.25"/>
                <circle class="trk ivory-only" cx="50" cy="50" r="42" pathLength="100"
                        stroke-dasharray="12.5 87.5" stroke-dashoffset="-43.75"/>
              </g>
            </svg>
            <div class="center"><span class="num">SQ</span></div>
          </div>
          <div class="knob-foot">Wave</div>
        </div>
    
        <!-- Button: spinning ivory segment -->
        <div class="knob-tile">
          <div class="knob-label">Arc<span>Button</span></div>
          <div class="knob knob--arc knob--button">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="trk bg" cx="50" cy="50" r="42"/>
              <g class="seg-rotate">
                <g transform="rotate(-90 50 50)">
                  <circle class="trk ivory-only" cx="50" cy="50" r="42" pathLength="100"
                          stroke-dasharray="25 75" stroke-dashoffset="12.5"/>
                </g>
              </g>
            </svg>
            <div class="center">
              <span class="glyph">
                <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="2.2" fill="currentColor"/>
                  <path d="M3.5 8a4.5 4.5 0 0 1 9 0M2 8a6 6 0 0 1 12 0"
                        fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="butt"/>
                </svg>
              </span>
            </div>
          </div>
          <div class="knob-foot">Live</div>
        </div>
    
      </div>
    
      <div class="caption" style="margin-top:14px">
        Digital knobs are flat arc indicators — SVG sweep on a dark field, butt caps, one brass signal on the active value only.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   KNOBS · DIGITAL (ARC) — flat SVG arc family
   Visual type: arc — 270deg sweep, butt caps, hand-cut flat indicator.
   Four functional roles: range · boolean · options · button.
   ===================================================================== */

/* ── Shared grammar (specimen-card-grammar) ───────────────────────── */
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

/* ── Specimen surfaces ───────────────────────────────────────────── */
.knob-hero,
.knob-tile {
  background: var(--ink);
  border: 1px solid var(--hairline);
  box-shadow: var(--ring);
}

.knob-hero {
  min-height: 204px;
  display: grid;
  place-items: center;
  padding: 26px 16px 22px;
  box-sizing: border-box;
  transform: rotate(-0.18deg);
}

/* ── Variants grid: 4 cols for four functional roles ─────────────── */
.variants-full.grid-4 {
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.knob-tile {
  min-height: 132px;
  padding: 8px 5px 7px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  align-items: center;
  gap: 5px;
  box-sizing: border-box;
}

/* Tilts — hand-cut feel */
.variants-full.grid-4 .knob-tile:nth-child(1) { transform: rotate(-0.35deg); }
.variants-full.grid-4 .knob-tile:nth-child(2) { transform: rotate( 0.22deg); }
.variants-full.grid-4 .knob-tile:nth-child(3) { transform: rotate(-0.18deg); }
.variants-full.grid-4 .knob-tile:nth-child(4) { transform: rotate( 0.34deg); }

.knob-label,
.knob-foot {
  width: 100%;
  font-family: var(--font-mono);
  text-transform: uppercase;
  text-align: center;
}
.knob-label {
  min-height: 24px;
  padding: 0 4px 5px;
  border-bottom: 1px solid var(--hairline);
  color: var(--ivory-3);
  font-weight: 600;
  font-size: 8px;
  line-height: 1.25;
  letter-spacing: 0.12em;
  box-sizing: border-box;
}
.knob-label span {
  display: block;
  color: var(--ivory-4);
  font-weight: 500;
}

.knob-foot {
  min-height: 18px;
  color: var(--ivory-4);
  font-size: 8px;
  line-height: 1.2;
  letter-spacing: 0.08em;
}

/* ── Base knob ──────────────────────────────────────────────────── */
.knob {
  position: relative;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
}
.knob.is-hero {
  width: 128px;
  height: 128px;
}
.knob.is-sm {
  width: 28px;
  height: 28px;
}

.knob .center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: var(--ivory);
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1;
}
.knob .num {
  font-size: 20px;
  letter-spacing: var(--tracking-display);
}
.knob.is-hero .num { font-size: 36px; }
.knob.is-sm .num   { font-size: 9px; }
.knob .num.is-lit  { color: var(--brass-hi); }

.knob .glyph {
  display: grid;
  place-items: center;
  color: var(--brass-hi);
}

/* ── Arc family — angular SVG arc ───────────────────────────────── */
.knob--arc svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.trk {
  fill: none;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}
.trk.bg {
  stroke: var(--ivory);
  stroke-opacity: .18;
  stroke-width: 2;
}
.trk.val {
  stroke: var(--ivory);
  stroke-width: 8;
}
.trk.brass {
  stroke: var(--brass);
  stroke-width: 8;
  filter: drop-shadow(0 0 6px rgba(224,169,58,.55));
}

.trk.ivory-only {
  stroke: var(--ivory);
  stroke-width: 8;
}

/* Brass wire treatment — lit arc outline, not fill */
.knob--arc.is-brass-wire .trk.bg {
  stroke: var(--brass);
  stroke-opacity: .35;
  stroke-width: 3;
}
.knob--arc.is-brass-wire .trk.brass {
  stroke: var(--brass-hi);
  stroke-width: 3;
  filter: drop-shadow(0 0 5px var(--brass));
}
.knob--arc.is-brass-wire .num { color: var(--brass-hi); }

/* Brass ball — center-lit state */
.ball {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.ball.is-lit {
  width: 24px;
  height: 24px;
  background: var(--brass-fill);
  box-shadow: 0 0 12px var(--brass);
}
.knob.is-hero .ball.is-lit {
  width: 40px;
  height: 40px;
}

/* Played / self-glow state — uses the canonical --shadow-glow-brass token */
.knob.is-played .knob--arc {
  box-shadow: var(--shadow-glow-brass);
  border-radius: 50%;
}
.knob.is-played .knob--arc svg .trk.brass {
  filter: drop-shadow(0 0 10px var(--brass)) drop-shadow(0 0 22px var(--brass));
}

/* Disabled */
.knob.is-disabled {
  filter: saturate(0.1) brightness(0.55);
  pointer-events: none;
}

/* Rotating segment for button role */
@keyframes spin360 { to { transform: rotate(360deg); } }
.seg-rotate {
  transform-origin: 50% 50%;
  animation: spin360 calc(var(--beat) * 5) var(--ease-sustain) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .seg-rotate { animation: none; }
}
</style>
