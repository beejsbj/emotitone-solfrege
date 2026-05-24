<template>
  <section class="preview-port preview-port--primitive-kicker">
    <div class="card">
      <div class="label">KICKER · SECTION OPENER · DOT + LABEL</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="hero-stage">
          <span class="kicker mark-tomato">
            <span class="dot"></span><span class="kicker-label">Section &middot; 03</span>
          </span>
        </div>
        <div class="anatomy">
          <div class="row"><b>Dot</b><span>8px sq · brand color · flush vertical center</span></div>
          <div class="row"><b>Label</b><span>JBM 9 · ivory-3 · uppercase · tracking-label</span></div>
          <div class="row"><b>Gap</b><span>8px between dot and label</span></div>
          <div class="row"><b>Axis</b><span>brand color only · tomato pine plum mustard bone</span></div>
          <div class="row"><b>Rule</b><span>dot = section brand · label stays ivory-3</span></div>
        </div>
      </div>
    
      <!-- ─────────────────── BRAND COLORS ─────────────────── -->
      <div class="section-head">Brand Colors</div>
      <div class="variants-full brand-row">
        <div class="variant-cell">
          <span class="kicker mark-tomato"><span class="dot"></span><span class="kicker-label">Tomato &middot; 01</span></span>
          <span class="cell-name">Tomato</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-pine"><span class="dot"></span><span class="kicker-label">Pine &middot; 02</span></span>
          <span class="cell-name">Pine</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-plum"><span class="dot"></span><span class="kicker-label">Plum &middot; 03</span></span>
          <span class="cell-name">Plum</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-mustard"><span class="dot"></span><span class="kicker-label">Mustard &middot; 04</span></span>
          <span class="cell-name">Mustard</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-bone"><span class="dot"></span><span class="kicker-label">Bone &middot; 05</span></span>
          <span class="cell-name">Bone</span>
        </div>
      </div>
    
      <!-- ─────────────────── TREATMENTS ─────────────────── -->
      <div class="section-head">Treatments</div>
      <div class="variants-full treatment-row">
        <div class="variant-cell">
          <span class="kicker mark-brass"><span class="dot"></span><span class="kicker-label">Live &middot; 01</span></span>
          <span class="cell-name">Brass Dot</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-ivory"><span class="dot"></span><span class="kicker-label">Neutral &middot; 02</span></span>
          <span class="cell-name">Ivory Dot</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-open"><span class="dot"></span><span class="kicker-label">Open &middot; 03</span></span>
          <span class="cell-name">Ring Dot</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-tomato dot-lg"><span class="dot"></span><span class="kicker-label">Large &middot; 04</span></span>
          <span class="cell-name">Dot 12px</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-tomato dot-micro"><span class="dot"></span><span class="kicker-label">Micro</span></span>
          <span class="cell-name">Dot 5px</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-tomato dot-only"><span class="dot"></span><span class="kicker-label">Hidden</span></span>
          <span class="cell-name">Dot Only</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-tomato label-only"><span class="dot"></span><span class="kicker-label">Label &middot; 07</span></span>
          <span class="cell-name">Label Only</span>
        </div>
      </div>
    
      <!-- ─────────────────── RECTANGLES ─────────────────── -->
      <div class="section-head">Rectangle Variants</div>
      <div class="variants-full axis-row">
        <div class="variant-cell">
          <span class="kicker mark-tomato rect-vert"><span class="dot"></span><span class="kicker-label">Vert &middot; 01</span></span>
          <span class="cell-name">Vertical Bar</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-pine rect-vert"><span class="dot"></span><span class="kicker-label">Vert &middot; 02</span></span>
          <span class="cell-name">Pine</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-tomato rect-horiz"><span class="dot"></span><span class="kicker-label">Horz &middot; 03</span></span>
          <span class="cell-name">Horizontal Bar</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-plum rect-horiz"><span class="dot"></span><span class="kicker-label">Horz &middot; 04</span></span>
          <span class="cell-name">Plum</span>
        </div>
      </div>
    
      <!-- ─────────────────── DENSITY + INVERSE ─────────────────── -->
      <div class="section-head">Density &amp; Inverse</div>
      <div class="variants-full axis-row">
        <div class="variant-cell">
          <span class="kicker mark-mustard dense"><span class="dot"></span><span class="kicker-label">Tight</span></span>
          <span class="cell-name">Dense Track</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-mustard"><span class="dot"></span><span class="kicker-label">Default</span></span>
          <span class="cell-name">Default Track</span>
        </div>
        <div class="variant-cell">
          <span class="kicker mark-mustard airy"><span class="dot"></span><span class="kicker-label">Wide</span></span>
          <span class="cell-name">Airy Track</span>
        </div>
        <div class="variant-cell on-bone">
          <span class="kicker mark-tomato inverse"><span class="dot"></span><span class="kicker-label">Inverse &middot; 04</span></span>
          <span class="cell-name" style="color: var(--ink-3);">On Bone</span>
        </div>
      </div>
    
      <div class="caption" style="margin-top:14px">
        The dot picks up the section's brand color; the label stays mono ivory-3.
        One kicker per scope &mdash; section, sub-section, or panel &mdash; never two on the same line.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   KICKER — primitive. Dot + uppercase mono label. The "you are here"
   marker that opens a section, panel, or card. One per scope.
   Dot picks up the section's brand color; label stays mono ivory-3.
   ===================================================================== */

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ivory-3);
  white-space: nowrap;
}
.kicker .dot {
  width: 8px; height: 8px;
  background: var(--kicker-color, var(--tomato));
  flex: 0 0 8px;
}

/* brand color modifiers */
.kicker.mark-tomato  { --kicker-color: var(--tomato); }
.kicker.mark-pine    { --kicker-color: var(--pine); }
.kicker.mark-plum    { --kicker-color: var(--plum); }
.kicker.mark-mustard { --kicker-color: var(--mustard); }
.kicker.mark-bone    { --kicker-color: var(--bone); }

/* treatment modifiers */
.kicker.mark-brass .dot {
  /* brass dot — lit signal, use .brass utility */
  background: var(--brass);
  box-shadow: 0 0 6px rgba(224,169,58,.45);
}
.kicker.mark-ivory .dot {
  background: var(--ivory-3);
}
.kicker.mark-open .dot {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--ivory-4);
}
.kicker.dot-lg .dot {
  width: 12px; height: 12px;
  flex: 0 0 12px;
}
.kicker.dot-micro .dot {
  width: 5px; height: 5px;
  flex: 0 0 5px;
}
.kicker.dot-only .kicker-label { display: none; }
.kicker.label-only .dot        { display: none; }
.kicker.label-only             { gap: 0; }

/* density */
.kicker.dense  { letter-spacing: 0.04em; }
.kicker.airy   { letter-spacing: 0.32em; }

/* alignment helpers */
.kicker.center { justify-content: center; }
.kicker.right  { justify-content: flex-end; }

/* inverse surface */
.kicker.inverse {
  color: var(--ink-3);
}
.kicker.inverse .dot {
  background: var(--kicker-color, var(--tomato));
}

/* rectangle variants */
.kicker.rect-vert .dot {
  width: 4px; height: 16px;
  flex: 0 0 4px;
}
.kicker.rect-horiz .dot {
  width: 16px; height: 4px;
  flex: 0 0 16px;
}

/* tilt — hand-cut feel */
.variant-cell:nth-child(1) .kicker  { transform: rotate(-2.3deg); }
.variant-cell:nth-child(2) .kicker  { transform: rotate(1.8deg); }
.variant-cell:nth-child(3) .kicker  { transform: rotate(-1.1deg); }
.variant-cell:nth-child(4) .kicker  { transform: rotate(2.7deg); }
.variant-cell:nth-child(5) .kicker  { transform: rotate(-0.5deg); }
.variant-cell:nth-child(6) .kicker  { transform: rotate(1.4deg); }
.variant-cell:nth-child(7) .kicker  { transform: rotate(-2.2deg); }
.variant-cell:nth-child(8) .kicker  { transform: rotate(0.9deg); }
.variant-cell:nth-child(9) .kicker  { transform: rotate(-1.6deg); }
.variant-cell:nth-child(10) .kicker { transform: rotate(2.1deg); }
.variant-cell:nth-child(11) .kicker { transform: rotate(-0.8deg); }
.variant-cell:nth-child(12) .kicker { transform: rotate(1.3deg); }
.variant-cell:nth-child(13) .kicker { transform: rotate(-2.5deg); }
.variant-cell:nth-child(14) .kicker { transform: rotate(1.2deg); }
.variant-cell:nth-child(15) .kicker { transform: rotate(-1.9deg); }
.variant-cell:nth-child(16) .kicker { transform: rotate(2.4deg); }
.hero-stage .kicker { transform: rotate(0.7deg); }

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

/* ── Hero stage ───────────────────────────────────────────────────── */
.hero-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  background: var(--ink);
  border: 1px solid var(--ink-5);
}
.hero-stage .kicker {
  font-size: 15px;
  gap: 12px;
}
.hero-stage .kicker .dot {
  width: 13px; height: 13px;
  flex: 0 0 13px;
}

/* ── Variant cells ────────────────────────────────────────────────── */
.variant-cell {
  background: var(--ink);
  border: 1px solid var(--ink-5);
  padding: 16px 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}
.variant-cell .kicker {
  font-size: 8px;
  gap: 6px;
}
.variant-cell .kicker .dot {
  width: 7px; height: 7px;
  flex-basis: 7px;
}
/* override dot sizes inside cells for treatment variants */
.variant-cell .kicker.dot-lg .dot  { width: 12px; height: 12px; flex-basis: 12px; }
.variant-cell .kicker.dot-micro .dot { width: 5px; height: 5px; flex-basis: 5px; }

.variant-cell .cell-name {
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-4);
  text-align: center;
}

/* brand-color row: 5 columns */
.variants-full.brand-row {
  grid-template-columns: repeat(5, 1fr);
}
/* treatment row: 7 columns */
.variants-full.treatment-row {
  grid-template-columns: repeat(7, 1fr);
}
/* sub-axis row: 4 columns */
.variants-full.axis-row {
  grid-template-columns: repeat(4, 1fr);
}

/* inverse cell overrides the stage to bone */
.variant-cell.on-bone {
  background: var(--bone);
  border-color: var(--bone);
}
/* alignment cells show full-width kicker */
.variant-cell.align-demo {
  align-items: stretch;
}
.variant-cell.align-demo .kicker {
  width: 100%;
}
.variant-cell.align-demo .kicker.center { justify-content: center; }
.variant-cell.align-demo .kicker.right  { justify-content: flex-end; }
</style>
