<template>
  <section class="preview-port preview-port--unique-brand-logo">
    <div class="card">
      <div class="label">BRAND LOGO · WORDMARK</div>

      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <div class="logo-hero">
          <div class="logo-wordmark">EMOTITONE</div>
          <div class="logo-sub">solfège learning &middot; melody sketchpad</div>
        </div>
        <div class="anatomy">
          <div class="row"><b>Wordmark</b><span>Lets Jazz · 52px · ivory · uppercase · ls .01em</span></div>
          <div class="row"><b>Baseline</b><span>lh 1 · no descenders · cut-poster register</span></div>
          <div class="row"><b>Sub</b><span>JBM 9 · ivory-3 · tracked label · margin-top 8px</span></div>
          <div class="row"><b>Panel</b><span>ink-2 bg · 1px ink-5 border · no radius</span></div>
          <div class="row"><b>Palette</b><span>full brand palette + ivory/ink allowed</span></div>
          <div class="row"><b>Rule</b><span>one lit signal max per lockup</span></div>
        </div>
      </div>

      <div class="section-head">Variants</div>
      <div class="variants-full" style="grid-template-columns:repeat(2,1fr)">

        <!-- Wordmark only -->
        <div class="var-tile">
          <div class="var-label">Wordmark only</div>
          <div class="wm">EMOTITONE</div>
          <div class="sub">solfège learning &middot; melody sketchpad</div>
        </div>

        <!-- Glyph / monogram -->
        <div class="var-glyph">
          <div class="var-label">Monogram</div>
          <div class="glyph-mark">ET</div>
          <div class="glyph-sub">initial mark · tight pair</div>
        </div>

        <!-- Logo + tagline -->
        <div class="var-tagline">
          <div class="var-label">Logo + Tagline</div>
          <div class="tagline-text">
            <div class="tagline-headline">JAZZ IS<br/>FEELING<br/>MADE VISIBLE.</div>
            <div class="tagline-sub">play &middot; learn &middot; emote &middot; repeat</div>
          </div>
          <div class="tagline-img">
            <img src="../assets/jazz-collage.png" alt="">
          </div>
        </div>

        <!-- Brass-lit -->
        <div class="var-tile brass-lit">
          <div class="var-label">Brass signal</div>
          <div class="wm">EMOTITONE</div>
          <div class="sub">one lit accent · loading · hero moment</div>
        </div>

        <!-- Inverted — bone on ink becomes ink on bone -->
        <div class="var-tile inverted">
          <div class="var-label">Inverted</div>
          <div class="wm">EMOTITONE</div>
          <div class="sub">sticker · print · bone surface</div>
        </div>

        <!-- Wordmark + note glyphs -->
        <div class="var-tile">
          <div class="var-label">With note marks</div>
          <div class="wm">EMOTITONE</div>
          <div style="display:flex;gap:10px;margin-top:6px;">
            <span style="color:var(--note-do);font:var(--t-h3)">&#9833;</span>
            <span style="color:var(--note-mi);font:var(--t-h3)">&#9834;</span>
            <span style="color:var(--note-sol);font:var(--t-h3)">&#9835;</span>
            <span style="color:var(--note-la);font:var(--t-h3)">&#9836;</span>
            <span style="color:var(--note-ti);font:var(--t-h3)">&#9837;</span>
          </div>
        </div>

      </div>

      <div class="caption">
        Full brand palette allowed on the logo card. Brass = one lit signal per lockup. Tagline is a logo variant, not a separate card.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   BRAND LOGO — canonical wordmark specimen
   Full brand palette allowed. Anatomy + Variants grammar.
   ===================================================================== */

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

/* ── hero logo ──────────────────────────────────────────────────────── */
.logo-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 28px 24px;
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  min-height: 140px;
}
.logo-wordmark {
  font-family: var(--font-display);
  font-size: 52px;
  font-weight: 400;
  letter-spacing: .01em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--ivory);
}
.logo-sub {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ivory-3);
  margin-top: 8px;
}

/* ── variant tiles ──────────────────────────────────────────────────── */
.var-tile {
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  padding: 20px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}
.var-tile .var-label {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin-bottom: 4px;
}
.var-tile .wm {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 400;
  letter-spacing: .01em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--ivory);
}
.var-tile .sub {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ivory-3);
}

/* tagline variant */
.var-tagline {
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  padding: 20px 18px 14px;
  display: flex;
  gap: 18px;
  align-items: center;
  position: relative;
}
.var-tagline .var-label {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  position: absolute;
  top: 8px; left: 18px;
}
.var-tagline .tagline-text {
  flex: 1;
  padding-top: 14px;
}
.var-tagline .tagline-headline {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: .01em;
  text-transform: uppercase;
  line-height: .95;
  color: var(--ivory);
}
.var-tagline .tagline-sub {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ivory-3);
  margin-top: 14px;
}
.var-tagline .tagline-img {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}
.var-tagline .tagline-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* inverted variant */
.var-tile.inverted {
  background: var(--bone);
  border-color: transparent;
}
.var-tile.inverted .wm {
  color: var(--ink);
}
.var-tile.inverted .sub {
  color: var(--ink-5);
}
.var-tile.inverted .var-label {
  color: var(--ink-4);
}

/* glyph / monogram variant */
.var-glyph {
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  padding: 20px 18px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  position: relative;
}
.var-glyph .var-label {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  position: absolute;
  top: 8px; left: 18px;
}
.var-glyph .glyph-mark {
  font-family: var(--font-display);
  font-size: 68px;
  font-weight: 400;
  text-transform: uppercase;
  line-height: 1;
  color: var(--ivory);
  letter-spacing: -.02em;
}
.var-glyph .glyph-sub {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin-top: 4px;
}

/* brass-lit variant */
.var-tile.brass-lit .wm { background: var(--brass-fill); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.var-tile.brass-lit .sub { color: var(--ivory-3); }
</style>
