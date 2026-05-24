<template>
  <section class="preview-port preview-port--primitive-keys">
    <div class="card">
      <div class="label">Keys · Primitive</div>
    
      <!-- ═══════════════════════════════════════════════════════════
           ANATOMY — one canonical key (degree-centered by default)
           Lifted from v2 .note-card: flex column · space-between
           top=syllable · center=degree-large · bottom=raw-note
           ════════════════════════════════════════════════════════ -->
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="key-hero">
          <div class="key" style="--key-bg: var(--note-do);">
            <span class="k-syll">Do</span>
            <span class="k-deg">I</span>
            <span class="k-raw">C4</span>
          </div>
        </div>
        <div class="anatomy">
          <div class="row"><b>Face</b><span>--note-* fill · one note = one hue · music feedback only</span></div>
          <div class="row"><b>k-syll</b><span>Top · Lets Jazz · solfege syllable · meta opacity at rest</span></div>
          <div class="row"><b>k-deg</b><span>Center · Lets Jazz 32px · roman numeral · hero by default</span></div>
          <div class="row"><b>k-raw</b><span>Bottom · JBM mono · raw pitch string · meta opacity at rest</span></div>
          <div class="row"><b>Chrome</b><span>border-radius var(--r-sm) · clip-path polygon · ink/ivory only</span></div>
          <div class="row"><b>Depth</b><span>--shadow-key inset · sheen via ::after overlay · mix-blend overlay</span></div>
          <div class="row"><b>States</b><span>rest · pressed (--shadow-pressed · brightness .88 · 1px drop)</span></div>
        </div>
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           VARIANTS — 1. Center-format toggle
           Same Do key shown three ways; which label is the large
           center-stage hero is toggled by .fmt-syll / (default) / .fmt-raw
           ════════════════════════════════════════════════════════ -->
      <div class="section-head">Variants · Center-format toggle</div>
      <div class="fmt-row">
    
        <!-- Syllable-centered -->
        <div class="var-cell">
          <div class="key fmt-syll" style="--key-bg: var(--note-do); width:80px; height:130px; clip-path:polygon(3% 1%,98% 2%,100% 98%,1% 99%);">
            <span class="k-syll">Do</span>
            <span class="k-deg">I</span>
            <span class="k-raw">C4</span>
          </div>
          <div class="lbl">Syllable</div>
          <code>solfege hero<br>deg + raw meta</code>
        </div>
    
        <!-- Degree-centered (DEFAULT) -->
        <div class="var-cell">
          <div class="key fmt-deg" style="--key-bg: var(--note-do); width:80px; height:130px; clip-path:polygon(3% 1%,98% 2%,100% 98%,1% 99%);">
            <span class="k-syll">Do</span>
            <span class="k-deg">I</span>
            <span class="k-raw">C4</span>
          </div>
          <div class="lbl">Degree</div>
          <code>arabic + roman sub<br>default hero</code>
        </div>
    
        <!-- Raw-centered -->
        <div class="var-cell">
          <div class="key fmt-raw" style="--key-bg: var(--note-do); width:80px; height:130px; clip-path:polygon(3% 1%,98% 2%,100% 98%,1% 99%);">
            <span class="k-syll">Do</span>
            <span class="k-deg">I</span>
            <span class="k-raw">C4</span>
          </div>
          <div class="lbl">Raw</div>
          <code>pitch string hero<br>syll + deg meta</code>
        </div>
    
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           VARIANTS — 2. Full chromatic scale (degree-centered)
           All 7 diatonic syllables displayed
           ════════════════════════════════════════════════════════ -->
      <div class="section-head">Variants · Chromatic palette (degree mode)</div>
      <div class="variants-full" style="grid-template-columns: repeat(7, 1fr)">
    
        <div class="var-cell" style="padding:6px 3px 7px;">
          <div class="key" style="--key-bg: var(--note-do);">
            <span class="k-syll">Do</span>
            <span class="k-deg">I</span>
            <span class="k-raw">C4</span>
          </div>
        </div>
    
        <div class="var-cell" style="padding:6px 3px 7px;">
          <div class="key" style="--key-bg: var(--note-re);">
            <span class="k-syll">Ra</span>
            <span class="k-deg">&#x266D;II</span>
            <span class="k-raw">C&#x266F;4</span>
          </div>
        </div>
    
        <div class="var-cell" style="padding:6px 3px 7px;">
          <div class="key" style="--key-bg: var(--note-mi);">
            <span class="k-syll">Me</span>
            <span class="k-deg">III</span>
            <span class="k-raw">E4</span>
          </div>
        </div>
    
        <div class="var-cell" style="padding:6px 3px 7px;">
          <div class="key" style="--key-bg: var(--note-fa);">
            <span class="k-syll">Fa</span>
            <span class="k-deg">IV</span>
            <span class="k-raw">F4</span>
          </div>
        </div>
    
        <div class="var-cell" style="padding:6px 3px 7px;">
          <div class="key" style="--key-bg: var(--note-sol);">
            <span class="k-syll">Se</span>
            <span class="k-deg">V</span>
            <span class="k-raw">G4</span>
          </div>
        </div>
    
        <div class="var-cell" style="padding:6px 3px 7px;">
          <div class="key" style="--key-bg: var(--note-la);">
            <span class="k-syll">Le</span>
            <span class="k-deg">VI</span>
            <span class="k-raw">A&#x266D;4</span>
          </div>
        </div>
    
        <div class="var-cell" style="padding:6px 3px 7px;">
          <div class="key" style="--key-bg: var(--note-ti);">
            <span class="k-syll">Te</span>
            <span class="k-deg">VII</span>
            <span class="k-raw">B&#x266D;4</span>
          </div>
        </div>
    
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           VARIANTS — 4. States — rest / pressed / disabled
           ════════════════════════════════════════════════════════ -->
      <div class="section-head">Variants · States</div>
      <div class="variants-full" style="grid-template-columns: repeat(3, 1fr)">
    
        <div class="var-cell">
          <div class="key" style="--key-bg: var(--note-sol);">
            <span class="k-syll">Se</span>
            <span class="k-deg">V</span>
            <span class="k-raw">G4</span>
          </div>
          <div class="lbl">Rest</div>
          <code>--shadow-key<br>base state</code>
        </div>
    
        <div class="var-cell">
          <div class="key pressed" style="--key-bg: var(--note-mi);">
            <span class="k-syll">Me</span>
            <span class="k-deg">III</span>
            <span class="k-raw">E4</span>
          </div>
          <div class="lbl">Pressed</div>
          <code>--shadow-pressed<br>brightness .88<br>translateY(1px)</code>
        </div>
    
        <div class="var-cell">
          <div class="key disabled" style="--key-bg: var(--note-la);">
            <span class="k-syll">Le</span>
            <span class="k-deg">VI</span>
            <span class="k-raw">A&#x266D;4</span>
          </div>
          <div class="lbl">Disabled</div>
          <code>saturate(.12)<br>brightness(.45)</code>
        </div>
    
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           VARIANTS — 5. Cuts — clip-path geometry
           ════════════════════════════════════════════════════════ -->
      <div class="section-head">Variants · Cuts</div>
      <div class="variants-full" style="grid-template-columns: repeat(4, 1fr)">
    
        <div class="var-cell">
          <div class="key" style="--key-bg: var(--note-re);">
            <span class="k-syll">Ra</span>
            <span class="k-deg">&#x266D;II</span>
            <span class="k-raw">D&#x266D;4</span>
          </div>
          <div class="lbl">Strip</div>
          <!-- TODO: decompose into tokens-geometry (Wave 5)
               Proposed token: --clip-key-strip
               polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%) -->
          <code>polygon 4-pt<br>slight skew</code>
        </div>
    
        <div class="var-cell">
          <div class="key cut-tile" style="--key-bg: var(--note-fa);">
            <span class="k-syll">Fa</span>
            <span class="k-deg">IV</span>
            <span class="k-raw">F4</span>
          </div>
          <div class="lbl">Tile</div>
          <code>--clip-tile<br>square face</code>
        </div>
    
        <div class="var-cell">
          <div class="key cut-offcut" style="--key-bg: var(--note-ti);">
            <span class="k-syll">Te</span>
            <span class="k-deg">VII</span>
            <span class="k-raw">B&#x266D;4</span>
          </div>
          <div class="lbl">Off-Cut</div>
          <code>--clip-offcut<br>hex off-cut</code>
        </div>
    
        <div class="var-cell">
          <div class="key cut-pill" style="--key-bg: var(--note-te);">
            <span class="k-syll">Te</span>
            <span class="k-deg">VII</span>
            <span class="k-raw">A&#x266F;4</span>
          </div>
          <div class="lbl">Pill</div>
          <!-- TODO: decompose into tokens-geometry (Wave 5)
               Proposed token: --clip-key-pill (border-radius: 44px override) -->
          <code>full radius<br>soft variant</code>
        </div>
    
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           VARIANTS — 6. Shapes — tall / wide / squary
           ════════════════════════════════════════════════════════ -->
      <div class="section-head">Variants · Shapes</div>
      <div class="variants-full" style="grid-template-columns: repeat(3, 1fr)">
    
        <div class="var-cell">
          <div class="key shape-tall" style="--key-bg: var(--note-do);">
            <span class="k-syll">Do</span>
            <span class="k-deg">I</span>
            <span class="k-raw">C4</span>
          </div>
          <div class="lbl">Tall</div>
          <code>40 x 116px<br>diatonic row thin</code>
        </div>
    
        <div class="var-cell">
          <div class="key shape-squary" style="--key-bg: var(--note-mi);">
            <span class="k-syll">Me</span>
            <span class="k-deg">III</span>
            <span class="k-raw">E4</span>
          </div>
          <div class="lbl">Squary</div>
          <code>72 x 72px<br>near-square grid</code>
        </div>
    
        <div class="var-cell">
          <div class="key shape-wide" style="--key-bg: var(--note-sol);">
            <span class="k-syll">Se</span>
            <span class="k-deg">V</span>
            <span class="k-raw">G4</span>
          </div>
          <div class="lbl">Wide</div>
          <code>120 x 56px<br>panoramic row</code>
        </div>
    
      </div>
    
      <div class="caption" style="margin-top: 14px; color: var(--ivory-3); line-height: 1.55">
        One key primitive. Face = --note-* music color only. Chrome = ink/ivory. Every key shows all three labels stacked (solfege syllable top, degree center, raw pitch bottom) lifted from v2 .note-card layout. Format toggle promotes one label to hero size; the others drop to meta opacity. Cuts apply clip-path geometry tokens to the same structure. Shape variants change proportions only.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   KEYS — PRIMITIVE
   One canonical key structure. Playable face = --note-* only.
   Chrome (border, shadow, label) = ink / ivory only.
   In-key label stack (lifted from v2 .note-card):
     top    .k-syll  — solfege syllable  — Lets Jazz, meta opacity
     center .k-deg   — degree numeral    — Lets Jazz 56px, large/hero
     bottom .k-raw   — raw note string   — JBM mono, meta opacity
   Format toggle: which label is the hero (large, opaque).
   Variant axes:
     1. Center-format toggle (syll / deg / raw centered)
     2. Degree-numeral toggle (arabic+roman vs roman-only)
     3. Cuts    — clip-path geometry tokens
     4. Shapes  — tall / wide / squary
     5. States  — rest / pressed / disabled
   ===================================================================== */

/* ── CANONICAL KEY STRUCTURE ──────────────────────────────────────── */
.key {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 9px 8px 10px;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  background: var(--key-bg, var(--note-do));
  box-shadow: var(--shadow-key);
  transition:
    box-shadow var(--dur-tap) var(--ease-stab),
    filter      var(--dur-tap) var(--ease-stab),
    transform   var(--dur-tap) var(--ease-stab);
  overflow: hidden;
}

/* Sheen overlay — same as before */
.key::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(110% 60% at 50% 0%, rgba(255,255,255,.18), transparent 55%),
    linear-gradient(180deg, transparent 65%, rgba(0,0,0,.22) 100%);
  mix-blend-mode: overlay;
}

/* ── IN-KEY LABEL STACK (v2 .note-card anatomy) ───────────────────── */
/*   top: solfege syllable (meta tier by default) */
.key .k-syll {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(0,0,0,.55);
  line-height: 1;
}
/*   center: degree — Lets Jazz large, hero by default */
.key .k-deg {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 32px;
  line-height: 0.85;
  color: rgba(0,0,0,.85);
  /* center vertically via auto margin within the flex column */
  margin: auto 0;
}
.key .k-deg sub {
  font-size: 11px;
  color: rgba(0,0,0,.55);
  margin-left: 1px;
  vertical-align: baseline;
  position: relative;
  bottom: -4px;
}
/*   bottom: raw note — JBM mono, meta tier by default */
.key .k-raw {
  position: relative;
  z-index: 1;
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(0,0,0,.55);
  line-height: 1;
}

/* ── FORMAT TOGGLE MODIFIER CLASSES ──────────────────────────────── */
/* Syllable-centered: syll is hero, deg + raw are meta */
.key.fmt-syll .k-syll {
  font-size: 24px;
  letter-spacing: 0.04em;
  color: rgba(0,0,0,.85);
}
.key.fmt-syll .k-deg {
  font-size: 12px;
  color: rgba(0,0,0,.55);
  margin: 0;
}
.key.fmt-syll .k-deg sub {
  font-size: 8px;
  bottom: -2px;
}
.key.fmt-syll .k-raw {
  font-size: 7px;
  color: rgba(0,0,0,.45);
}

/* Degree-centered: DEFAULT — deg is hero (no extra class needed, base is deg-hero) */
/* .fmt-deg is explicit alias for clarity */
.key.fmt-deg .k-syll { color: rgba(0,0,0,.55); font-size: 9px; }
.key.fmt-deg .k-deg  { font-size: 32px; color: rgba(0,0,0,.85); }
.key.fmt-deg .k-raw  { color: rgba(0,0,0,.55); font-size: 7px; }

/* Raw-centered: raw note is hero, syll + deg are meta */
.key.fmt-raw .k-syll {
  font-size: 9px;
  color: rgba(0,0,0,.45);
}
.key.fmt-raw .k-deg {
  font-size: 12px;
  color: rgba(0,0,0,.50);
  margin: 0;
}
.key.fmt-raw .k-deg sub {
  font-size: 8px;
  bottom: -2px;
}
.key.fmt-raw .k-raw {
  font-size: 18px;
  letter-spacing: 0.04em;
  color: rgba(0,0,0,.85);
}

/* Degree-numeral: roman-only (replaces arabic+roman) — class on key */
/* When .deg-roman, the .k-deg element shows only roman text via data-roman */
/* Implemented in HTML: second span inside k-deg for roman-only variant */

/* ── STATES ────────────────────────────────────────────────────────── */
.key.pressed {
  box-shadow: var(--shadow-pressed);
  filter: brightness(.88);
  transform: translateY(1px);
}
.key.disabled {
  filter: saturate(.12) brightness(.45);
  cursor: not-allowed;
}

/* ── DEFAULT PROPORTIONS (tall strip) ─────────────────────────────── */
.key {
  width: 56px;
  height: 88px;
  border-radius: var(--r-sm);
  /* TODO: decompose into tokens-geometry (Wave 5)
     Proposed: --clip-key-strip  polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%) */
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
}

/* ── CUTS ─────────────────────────────────────────────────────────── */
.key.cut-tile {
  width: 88px;
  height: 88px;
  border-radius: 4px;
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%); /* --clip-tile */
}
.key.cut-tile .k-deg { font-size: 44px; }
.key.cut-tile .k-syll { font-size: 10px; }
.key.cut-tile .k-raw  { font-size: 8px; }

.key.cut-offcut {
  width: 88px;
  height: 88px;
  border-radius: 0;
  clip-path: polygon(4% 0%, 98% 6%, 100% 90%, 96% 100%, 2% 94%, 0% 8%); /* --clip-offcut */
}
.key.cut-offcut .k-deg { font-size: 40px; }

.key.cut-tab {
  width: 88px;
  height: 88px;
  border-radius: 0;
  clip-path: polygon(2% 0, 100% 4%, 98% 100%, 0 96%); /* --clip-tab */
}
.key.cut-tab .k-deg { font-size: 40px; }

.key.cut-pill {
  width: 56px;
  height: 88px;
  clip-path: none;
  border-radius: 44px;
  /* TODO: decompose into tokens-geometry (Wave 5)
     Proposed: --clip-key-pill  border-radius: 44px */
}

/* ── SHAPE VARIANTS ─────────────────────────────────────────────── */
.key.shape-squary {
  width: 72px;
  height: 72px;
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
}
.key.shape-squary .k-deg { font-size: 28px; }

.key.shape-wide {
  width: 120px;
  height: 56px;
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
  padding: 6px 12px 8px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.key.shape-wide .k-syll { font-size: 9px; align-self: flex-start; }
.key.shape-wide .k-deg  { font-size: 24px; margin: 0; align-self: center; }
.key.shape-wide .k-deg sub { font-size: 9px; }
.key.shape-wide .k-raw  { font-size: 7px; align-self: flex-end; }

.key.shape-tall {
  width: 40px;
  height: 116px;
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
  padding: 8px 5px 9px;
}
.key.shape-tall .k-syll { font-size: 7px; }
.key.shape-tall .k-deg  { font-size: 20px; }
.key.shape-tall .k-deg sub { font-size: 8px; }
.key.shape-tall .k-raw  { font-size: 6px; }

/* ── HERO WRAPPER ─────────────────────────────────────────────────── */
.key-hero {
  display: grid;
  place-items: center;
  min-height: 200px;
  background: var(--ink);
  border: 1px solid var(--hairline);
  box-shadow: var(--ring);
}
.key-hero .key {
  width: 80px;
  height: 130px;
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
  transform: rotate(-0.2deg);
}
.key-hero .key .k-deg { font-size: 44px; }
.key-hero .key .k-syll { font-size: 11px; }
.key-hero .key .k-raw  { font-size: 9px; }
.key-hero .key .k-deg sub { font-size: 15px; }

/* ── SPECIMEN GRAMMAR ─────────────────────────────────────────────── */
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

/* ── VARIANT CELL ─────────────────────────────────────────────────── */
.var-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 6px 9px;
  background: var(--ink);
  border: 1px solid var(--hairline);
}
.var-cell .lbl {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ivory);
}
.var-cell code {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .14em;
  color: var(--ivory-3);
  text-transform: uppercase;
  text-align: center;
  line-height: 1.4;
}

/* ── FORMAT TOGGLE ROW — wider cells to fit the key face ──────────── */
.fmt-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* ── REDUCED MOTION ──────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .key { transition: none; }
}
</style>
