<template>
  <section class="preview-port preview-port--primitive-spine-card">
    <div class="card">
      <div class="label">SPINE CARD · BRAND-MARKED SHELL</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="spine-card mark-tomato">
          <span class="kicker"><span class="dot"></span>Section &middot; 03</span>
          <div class="stamp">Danger.</div>
          <div class="what">Kicker dot, danger badge, brand splash on hero.</div>
        </div>
        <div class="anatomy">
          <div class="row"><b>Spine</b><span>4px · brand · full height left</span></div>
          <div class="row"><b>Dot</b><span>8px · brand · top-left in kicker</span></div>
          <div class="row"><b>Kicker</b><span>JBM 9 · ivory-3 · uppercase tracked</span></div>
          <div class="row"><b>Stamp</b><span>Jazz 32 · ivory · period-terminated</span></div>
          <div class="row"><b>Body</b><span>JBM 11 · ivory-3 · pinned to bottom</span></div>
          <div class="row"><b>Panel</b><span>ink-2 (or ink-3 for bone) · 1px hairline</span></div>
        </div>
      </div>
    
      <div class="section-head">Brand variants — one color per card</div>
      <div class="variants-full">
        <div class="spine-card mark-tomato">
          <span class="kicker"><span class="dot"></span>Section &middot; 03</span>
          <div class="stamp">Danger.</div>
          <div class="what">Kicker dot, danger badge, brand splash on hero.</div>
        </div>
        <div class="spine-card mark-pine">
          <span class="kicker"><span class="dot"></span>Live &middot; demo</span>
          <div class="stamp">Live.</div>
          <div class="what">Quiet running marker, classroom preset spine.</div>
        </div>
        <div class="spine-card mark-plum">
          <span class="kicker"><span class="dot"></span>Ambient &middot; bloom</span>
          <div class="stamp">Ambient.</div>
          <div class="what">Visual-preset spine, decorative scrap accent.</div>
        </div>
        <div class="spine-card mark-bone">
          <span class="kicker"><span class="dot"></span>Brand &middot; sticker</span>
          <div class="stamp">Brand.</div>
          <div class="what">Hero background, sticker face, paper-on-stage panel.</div>
        </div>
        <div class="spine-card mark-mustard">
          <span class="kicker"><span class="dot"></span>Hot &middot; take</span>
          <div class="stamp">Hot.</div>
          <div class="what">Record button, sticker scrap, capture moment.</div>
        </div>
      </div>
    
      <div class="caption" style="margin-top:14px">
        Mixing brand colors inside one spine card reads as gift-wrap, not jazz. One color per card &mdash;
        use the spine and the kicker dot together, never separately.
      </div>
    
      <div class="section-head">Preset row · with apply button</div>
      <div class="variants-full" style="grid-template-columns: 1fr">
        <div class="spine-card mark-tomato preset-row">
          <span class="kicker"><span class="dot"></span>Soft Glass</span>
          <div class="stamp" style="flex: 1">Soft Glass.</div>
          <button class="apply-btn">Apply</button>
        </div>
        <div class="spine-card mark-pine preset-row">
          <span class="kicker"><span class="dot"></span>Live &middot; preset</span>
          <div class="stamp" style="flex: 1">Classroom.</div>
          <button class="apply-btn">Apply</button>
        </div>
        <div class="spine-card mark-plum preset-row preset-row-applied">
          <span class="kicker"><span class="dot"></span>Ambient &middot; bloom</span>
          <div class="stamp" style="flex: 1">Ambient.</div>
          <span style="font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ivory-3); margin: 0 8px;">Applied</span>
        </div>
        <div class="spine-card mark-mustard preset-row preset-row-expiring">
          <span class="kicker"><span class="dot"></span>Hot &middot; take</span>
          <div class="stamp" style="flex: 1">Pulse Lab.</div>
          <span style="font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ivory-3); margin: 0 8px;">2:14 left</span>
        </div>
      </div>
    
      
    
      <div class="caption" style="margin-top:14px">
        Preset row · spine-card variant with apply action. Same brand-spine-one-color-per-row rule applies. Meta text (Applied, expiring countdown) sits right of name.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   SPINE CARD — the second canonical card shell.
   ink-2 panel · 4px colored spine on left · kicker (dot + uppercase mono
   label) · display headline (Lets Jazz, period-terminated) · mono body.
   Spine color = brand color · one brand color per card.
   ===================================================================== */

.spine-card {
  position: relative;
  background: var(--ink-2);
  border: 1px solid var(--hairline);
  padding: 16px 16px 16px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 168px;
}
.spine-card::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--spine, var(--tomato));
}

.spine-card .kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ivory-3);
}
.spine-card .kicker .dot {
  width: 8px; height: 8px;
  background: var(--spine, var(--tomato));
  flex: 0 0 8px;
}
.spine-card .stamp {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 32px;
  line-height: .9;
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}
.spine-card .what {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.55;
  color: var(--ivory-3);
  margin-top: auto;
}

/* Brand-color variants — set the --spine custom property and any per-color overrides. */
.spine-card.mark-tomato  { --spine: var(--tomato); }
.spine-card.mark-pine    { --spine: var(--pine); }
.spine-card.mark-plum    { --spine: var(--plum); }
.spine-card.mark-mustard { --spine: var(--mustard); }
.spine-card.mark-bone    {
  background: var(--ink-3);
  --spine: var(--bone);
}
.spine-card.mark-bone .stamp { color: var(--bone); }

/* ── anatomy block ─────────────────────────────────────────────────── */
.anatomy-wrap {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-top: 8px;
}
.anatomy {
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 6px;
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
.anatomy .row b {
  color: var(--ivory);
  font-weight: 700;
}

/* ── variants grid ─────────────────────────────────────────────────── */
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

.variants {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.variants-full {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.variants-full .spine-card {
  min-height: 144px;
  padding: 12px 12px 12px 18px;
  gap: 8px;
}
.variants-full .spine-card .stamp { font-size: 22px; }
.variants-full .spine-card .what  { font-size: 10px; }
.variants-full .spine-card .kicker { font-size: 8px; }

/* Preset-row variant — spine-card with horizontal flex layout + right-side button */
  .spine-card.preset-row {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    min-height: auto;
  }
  .spine-card.preset-row .stamp {
    flex: 1;
    font-size: 16px;
    margin: 0;
  }
  .spine-card.preset-row .kicker {
    flex-shrink: 0;
  }
  .spine-card.preset-row .what {
    display: none;
  }
  .apply-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    border: 1px solid var(--hairline);
    background: transparent;
    color: var(--ivory-3);
    font: 700 10px var(--font-display);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color var(--dur-tap) var(--ease-brush),
                border-color var(--dur-tap) var(--ease-brush);
  }
  .apply-btn:hover {
    color: var(--ivory);
    border-color: var(--hairline);
  }
  .preset-row-applied .apply-btn {
    display: none;
  }
  .preset-row-expiring .apply-btn {
    display: none;
  }
</style>
