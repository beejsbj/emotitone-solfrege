<template>
  <section class="preview-port preview-port--token-geometry">
    <div class="card">
      <div class="label">Geometry</div>
    
      <!-- ═══════════════════════════════════════════════════════════════
           1. CLIP-PATHS
           ══════════════════════════════════════════════════════════════ -->
      <div class="geo-section">
        <p class="section-head">Clip-Paths</p>
        <div class="clip-row">
    
          <div class="clip-cell">
            <div class="clip-sample clip-offcut">Off-Cut</div>
            <div class="clip-token">
              --clip-offcut
              <em>polygon(2% 6%, 96% 0%,<br>100% 8%, 98% 94%,<br>4% 100%, 0% 90%)</em>
            </div>
            <div class="clip-token" style="color:var(--ivory-4);font-size:8px">Badge, tab active</div>
          </div>
    
          <div class="clip-cell">
            <div class="clip-sample clip-tile">Tile Cut</div>
            <div class="clip-token">
              --clip-tile
              <em>polygon(3% 1%, 98% 2%,<br>100% 98%, 1% 99%)</em>
            </div>
            <div class="clip-token" style="color:var(--ivory-4);font-size:8px">Key / solfege tile</div>
          </div>
    
          <div class="clip-cell">
            <div class="clip-sample clip-tab">Tab Slide</div>
            <div class="clip-token">
              --clip-tab
              <em>polygon(2% 0, 100% 4%,<br>98% 100%, 0 96%)</em>
            </div>
            <div class="clip-token" style="color:var(--ivory-4);font-size:8px">Tab slide / smear</div>
          </div>
    
          <div class="clip-cell">
            <div class="clip-sample clip-paper-rip" style="width:100px;">Paper Rip</div>
            <div class="clip-token">
              --clip-paper-rip
              <em>polygon(0 0, 100% 0,<br>100% 4%, 88% 20%,<br>100% 40%, 78% 56%,<br>100% 78%, 100% 100%,<br>0 100%)</em>
            </div>
            <div class="clip-token" style="color:var(--ivory-4);font-size:8px">Tile-fired corner tear</div>
          </div>
    
        </div>
        <div class="caption" style="margin-top:10px">All polygon coords are percentage-based so clips scale with element size.</div>

        <p class="section-subhead">Circle-native cut paper</p>
        <div class="disc-row">
          <div class="disc-cell">
            <div class="disc-sample clip-disc-tile">Tile</div>
            <div class="clip-token">--clip-disc-tile</div>
          </div>
          <div class="disc-cell">
            <div class="disc-sample clip-disc-offcut">Off-Cut</div>
            <div class="clip-token">--clip-disc-offcut</div>
          </div>
          <div class="disc-cell">
            <div class="disc-sample clip-disc-tab">Tab</div>
            <div class="clip-token">--clip-disc-tab</div>
          </div>
          <div class="disc-cell">
            <div class="disc-sample clip-disc-paper-rip">Rip</div>
            <div class="clip-token">--clip-disc-paper-rip</div>
          </div>
          <div class="disc-cell">
            <div class="disc-sample clip-disc-rounded-stock">Stock</div>
            <div class="clip-token">--clip-disc-rounded-stock</div>
          </div>
        </div>
        <div class="caption" style="margin-top:10px">Complete silhouettes, not a rectangular clip stacked inside a circle. Any square consumer can employ them.</div>
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════════
           2. TRANSFORMS
           ══════════════════════════════════════════════════════════════ -->
      <div class="geo-section">
        <p class="section-head">Transforms</p>
    
        <div class="tilt-row">
          <!-- Proposed: --rot-tile-1 through --rot-tile-5 cycling ±0.15–0.5deg -->
          <div class="tilt-cell">
            <div class="tilt-tile t1">1</div>
            <div class="tilt-label">+0.2</div>
          </div>
          <div class="tilt-cell">
            <div class="tilt-tile t2">2</div>
            <div class="tilt-label">-0.3</div>
          </div>
          <div class="tilt-cell">
            <div class="tilt-tile t3">3</div>
            <div class="tilt-label">+0.5</div>
          </div>
          <div class="tilt-cell">
            <div class="tilt-tile t4">4</div>
            <div class="tilt-label">-0.15</div>
          </div>
          <div class="tilt-cell">
            <div class="tilt-tile t5">5</div>
            <div class="tilt-label">+0.45</div>
          </div>
          <div class="tilt-cell" style="margin-left:8px;align-self:flex-end">
            <div class="tilt-label" style="font-size:9px;color:var(--ivory-3);letter-spacing:.1em">PER-TILE TILT<br>±0.15–0.5 deg<br>hand-cut, not stamped</div>
          </div>
        </div>
    
        <div class="skew-row">
          <div class="skew-cell">
            <div class="skew-sample skew-offcut">Tab</div>
            <div class="clip-token">
              skew tab recipe
              <em>skewX(-2deg)</em>
              <em style="color:var(--ivory-4);font-size:7px">Active off-cut tab</em>
            </div>
          </div>
          <div class="skew-cell">
            <div class="skew-sample skew-rip">Smear</div>
            <div class="clip-token">
              smear recipe
              <em>scaleX(1.08) skewX(-12deg)</em>
              <em style="color:var(--ivory-4);font-size:7px">Smear exit / cut-slide</em>
            </div>
          </div>
          <div class="skew-cell">
            <div class="skew-sample skew-mode-out">Rip out</div>
            <div class="clip-token">
              rip-out recipe
              <em>skewX(-14deg) translateY(-8px)</em>
              <em style="color:var(--ivory-4);font-size:7px">Mode-rip knob exit</em>
            </div>
          </div>
    
          <div class="skew-cell" style="margin-left:8px">
            <div class="sticker-row" style="margin-top:0;">
              <div class="sticker-cell">
                <div class="sticker-sample sticker-a">Badge</div>
                <div class="tilt-label" style="font-size:8px">--rot-sticker<br>-2.2 deg</div>
              </div>
              <div class="sticker-cell">
                <div class="sticker-sample sticker-b">Poster</div>
                <div class="tilt-label" style="font-size:8px">--rot-sticker-lg<br>-3 deg</div>
              </div>
              <div class="sticker-cell">
                <div class="sticker-sample sticker-c">Mark</div>
                <div class="tilt-label" style="font-size:8px">--rot-mark<br>+2 deg</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════════
           3. BOX-SHADOWS
           ══════════════════════════════════════════════════════════════ -->
      <div class="geo-section">
        <p class="section-head">Box-Shadows</p>
        <div class="shadow-row">
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-ring">Ring</div>
            <div class="shadow-token">
              --ring
              <em>inset 0 0 0 1px var(--hairline)</em>
              <em style="color:var(--ivory-4);font-size:7px">Surface separation · everywhere</em>
            </div>
          </div>
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-key">Key Fall</div>
            <div class="shadow-token">
              --shadow-key
              <em>inset 0 -2px 0 rgba(0,0,0,.45),<br>inset 0 1px 0 rgba(255,255,255,.18)</em>
              <em style="color:var(--ivory-4);font-size:7px">Key / tile inner depth</em>
            </div>
          </div>
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-cut" style="background:var(--ink-5);">Cut</div>
            <div class="shadow-token">
              --shadow-cut
              <em>6px 6px 0 var(--ink)</em>
              <em style="color:var(--ivory-4);font-size:7px">Hard offset · cut-paper lift</em>
            </div>
          </div>
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-brass">Brass Ring</div>
            <div class="shadow-token">
              --shadow-glow-brass
              <em>inset hi/lo + 0 0 14px<br>rgba(224,169,58,.22)</em>
              <em style="color:var(--ivory-4);font-size:7px">Lit brass element</em>
            </div>
          </div>
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-2">Panel</div>
            <div class="shadow-token">
              --shadow-2
              <em>0 8px 24px rgba(0,0,0,.55),<br>inset 0 1px 0 rgba(255,255,255,.05)</em>
              <em style="color:var(--ivory-4);font-size:7px">Elevated panel / drawer</em>
            </div>
          </div>
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-pressed">Pressed</div>
            <div class="shadow-token">
              --shadow-pressed
              <em>inset 0 2px 6px rgba(0,0,0,.6)</em>
              <em style="color:var(--ivory-4);font-size:7px">Tap active / pressed state</em>
            </div>
          </div>
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-glow">Glow</div>
            <div class="shadow-token">
              --shadow-glow
              <em>0 0 0 1px hairline,<br>0 18px 60px -28px rgba(242,107,61,.35)</em>
              <em style="color:var(--ivory-4);font-size:7px">Hero panel ambient halo</em>
            </div>
          </div>
    
          <div class="shadow-cell">
            <div class="shadow-sample shadow-glow-brass">Brass Glow</div>
            <div class="shadow-token">
              --shadow-glow-brass
              <em>0 0 14px rgba(224,169,58,.45)</em>
              <em style="color:var(--ivory-4);font-size:7px">Lit brass signal — digital knob</em>
            </div>
          </div>
    
        </div>
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════════
           4. STROKES
           ══════════════════════════════════════════════════════════════ -->
      <div class="geo-section">
        <p class="section-head">Strokes</p>
        <div class="stroke-row">
    
          <!-- Butt vs Round cap contrast -->
          <div class="stroke-cell">
            <svg width="110" height="36" viewBox="0 0 110 36">
              <!-- butt (correct) -->
              <line x1="8" y1="10" x2="102" y2="10"
                    stroke="var(--ivory)" stroke-width="3"
                    stroke-linecap="butt"/>
              <!-- round (wrong) -->
              <line x1="8" y1="26" x2="102" y2="26"
                    stroke="var(--ivory-4)" stroke-width="3"
                    stroke-linecap="round"/>
            </svg>
            <div class="stroke-label">
              Butt (above) vs Round (below)
              <em>stroke-linecap: butt — enforced</em>
            </div>
          </div>
    
          <!-- 1px hairline -->
          <div class="stroke-cell">
            <svg width="80" height="36" viewBox="0 0 80 36">
              <line x1="4" y1="18" x2="76" y2="18"
                    stroke="var(--hairline)" stroke-width="1"
                    stroke-linecap="butt"/>
            </svg>
            <div class="stroke-label">
              1px hairline
              <em>stroke-width: 1<br>var(--hairline)</em>
            </div>
          </div>
    
          <!-- 2px chunky rule -->
          <div class="stroke-cell">
            <svg width="80" height="36" viewBox="0 0 80 36">
              <line x1="4" y1="18" x2="76" y2="18"
                    stroke="var(--ivory-3)" stroke-width="2"
                    stroke-linecap="butt"/>
            </svg>
            <div class="stroke-label">
              2px rule
              <em>stroke-width: 2<br>structural divider</em>
            </div>
          </div>
    
          <!-- 8px knob track (wide arc) -->
          <div class="stroke-cell">
            <svg width="60" height="36" viewBox="0 0 60 36">
              <path d="M 8 30 A 22 22 0 0 1 52 30"
                    fill="none" stroke="var(--ivory-4)" stroke-width="2"
                    stroke-linecap="butt"/>
              <path d="M 8 30 A 22 22 0 0 1 36 10"
                    fill="none" stroke="var(--ivory)" stroke-width="8"
                    stroke-linecap="butt"/>
            </svg>
            <div class="stroke-label">
              Knob track
              <em>stroke-width: 8<br>butt cap, miter join</em>
            </div>
          </div>
    
          <!-- dashed / dotted -->
          <div class="stroke-cell">
            <svg width="80" height="36" viewBox="0 0 80 36">
              <line x1="4" y1="12" x2="76" y2="12"
                    stroke="var(--ink-5)" stroke-width="1"
                    stroke-dasharray="4 3"
                    stroke-linecap="butt"/>
              <line x1="4" y1="24" x2="76" y2="24"
                    stroke="var(--ivory-4)" stroke-width="1"
                    stroke-dasharray="1 4"
                    stroke-linecap="butt"/>
            </svg>
            <div class="stroke-label">
              Dashed / dot
              <em>4 3 · 1 4 patterns<br>always butt-cap</em>
            </div>
          </div>
    
        </div>
        <div class="caption" style="margin-top:10px">Rule: all SVG strokes use stroke-linecap: butt. Round caps are never correct in this system — they imply a softness that conflicts with the cut-paper identity. Use stroke-linejoin: miter on paths.</div>
      </div>
    
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   GEOMETRY TOKEN CARD
   Catalogs recurring clip-path, transform, box-shadow, and stroke-cap
   patterns. Authoritative shared values live in
   emotitone-design-system.css; this component renders direct specimens.
   ===================================================================== */

/* ── Section layout ─────────────────────────────────────────────── */
.geo-section {
  margin-top: 20px;
}
.geo-section + .geo-section {
  margin-top: 28px;
}
.section-head {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
}

.section-subhead {
  margin: 18px 0 10px;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 8px;
  letter-spacing: .2em;
  text-transform: uppercase;
}

/* ── Clip-path tiles ─────────────────────────────────────────────── */
.clip-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.clip-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.clip-sample {
  width: 120px;
  height: 72px;
  background: var(--ink-3);
  box-shadow: var(--ring);
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ivory-2);
}

/* --clip-offcut: polygon(2% 6%, 96% 0%, 100% 8%, 98% 94%, 4% 100%, 0% 90%) */
.clip-offcut {
  clip-path: var(--clip-offcut);
}

/* --clip-tile: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%) */
.clip-tile {
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
}

/* --clip-tab: polygon(2% 0, 100% 4%, 98% 100%, 0 96%) */
.clip-tab {
  clip-path: polygon(2% 0, 100% 4%, 98% 100%, 0 96%);
}

/* --clip-paper-rip: polygon(0 0, 100% 0, 100% 4%, 88% 20%, 100% 40%, 78% 56%, 100% 78%, 100% 100%, 0 100%) */
.clip-paper-rip {
  clip-path: polygon(0 0, 100% 0, 100% 4%, 88% 20%, 100% 40%, 78% 56%, 100% 78%, 100% 100%, 0 100%);
}

.disc-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.disc-cell {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.disc-sample {
  display: grid;
  inline-size: 72px;
  block-size: 72px;
  place-items: center;
  background: var(--ivory);
  color: var(--ink);
  filter: drop-shadow(0 3px 0 var(--ink));
  font: var(--t-mono);
  font-size: 8px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.clip-disc-tile { clip-path: var(--clip-disc-tile); }
.clip-disc-offcut { clip-path: var(--clip-disc-offcut); }
.clip-disc-tab { clip-path: var(--clip-disc-tab); }
.clip-disc-paper-rip { clip-path: var(--clip-disc-paper-rip); }
.clip-disc-rounded-stock { clip-path: var(--clip-disc-rounded-stock); }

.clip-token {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-3);
  line-height: 1.5;
}
.clip-token em {
  display: block;
  font-style: normal;
  color: var(--ivory-4);
  font-size: 8px;
  margin-top: 1px;
}

/* ── Transform tiles ─────────────────────────────────────────────── */
.tilt-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.tilt-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.tilt-tile {
  width: 72px;
  height: 54px;
  background: var(--ink-3);
  box-shadow: var(--ring);
  border-radius: var(--r-xs);
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ivory-2);
}
/* Tile tilt convention: --rot-tile-* (±0.15–0.5deg, alternating) */
.tilt-tile.t1 { transform: rotate(0.2deg); }
.tilt-tile.t2 { transform: rotate(-0.3deg); }
.tilt-tile.t3 { transform: rotate(0.5deg); }
.tilt-tile.t4 { transform: rotate(-0.15deg); }
.tilt-tile.t5 { transform: rotate(0.45deg); }

.tilt-label {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-4);
}

.skew-row {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.skew-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.skew-sample {
  height: 36px;
  width: 120px;
  background: var(--ink-4);
  box-shadow: var(--ring);
  border-radius: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ivory-2);
}
/* specimen recipe: active tab slides with this cut */
.skew-offcut { transform: skewX(-2deg); }
/* specimen recipe: smear exit motion */
.skew-rip { transform: scaleX(1.08) skewX(-12deg); }
/* specimen recipe: mode-rip knob label exit */
.skew-mode-out { transform: translateY(-8px) skewX(-14deg); opacity: 0.3; }

/* Sticker rotation */
.sticker-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  align-items: flex-end;
}
.sticker-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.sticker-sample {
  width: 64px;
  height: 36px;
  background: var(--ink-4);
  box-shadow: var(--ring);
  border-radius: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ivory);
}
/* --rot-sticker: -2.2deg — brand badges / sticker tilt */
.sticker-a { transform: rotate(-2.2deg); }
/* --rot-sticker-lg: -3deg — large poster elements */
.sticker-b { transform: rotate(-3deg) translateY(-3px); }
/* --rot-mark: 2deg — cut-paper decorative mark */
.sticker-c { transform: rotate(2deg); }

/* ── Box-shadow swatches ─────────────────────────────────────────── */
.shadow-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.shadow-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shadow-sample {
  width: 130px;
  height: 70px;
  background: var(--ink-3);
  border-radius: var(--r-sm);
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ivory-3);
}

/* --ring: inset 0 0 0 1px var(--hairline) — surface separation everywhere */
.shadow-ring {
  box-shadow: inset 0 0 0 1px var(--hairline);
}

/* --shadow-key: inset 0 -2px 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.18) */
.shadow-key {
  box-shadow: var(--shadow-key);
}

/* --shadow-cut: 6px 6px 0 var(--ink) — hard offset, cut-paper lift */
.shadow-cut {
  box-shadow: var(--shadow-cut);
  position: relative; /* cut shadow needs stage contrast */
}

/* --shadow-glow-brass: 0 0 14px rgba(224,169,58,.18) + inset highlights — lit brass ring */
.shadow-brass {
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.55),
    inset 0 -1px 0 rgba(0,0,0,.45),
    0 1px 0 rgba(0,0,0,.6),
    0 0 0 1px rgba(0,0,0,.18),
    0 0 14px rgba(224,169,58,.22);
  border: 1px solid var(--brass-lo);
}

/* --shadow-2: 0 8px 24px rgba(0,0,0,.55) + inset 0 1px 0 rgba(255,255,255,.05) — panel lift */
.shadow-2 {
  box-shadow: var(--shadow-2);
}

/* --shadow-pressed: inset 0 2px 6px rgba(0,0,0,.6) — pressed state */
.shadow-pressed {
  box-shadow: var(--shadow-pressed);
  background: var(--ink-4);
}

/* --shadow-glow: hairline ring + tomato halo — hero panel ambient glow */
.shadow-glow {
  box-shadow: var(--shadow-glow);
}

/* --shadow-glow-brass: brass halo — canonical from the digital knob.
   Sample stays ink-3 (default) — we are showing the glow, not the brass fill. */
.shadow-glow-brass {
  box-shadow: var(--shadow-glow-brass);
}

.shadow-token {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ivory-3);
  line-height: 1.5;
  max-width: 130px;
}
.shadow-token em {
  display: block;
  font-style: normal;
  color: var(--ivory-4);
  font-size: 7px;
  margin-top: 1px;
}

/* ── Strokes ─────────────────────────────────────────────────────── */
.stroke-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.stroke-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.stroke-cell svg {
  display: block;
}
.stroke-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-3);
  text-align: center;
  line-height: 1.5;
}
.stroke-label em {
  display: block;
  font-style: normal;
  color: var(--ivory-4);
  font-size: 8px;
}

/* hairline weight */
.stroke-hairline { stroke-width: 1; }
/* chunky 2px rule */
.stroke-chunky   { stroke-width: 2; }
</style>
