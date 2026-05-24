<template>
  <section class="preview-port preview-port--primitive-buttons">
    <div class="card">
      <div class="label">BUTTONS &middot; ICON-BUTTON PRIMITIVE</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <!-- Hero: states row — rest / hover / active / disabled -->
        <div class="button-hero">
          <div class="states-cluster">
    
            <div class="state-unit">
              <button class="ico" title="Rest">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
                </svg>
              </button>
              <span class="state-pin-row">Rest</span>
            </div>
    
            <div class="state-unit">
              <button class="ico state-hover" title="Hover">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
                </svg>
              </button>
              <span class="state-pin-row">Hover</span>
            </div>
    
            <div class="state-unit">
              <button class="ico state-active" title="Active">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
                </svg>
              </button>
              <span class="state-pin-row">Active</span>
            </div>
    
            <div class="state-unit">
              <button class="ico disabled" disabled title="Disabled">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
                </svg>
              </button>
              <span class="state-pin-row">Disabled</span>
            </div>
    
          </div>
        </div>
    
        <div class="anatomy">
          <div class="row"><b>Shape</b><span>40&times;40 default &middot; r-sm &middot; border 0 &middot; grid center</span></div>
          <div class="row"><b>Fill</b><span>ink-3 default &middot; ivory solid &middot; transparent wire</span></div>
          <div class="row"><b>Ring</b><span>var(--ring) default &middot; 1.5px ink-5 wire</span></div>
          <div class="row"><b>Icon</b><span>SVG currentColor &middot; 12–18px &middot; butt stroke caps</span></div>
          <div class="row"><b>Sizes</b><span>sm 32 r-xs &middot; md 40 r-sm &middot; lg 48 r-sm</span></div>
          <div class="row"><b>State</b><span>hover ink-4 &middot; active inset ring &middot; disabled .35</span></div>
          <div class="row"><b>Brass</b><span>.brass-signal only &middot; one lit accent per panel</span></div>
        </div>
      </div>
    
      <!-- ═══ Geometry Variants ══════════════════════════════════════════ -->
      <div class="section-head">Geometry Variants</div>
      <div class="variants-full" style="grid-template-columns: repeat(6, 1fr);">
    
        <!-- r-0 sharp -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-sharp" title="Sharp">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M1 7h12M7 1v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="butt" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Sharp</div>
          <div class="variant-note">r-0 &middot; poster edge</div>
        </div>
    
        <!-- r-xs -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-rxs" title="r-xs">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="2.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">r-xs</div>
          <div class="variant-note">tight corner</div>
        </div>
    
        <!-- r-sm default -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico" title="r-sm default">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">r-sm</div>
          <div class="variant-note">default &middot; hardware</div>
        </div>
    
        <!-- r-md -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-rmd" title="r-md">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M4 2h6l2 2v6l-2 2H4L2 10V4z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">r-md</div>
          <div class="variant-note">soft panel</div>
        </div>
    
        <!-- clip-offcut -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-offcut" title="Off-cut clip">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M5 2 1 5l4 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="butt" stroke-linejoin="miter"/>
                <path d="M3 5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="butt" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Off-cut</div>
          <div class="variant-note">clip-offcut polygon</div>
        </div>
    
        <!-- clip-tile -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-tile" title="Tile clip">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="butt" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Tile</div>
          <div class="variant-note">clip-tile polygon</div>
        </div>
    
      </div>
    
      <!-- ═══ Fill Variants ═══════════════════════════════════════════════ -->
      <div class="section-head">Fill &amp; Signal Variants</div>
      <div class="variants-full" style="grid-template-columns: repeat(6, 1fr);">
    
        <!-- wire -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-wire" title="Wire">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <rect x="2" y="1" width="3.5" height="12" fill="currentColor"/>
                <rect x="8.5" y="1" width="3.5" height="12" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Wire</div>
          <div class="variant-note">transparent &middot; ink-5</div>
        </div>
    
        <!-- wire hairline -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-wire-hairline" title="Wire hairline">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="butt" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Hairline</div>
          <div class="variant-note">1px ghost &middot; minimum</div>
        </div>
    
        <!-- solid ivory -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-solid" title="Solid ivory">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Solid</div>
          <div class="variant-note">ivory &middot; ink icon</div>
        </div>
    
        <!-- hard-cut shadow -->
        <div class="variant-cell" style="background:var(--ink);">
          <div class="variant-demo">
            <button class="ico geo-cut geo-sharp" title="Hard cut">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 2l2.5 4.5h5l-4 3 1.5 5L7 11.5 2 14.5l1.5-5-4-3h5z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Cut shadow</div>
          <div class="variant-note">shadow-cut &middot; hard offset</div>
        </div>
    
        <!-- brass signal -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico brass-signal" title="Brass signal">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="5" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Brass</div>
          <div class="variant-note">one per panel &middot; lit</div>
        </div>
    
        <!-- size scale sm/md/lg -->
        <div class="variant-cell">
          <div class="variant-demo" style="gap:4px;">
            <button class="ico sm" title="Small">
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 1v8l6-4z" fill="currentColor"/>
              </svg>
            </button>
            <button class="ico" title="Medium">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
              </svg>
            </button>
            <button class="ico lg" title="Large">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4 2v14l11-7z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">SM / MD / LG</div>
          <div class="variant-note">32 &middot; 40 &middot; 48px</div>
        </div>
    
      </div>
    
      <!-- ═══ Brass Variants ═══════════════════════════════════════════════ -->
      <div class="section-head">Brass Variants</div>
      <div class="variants-full" style="grid-template-columns: repeat(6, 1fr);">
    
        <!-- brass-fill button -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="brass" style="width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:var(--r-sm);cursor:pointer;flex-shrink:0;transition:transform var(--dur-tap) var(--ease-stab);" title="Brass fill">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="var(--brass-edge)">
                <path d="M1 7h12M7 1v12" stroke="var(--brass-edge)" stroke-width="1.5" stroke-linecap="butt" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Brass Fill</div>
          <div class="variant-note">.brass gradient &middot; ink icon</div>
        </div>
    
        <!-- brass-wire button -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="brass-wire" style="width:40px;height:40px;display:grid;place-items:center;background:transparent;border:1.5px solid var(--brass);border-radius:var(--r-sm);cursor:pointer;flex-shrink:0;color:var(--brass);transition:box-shadow var(--dur-tap) var(--ease-stab);" title="Brass wire">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="5" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Brass Wire</div>
          <div class="variant-note">transparent &middot; brass border</div>
        </div>
    
        <!-- brass-glow button -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="brass-glow" style="width:40px;height:40px;display:grid;place-items:center;background:transparent;border:0;border-radius:var(--r-sm);cursor:pointer;flex-shrink:0;color:var(--ivory);box-shadow:var(--shadow-glow-brass);transition:box-shadow var(--dur-tap) var(--ease-stab);" title="Brass glow">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 2l2.5 4.5h5l-4 3 1.5 5L7 11.5 2 14.5l1.5-5-4-3h5z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Brass Glow</div>
          <div class="variant-note">halo &middot; active record</div>
        </div>
    
        <!-- empty cells for 6-column grid -->
        <div class="variant-cell" style="opacity:0;pointer-events:none;"></div>
        <div class="variant-cell" style="opacity:0;pointer-events:none;"></div>
        <div class="variant-cell" style="opacity:0;pointer-events:none;"></div>
    
      </div>
    
      <!-- ═══ Toggle &amp; Pair ══════════════════════════════════════════ -->
      <div class="section-head">Toggle &amp; Pair</div>
      <div class="variants-full" style="grid-template-columns: repeat(4, 1fr);">
    
        <!-- toggle rest -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico geo-wire" aria-pressed="false" title="Toggle off">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M5 4 9 7 5 10V4z" fill="currentColor"/>
                <path d="M10 5q1 2 0 4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="butt"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Toggle off</div>
          <div class="variant-note">wire &middot; rest</div>
        </div>
    
        <!-- toggle pressed -->
        <div class="variant-cell">
          <div class="variant-demo">
            <button class="ico toggle-on" aria-pressed="true" title="Toggle on">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M5 4 9 7 5 10V4z" fill="currentColor"/>
                <path d="M9 5l3 4M12 5l-3 4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="butt"/>
              </svg>
            </button>
          </div>
          <div class="variant-label">Toggle on</div>
          <div class="variant-note">ivory fill &middot; ink icon</div>
        </div>
    
        <!-- ico-pair vertical -->
        <div class="variant-cell">
          <div class="variant-demo">
            <div class="ico-pair">
              <button class="ico sm" title="Up octave">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M5 1l4 5H1z" fill="currentColor"/>
                </svg>
              </button>
              <button class="ico sm" title="Down octave">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M5 9 1 4h8z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="variant-label">ico-pair</div>
          <div class="variant-note">shared shell &middot; hairline divider</div>
        </div>
    
        <!-- ico-pair trio -->
        <div class="variant-cell">
          <div class="variant-demo">
            <div class="ico-pair">
              <button class="ico sm" title="Bars">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <rect x="1" y="2" width="2" height="6" fill="currentColor"/>
                  <rect x="4" y="2" width="2" height="6" fill="currentColor"/>
                  <rect x="7" y="2" width="2" height="6" fill="currentColor"/>
                </svg>
              </button>
              <button class="ico sm" title="Dots">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <circle cx="2" cy="5" r="1.5" fill="currentColor"/>
                  <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="5" r="1.5" fill="currentColor"/>
                </svg>
              </button>
              <button class="ico sm" title="Back">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1 5h8M1 5l3-3M1 5l3 3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="butt"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="variant-label">Trio pair</div>
          <div class="variant-note">3-up &middot; hairline dividers</div>
        </div>
    
      </div>
    
      <div class="caption" style="margin-top:14px">Icon-only touch targets. Ink/ivory chrome only — brass reserved for the one lit signal per panel. Shape toolbox: r-0 poster, r-xs tight, r-sm hardware default, clip-offcut tab, clip-tile key. Wire or solid fills; toggle flips to ivory-fill/ink-icon on press.</div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   BUTTONS — ICON-BUTTON PRIMITIVE
   Icon-only touch buttons. Ink/ivory chrome + ONE brass-lit signal.
   Geometry variants demonstrate the shape toolbox: clip-paths, radius
   scale, hard-cut shadow, wire and solid fills.
   ===================================================================== */

/* ── Shared grammar (specimen-card-grammar — verbatim) ──────────────── */
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

/* ── Hero stage ──────────────────────────────────────────────────────── */
.button-hero {
  min-height: 130px;
  display: grid;
  place-items: center;
  background: var(--ink);
  border: 1px solid var(--ink-5);
}

/* States cluster inside hero */
.states-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
}
.state-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.state-pin-row {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
}

/* ── Base icon button ─────────────────────────────────────────────────── */
.ico {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--ink-3);
  box-shadow: var(--ring);
  border-radius: var(--r-sm);
  border: 0;
  color: var(--ivory);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background var(--dur-tap) var(--ease-stab),
    box-shadow var(--dur-tap) var(--ease-stab),
    transform var(--dur-tap) var(--ease-stab),
    opacity var(--dur-tap) var(--ease-stab);
}
.ico:hover { background: var(--ink-4); }
.ico:active { transform: scale(.96); }
.ico.sm { width: 32px; height: 32px; border-radius: var(--r-xs); }
.ico.lg { width: 48px; height: 48px; border-radius: var(--r-sm); }

/* ── State modifiers ──────────────────────────────────────────────────── */
.ico.state-hover {
  background: var(--ink-4);
}
.ico.state-active {
  background: var(--ink-4);
  box-shadow: inset 0 0 0 1px var(--ink-5);
}
.ico:disabled,
.ico.disabled {
  opacity: .35;
  cursor: not-allowed;
}

/* ── Geometry variants ───────────────────────────────────────────────── */

/* Sharp / no radius (r-0) */
.ico.geo-sharp {
  border-radius: 0;
}

/* Smallest radius step (r-xs) */
.ico.geo-rxs {
  border-radius: var(--r-xs);
}

/* r-md — softer hardware panel feel */
.ico.geo-rmd {
  border-radius: var(--r-md);
}

/* Clip-offcut: badge/tab off-cut polygon */
.ico.geo-offcut {
  border-radius: 0;
  clip-path: polygon(4% 0%, 98% 6%, 100% 90%, 96% 100%, 2% 94%, 0% 8%);
}

/* Clip-tile: key/solfege tile polygon */
.ico.geo-tile {
  border-radius: 0;
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
}

/* Hard-cut shadow: cut offset lift */
.ico.geo-cut {
  border-radius: 0;
  box-shadow: var(--shadow-cut), var(--ring);
  background: var(--ink-4);
  /* needs stage offset — parent provides contrast */
}

/* Wire: transparent, hairline ring */
.ico.geo-wire {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--ink-5);
  color: var(--ivory-2);
}

/* Wire hairline: thinnest ghost */
.ico.geo-wire-hairline {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--hairline);
  color: var(--ivory-4);
}

/* Solid ivory: max-contrast fill */
.ico.geo-solid {
  background: var(--ivory);
  color: var(--ink);
  box-shadow: none;
  border-radius: var(--r-xs);
}

/* Brass signal: ONE lit accent per panel */
.ico.brass-signal {
  color: var(--brass-edge);
}

/* Toggle pressed-on: ivory fill + ink icon */
.ico.toggle-on {
  background: var(--ivory);
  color: var(--ink);
  box-shadow: none;
}

/* Brass-wire: transparent, brass border, glow on hover */
.brass-wire:hover {
  box-shadow: var(--shadow-glow-brass);
}

/* Brass-glow: halo accent, suggests "active record" or lit state */
.brass-glow:hover {
  box-shadow: var(--shadow-glow-brass), 0 0 20px rgba(224,169,58,.65);
}

/* ico-pair: shared shell for grouped buttons */
.ico-pair {
  display: flex;
  background: var(--ink-3);
  box-shadow: var(--ring);
  border-radius: var(--r-sm);
  overflow: hidden;
}
.ico-pair .ico {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}
.ico-pair .ico + .ico { border-left: 1px solid var(--hairline); }

/* ── Variant cell chrome ─────────────────────────────────────────────── */
.variant-cell {
  min-height: 104px;
  display: grid;
  grid-template-rows: 56px auto auto;
  justify-items: center;
  align-items: center;
  gap: 6px;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
  padding: 12px 8px 10px;
  box-sizing: border-box;
}
/* hand-cut tilt per cell */
.variant-cell:nth-child(1) { transform: rotate(0.2deg); }
.variant-cell:nth-child(2) { transform: rotate(-0.3deg); }
.variant-cell:nth-child(3) { transform: rotate(0.15deg); }
.variant-cell:nth-child(4) { transform: rotate(-0.25deg); }
.variant-cell:nth-child(5) { transform: rotate(0.2deg); }
.variant-cell:nth-child(6) { transform: rotate(-0.2deg); }
.variant-cell:nth-child(7) { transform: rotate(0.35deg); }
.variant-cell:nth-child(8) { transform: rotate(-0.15deg); }
.variant-cell:nth-child(9) { transform: rotate(0.1deg); }
.variant-cell:nth-child(10) { transform: rotate(-0.3deg); }
.variant-cell:nth-child(11) { transform: rotate(0.25deg); }
.variant-cell:nth-child(12) { transform: rotate(-0.2deg); }

.variant-demo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.variant-label {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  color: var(--ivory);
}
.variant-note {
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  color: var(--ivory-4);
}

/* ── SVG display ─────────────────────────────────────────────────────── */
.ico svg { display: block; }

/* ── Reduced-motion guard ────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .ico {
    transition: none !important;
  }
  .ico.brass-signal::after,
  .brass,
  .brass-wire,
  .brass-glow {
    animation: none !important;
  }
}
</style>
