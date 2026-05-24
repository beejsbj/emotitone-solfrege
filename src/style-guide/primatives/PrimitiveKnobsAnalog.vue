<template>
  <section class="preview-port preview-port--primitive-knobs-analog">
    <div class="card">
      <div class="label">KNOBS · ANALOG · RING</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="knob-hero">
          <div class="knob knob--ring knob--range is-hero is-lit">
            <div class="ring"><span class="v is-lit">64</span></div>
          </div>
        </div>
        <div class="anatomy">
          <div class="row"><b>Visual</b><span>Ring — radial-gradient dome body, seated</span></div>
          <div class="row"><b>Body</b><span>ink-4→ink-2 radial dome · 1px ink-5 border</span></div>
          <div class="row"><b>Sweep</b><span>conic-gradient masked to annular band at inset 5px</span></div>
          <div class="row"><b>Value</b><span>brass sweep + drop-shadow when lit · ivory-3 at rest</span></div>
          <div class="row"><b>Center</b><span>Jazz display · ivory rest · brass-hi when lit</span></div>
          <div class="row"><b>Roles</b><span>range · boolean · options · button</span></div>
          <div class="row"><b>Motion</b><span>button sweep spins beat×5 · stops reduced-motion</span></div>
        </div>
      </div>
    
      <div class="section-head">Variants — functional role</div>
      <div class="variants-full grid-4">
    
        <!-- Range: continuous sweep from bottom-left; brass marks current value -->
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Range</span></div>
          <div class="knob knob--ring knob--range is-lit">
            <div class="ring"><span class="v is-lit">64</span></div>
          </div>
          <div class="knob-foot">Volume</div>
        </div>
    
        <!-- Boolean: full ring lit when on; dark ring when off -->
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Boolean</span></div>
          <div class="knob knob--ring knob--boolean is-lit">
            <div class="ring"><span class="v is-lit">ON</span></div>
          </div>
          <div class="knob-foot">Sync</div>
        </div>
    
        <!-- Options: four discrete segments; active segment brass-lit -->
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Options</span></div>
          <div class="knob knob--ring knob--options">
            <div class="ring"><span class="v is-small">SQ</span></div>
          </div>
          <div class="knob-foot">Wave</div>
        </div>
    
        <!-- Button: spinning brass quarter-arc; tap fires, hold arms repeat -->
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Button</span></div>
          <div class="knob knob--ring knob--button">
            <div class="ring"><span class="v is-lit is-small">REC</span></div>
          </div>
          <div class="knob-foot">Live</div>
        </div>
    
      </div>
    
      <div class="section-head">Variants &mdash; without brass (ivory only)</div>
      <div class="variants-full grid-4">
    
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Range &middot; non-brass</span></div>
          <div class="knob knob--ring knob--range is-nobrass">
            <div class="ring"><span class="v is-lit">64</span></div>
          </div>
          <div class="knob-foot">Volume</div>
        </div>
    
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Boolean &middot; non-brass</span></div>
          <div class="knob knob--ring knob--boolean is-nobrass">
            <div class="ring"><span class="v is-lit">ON</span></div>
          </div>
          <div class="knob-foot">Sync</div>
        </div>
    
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Options &middot; non-brass</span></div>
          <div class="knob knob--ring knob--options is-nobrass">
            <div class="ring"><span class="v is-small">SQ</span></div>
          </div>
          <div class="knob-foot">Wave</div>
        </div>
    
        <div class="knob-tile">
          <div class="knob-label">Ring<span>Button &middot; non-brass</span></div>
          <div class="knob knob--ring knob--button is-nobrass">
            <div class="ring"><span class="v is-lit is-small">REC</span></div>
          </div>
          <div class="knob-foot">Live</div>
        </div>
    
      </div>
    
      <div class="caption" style="margin-top:14px">
        Analog knobs are seated ring indicators — radial dome body with a conic sweep masked to the annular band; brass marks only the lit value.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   KNOBS · ANALOG (RING) — conic seated-ring family
   Visual type: ring — radial-gradient dome body + conic mask sweep.
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
  transform: rotate(0.22deg);
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
.variants-full.grid-4 .knob-tile:nth-child(1) { transform: rotate( 0.18deg); }
.variants-full.grid-4 .knob-tile:nth-child(2) { transform: rotate(-0.28deg); }
.variants-full.grid-4 .knob-tile:nth-child(3) { transform: rotate( 0.30deg); }
.variants-full.grid-4 .knob-tile:nth-child(4) { transform: rotate(-0.16deg); }

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

/* ── Ring family — conic-gradient seated dome ───────────────────── */
.knob--ring .ring {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, var(--ink-4) 0%, var(--ink-2) 70%);
  border: 1px solid var(--ink-5);
  position: relative;
  display: grid;
  place-items: center;
}
.knob.is-hero.knob--ring .ring {
  width: 98px;
  height: 98px;
}
.knob--ring .ring::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  -webkit-mask: radial-gradient(circle, transparent 60%, var(--ink) 61%);
          mask: radial-gradient(circle, transparent 60%, var(--ink) 61%);
}

/* Range — ivory-3 sweep from bottom-left, 270deg max */
.knob--ring.knob--range .ring::before {
  background: conic-gradient(
    from -135deg,
    var(--ivory-3) 0%, var(--ivory-3) 64%,
    transparent 64%, transparent 100%);
}
/* Range hero — brass-lit value position */
.knob--ring.knob--range.is-lit .ring::before {
  background: conic-gradient(
    from -135deg,
    var(--brass) 0%, var(--brass) 64%,
    transparent 64%, transparent 100%);
  filter: drop-shadow(0 0 6px var(--brass));
}

/* Boolean — full 270deg ring when on, dark when off */
.knob--ring.knob--boolean.is-lit .ring::before {
  background: conic-gradient(var(--brass) 0% 75%, transparent 75% 100%);
  filter: drop-shadow(0 0 6px var(--brass));
}
.knob--ring.knob--boolean.is-rest .ring::before {
  background: conic-gradient(transparent 0% 100%);
}

/* Options — four discrete ivory segments; active segment brass-lit */
.knob--ring.knob--options .ring::before {
  background: conic-gradient(
    from -135deg,
    var(--brass) 0% 18.75%,
    transparent 18.75% 25%,
    var(--ivory-3) 25% 43.75%,
    transparent 43.75% 50%,
    var(--ivory-3) 50% 68.75%,
    transparent 68.75% 75%,
    var(--ivory-3) 75% 93.75%,
    transparent 93.75% 100%);
}

/* Button — spinning quarter-arc; tap fires, hold arms repeat */
@keyframes spin360 { to { transform: rotate(360deg); } }
.knob--ring.knob--button .ring::before {
  background: conic-gradient(var(--brass) 0% 25%, transparent 25% 100%);
  filter: drop-shadow(0 0 6px var(--brass));
  animation: spin360 calc(var(--beat) * 5) var(--ease-sustain) infinite;
}

/* Played ring glow — uses the canonical --shadow-glow-brass token */
.knob.is-played.knob--ring .ring {
  box-shadow: var(--shadow-glow-brass), 0 0 30px rgba(224,169,58,.35);
}
.knob.is-played.knob--ring .ring::before {
  filter: drop-shadow(0 0 8px var(--brass));
}

/* Non-brass treatment — same mechanics, ivory indicator only */
.knob--ring.is-nobrass.knob--range .ring::before {
  background: conic-gradient(
    from -135deg,
    var(--ivory) 0%, var(--ivory) 64%,
    transparent 64%, transparent 100%);
  filter: none;
}
.knob--ring.is-nobrass.knob--boolean .ring::before {
  background: conic-gradient(var(--ivory) 0% 75%, transparent 75% 100%);
  filter: none;
}
.knob--ring.is-nobrass.knob--options .ring::before {
  background: conic-gradient(
    from -135deg,
    var(--ivory) 0% 18.75%,
    transparent 18.75% 25%,
    var(--ivory-3) 25% 43.75%,
    transparent 43.75% 50%,
    var(--ivory-3) 50% 68.75%,
    transparent 68.75% 75%,
    var(--ivory-3) 75% 93.75%,
    transparent 93.75% 100%);
}
.knob--ring.is-nobrass.knob--button .ring::before {
  background: conic-gradient(var(--ivory) 0% 25%, transparent 25% 100%);
  filter: none;
}
.knob--ring.is-nobrass .v.is-lit { color: var(--ivory); }

/* Disabled ring */
.knob.is-disabled {
  filter: saturate(0.1) brightness(0.55);
  pointer-events: none;
}
.knob.is-disabled.knob--ring .ring {
  background: radial-gradient(circle at 50% 35%, var(--ink-4) 0%, var(--ink-2) 70%);
}

/* Value text inside ring */
.knob--ring .v {
  position: relative;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  line-height: 1;
  color: var(--ivory);
}
.knob--ring .v.is-lit   { color: var(--brass-hi); }
.knob--ring .v.is-small { font-size: 14px; }
.knob.is-hero.knob--ring .v { font-size: 28px; }

@media (prefers-reduced-motion: reduce) {
  .knob--ring.knob--button .ring::before { animation: none; }
}
</style>
