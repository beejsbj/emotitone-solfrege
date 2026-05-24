<template>
  <section class="preview-port preview-port--primitive-card">
    <div class="card">
      <div class="label">CARD · FUNDAMENTAL SHELL</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="panel panel-card">
          <span class="panel-label">01 &mdash; Stage / Ivory</span>
          <div class="mark mark-ordinal">01</div>
          <h3>A dark room. Ivory type.</h3>
          <p>Everything sits on the dark stage. Ivory at four steps &mdash; text, secondary, meta, disabled &mdash; is the only light.</p>
        </div>
        <div class="anatomy">
          <div class="row"><b>Panel</b><span>ink-3 · 1px ink-5 hairline · .panel base from _card.css</span></div>
          <div class="row"><b>Label</b><span>JBM 10 · ivory-3 · clips top edge at -10px · ink bg</span></div>
          <div class="row"><b>Mark</b><span>top-right slot · any decoration primitive · 28–52px</span></div>
          <div class="row"><b>Title</b><span>Jazz 19 upper · ivory · max 14ch · h3 semantic</span></div>
          <div class="row"><b>Body</b><span>body-s · ivory-3 · max 28ch · sits below title</span></div>
          <div class="row"><b>Tilt</b><span>±0.15–0.3deg per card · hand-cut, not stamped</span></div>
        </div>
      </div>
    
      <div class="section-head">Mark variants — same shell, different decoration</div>
      <div class="variants-full" style="grid-template-columns: repeat(5, 1fr)">
        <div class="panel panel-card">
          <span class="panel-label">01 &mdash; Stage / Ivory</span>
          <div class="mark mark-ordinal">01</div>
          <h3>Dark room. Ivory type.</h3>
          <p>Ordinal mark · enumerates a series.</p>
        </div>
        <div class="panel panel-card">
          <span class="panel-label">Mode &mdash; Aeolian</span>
          <div class="mark mark-glyph">
            <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M14 4 v18 a4 4 0 1 1 -4 -4 l4 0 z" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <h3>Mode picker. Music mark.</h3>
          <p>Music-glyph mark · signals musical context.</p>
        </div>
        <div class="panel panel-card">
          <span class="panel-label">Draft &mdash; Rev / 02</span>
          <div class="mark mark-stamp">REV · 02</div>
          <h3>Doc revision. Stamp mark.</h3>
          <p>Filemark stamp · revision, draft, status.</p>
        </div>
        <div class="panel panel-card">
          <span class="panel-label">Mono &mdash; No Mark</span>
          <h3>Quiet card. No mark.</h3>
          <p>The slot is optional. Empty when the card carries no count, mode, or status.</p>
        </div>
        <div class="panel panel-card" style="border: none; padding-top: 22px;">
          <span class="panel-label" style="top: 0; background: transparent; color: var(--ivory-3);">No Border</span>
          <div class="mark mark-ordinal">02</div>
          <h3>Spaced apart. Hairline ring.</h3>
          <p>Border removed · visual separation via spacing and hairline ring.</p>
        </div>
      </div>
    
      <div class="section-head">Shell variants — inverted contrast</div>
      <div class="variants-full" style="grid-template-columns: repeat(2, 1fr)">
        <div class="panel" style="background: var(--ink); border: 1px solid var(--ink-5); padding: 14px 12px 16px; min-height: 158px; position: relative; margin-top: 14px;">
          <span style="position: absolute; top: -10px; left: 14px; background: var(--ink); padding: 0 4px; font-family: var(--font-mono); font-size: 8px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ivory-3);">Inverted Dark</span>
          <div style="position: absolute; right: 8px; top: 4px; font-size: 32px; font-weight: 400; line-height: 1; letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory-4);">02</div>
          <h3 style="font: 400 14px/1.12 var(--font-display); letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ivory); margin: 0 0 6px; max-width: none; padding-right: 38px;">Full ink. Ivory text.</h3>
          <p style="font: 10px/1.5 var(--font-body); color: var(--ivory-3); margin: 0; max-width: none;">Inverted dark · maximum contrast on dark stage.</p>
        </div>
        <div class="panel" style="background: var(--ivory); border: 1px solid var(--ivory-3); padding: 14px 12px 16px; min-height: 158px; position: relative; margin-top: 14px;">
          <span style="position: absolute; top: -10px; left: 14px; background: var(--ivory); padding: 0 4px; font-family: var(--font-mono); font-size: 8px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-3);">Inverted Light</span>
          <div style="position: absolute; right: 8px; top: 4px; font-size: 32px; font-weight: 400; line-height: 1; letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ink-5);">03</div>
          <h3 style="font: 400 14px/1.12 var(--font-display); letter-spacing: var(--tracking-display); text-transform: uppercase; color: var(--ink); margin: 0 0 6px; max-width: none; padding-right: 38px;">Full ivory. Ink text.</h3>
          <p style="font: 10px/1.5 var(--font-body); color: var(--ink-3); margin: 0; max-width: none;">Inverted light · vice versa, for spec only.</p>
        </div>
      </div>
    
      <div class="caption" style="margin-top:14px">
        The mark slot is decorative, not functional — never put an active control there. One mark per card.
        Pick from the decoration family (ordinal, music glyph, sticker, filemark stamp) or leave the slot empty.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   CARD — the fundamental shell of the app.
   .panel base from _card.css (border + floating label) + decoration-mark
   slot top-right + display title + mono body. The mark slot accepts ANY
   decoration primitive: ordinal, music glyph, filemark stamp, badge.
   ===================================================================== */

.panel-card {
  padding: 20px 18px 22px;
  min-height: 190px;
  box-sizing: border-box;
}

/* Decoration-mark slot — anchored top-right, any primitive plugs in here. */
.panel-card .mark {
  position: absolute;
  right: 12px;
  top: 8px;
  user-select: none;
  pointer-events: none;
  color: var(--ivory-4);
  line-height: 1;
}
.panel-card .mark.mark-ordinal {
  font: 400 52px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}
.panel-card .mark.mark-glyph svg { display: block; }
.panel-card .mark.mark-stamp {
  border: 1px solid var(--ivory-4);
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ivory-3);
  transform: rotate(2deg);
}

.panel-card h3 {
  font: 400 19px/1.12 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
  margin: 0 0 10px;
  max-width: 14ch;
}
.panel-card p {
  font: var(--t-body-s);
  color: var(--ivory-3);
  margin: 0;
  max-width: 28ch;
}

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
.anatomy-wrap .panel-card { transform: rotate(-0.2deg); }

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
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.variants-full .panel-card {
  padding: 14px 12px 16px;
  min-height: 158px;
}
.variants-full .panel-card h3 { font-size: 14px; margin-bottom: 6px; max-width: none; padding-right: 38px; }
.variants-full .panel-card p  { font-size: 10px; line-height: 1.5; max-width: none; }
.variants-full .panel-card .panel-label { font-size: 8px; }
.variants-full .panel-card .mark.mark-ordinal { font-size: 32px; right: 8px; top: 4px; }
.variants-full .panel-card .mark.mark-glyph svg { width: 22px; height: 22px; }
.variants-full .panel-card .mark.mark-stamp { font-size: 7px; padding: 3px 5px; letter-spacing: 0.18em; }

.variants-full .panel-card:nth-child(1) { transform: rotate(0.2deg); }
.variants-full .panel-card:nth-child(2) { transform: rotate(-0.3deg); }
.variants-full .panel-card:nth-child(3) { transform: rotate(0.15deg); }
.variants-full .panel-card:nth-child(4) { transform: rotate(-0.25deg); }
</style>
