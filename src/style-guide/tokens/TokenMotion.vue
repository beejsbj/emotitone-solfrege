<template>
  <section class="preview-port preview-port--token-motion">
    <div class="card">
    
      <div class="label">Motion</div>
    
      <div class="caption" style="margin-bottom:4px">
        Beat is the clock. Duration tokens are how long a gesture takes. Easing tokens are its curve. Keyframes are the named recipes that combine them.
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           BLOCK 1 — RHYTHM · BEAT
           ═══════════════════════════════════════════════════════════ -->
      <div class="block">
        <div class="block-head">Rhythm · Beat</div>
        <div class="kf-row">
    
          <div class="kf beat-cell beat-120">
            <div class="stage">
              <span class="bpm-badge">120</span>
              <div class="beats"><b></b><b></b><b></b><b></b></div>
            </div>
            <div class="kf-name">--beat · default</div>
            <div class="kf-role">500ms · typical · house / hiphop</div>
          </div>
    
          <div class="kf beat-cell beat-60">
            <div class="stage">
              <span class="bpm-badge">60</span>
              <div class="beats"><b></b><b></b><b></b><b></b></div>
            </div>
            <div class="kf-name">--beat × 2</div>
            <div class="kf-role">1000ms · ballad · half-time</div>
          </div>
    
          <div class="kf beat-cell beat-240">
            <div class="stage">
              <span class="bpm-badge">240</span>
              <div class="beats"><b></b><b></b><b></b><b></b></div>
            </div>
            <div class="kf-name">--beat ÷ 2</div>
            <div class="kf-role">250ms · drum &amp; bass · double-time</div>
          </div>
    
        </div>
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           BLOCK 2 — GESTURE · DURATION
           ═══════════════════════════════════════════════════════════ -->
      <div class="block">
        <div class="block-head">Gesture · Duration</div>
        <div class="kf-row">
    
          <div class="kf dur-cell tap">
            <div class="stage">
              <div class="stage-name">Tap</div>
              <div class="stage-ms">90<sup>ms</sup></div>
              <div class="dur-track"><i></i></div>
            </div>
            <div class="kf-name">--dur-tap</div>
            <div class="kf-role">90ms · press · ripple · instant ack</div>
          </div>
    
          <div class="kf dur-cell ui">
            <div class="stage">
              <div class="stage-name">UI</div>
              <div class="stage-ms">220<sup>ms</sup></div>
              <div class="dur-track"><i></i></div>
            </div>
            <div class="kf-name">--dur-ui</div>
            <div class="kf-role">220ms · tab swap · chip · segmented</div>
          </div>
    
          <div class="kf dur-cell panel">
            <div class="stage">
              <div class="stage-name">Panel</div>
              <div class="stage-ms">360<sup>ms</sup></div>
              <div class="dur-track"><i></i></div>
            </div>
            <div class="kf-name">--dur-panel</div>
            <div class="kf-role">360ms · drawer in/out · mode change</div>
          </div>
    
          <div class="kf dur-cell scene">
            <div class="stage">
              <div class="stage-name">Scene</div>
              <div class="stage-ms">600<sup>ms</sup></div>
              <div class="dur-track"><i></i></div>
            </div>
            <div class="kf-name">--dur-scene</div>
            <div class="kf-role">600ms · visual fx fade · hero swap</div>
          </div>
    
        </div>
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           BLOCK 3 — GESTURE · EASING
           ═══════════════════════════════════════════════════════════ -->
      <div class="block">
        <div class="block-head">Gesture · Easing · Horn Section</div>
        <div class="kf-row">
    
          <div class="kf ease-cell">
            <div class="stage">
              <div class="ease-name-big">Swing</div>
              <svg viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d="M0 28 C 70 32, 30 -4, 100 0" stroke="var(--brass)" stroke-width="1.5" fill="none" stroke-linecap="butt"/>
              </svg>
              <div class="ease-track"><div class="e-dot swing"></div></div>
            </div>
            <div class="kf-name">--ease-swing</div>
            <div class="kf-role">Press-play · tabs · drawer-in</div>
          </div>
    
          <div class="kf ease-cell">
            <div class="stage">
              <div class="ease-name-big">Stab</div>
              <svg viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d="M0 28 C 20 0, 30 0, 100 0" stroke="var(--tomato)" stroke-width="1.5" fill="none" stroke-linecap="butt"/>
              </svg>
              <div class="ease-track"><div class="e-dot stab"></div></div>
            </div>
            <div class="kf-name">--ease-stab</div>
            <div class="kf-role">Key hit · press · snap in</div>
          </div>
    
          <div class="kf ease-cell">
            <div class="stage">
              <div class="ease-name-big">Brush</div>
              <svg viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d="M0 28 C 40 28, 60 0, 100 0" stroke="var(--ivory)" stroke-width="1.5" fill="none" stroke-linecap="butt"/>
              </svg>
              <div class="ease-track"><div class="e-dot brush"></div></div>
            </div>
            <div class="kf-name">--ease-brush</div>
            <div class="kf-role">Reveal fade · drift · smooth out</div>
          </div>
    
          <div class="kf ease-cell">
            <div class="stage">
              <div class="ease-name-big">Sustain</div>
              <svg viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d="M0 28 L 100 0" stroke="var(--pine)" stroke-width="1.5" fill="none" stroke-linecap="butt"/>
              </svg>
              <div class="ease-track"><div class="e-dot sustain"></div></div>
            </div>
            <div class="kf-name">--ease-sustain</div>
            <div class="kf-role">Flywheel · playhead · meters</div>
          </div>
    
          <div class="kf ease-cell">
            <div class="stage">
              <div class="ease-name-big">Bend</div>
              <svg viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d="M0 28 C 60 26, 40 2, 100 0" stroke="var(--plum)" stroke-width="1.5" fill="none" stroke-linecap="butt"/>
              </svg>
              <div class="ease-track"><div class="e-dot bend"></div></div>
            </div>
            <div class="kf-name">--ease-bend</div>
            <div class="kf-role">Pitch mode-change · tears &amp; recovers</div>
          </div>
    
        </div>
      </div>
    
      <!-- ═══════════════════════════════════════════════════════════
           BLOCK 4 — KEYFRAMES
           Lifted from prior token-motion-keyframes specimen
           ═══════════════════════════════════════════════════════════ -->
      <div class="block">
        <div class="block-head">Keyframes</div>
    
        <!-- GROUP A — RHYTHM / BEAT -->
        <div class="group">
          <div class="group-label">Rhythm · Beat</div>
          <div class="swatches">
    
            <div class="kf-kf">
              <div class="kf-stage demo-beat">
                <div class="dot"></div>
              </div>
              <div class="kf-name">beat</div>
              <div class="kf-role">Global quarter-note scale pulse. Applied via .beat-pulse</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-pulse">
                <div class="dot"></div>
              </div>
              <div class="kf-name">pulse</div>
              <div class="kf-role">Knob ring breathes on every quarter note</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-strobe">
                <div class="wire"></div>
              </div>
              <div class="kf-name">strobe</div>
              <div class="kf-role">Panel wire heats on the downbeat (bar 1), steps(1)</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-bob">
                <div class="dot"></div>
              </div>
              <div class="kf-name">bob</div>
              <div class="kf-role">Tile drops 2 px on the &amp;-of-beat, staggered per tile</div>
            </div>
    
          </div>
        </div>
    
        <!-- GROUP B — TRANSITION -->
        <div class="group">
          <div class="group-label">Transition</div>
          <div class="swatches">
    
            <div class="kf-kf">
              <div class="kf-stage demo-slide">
                <div class="dot"></div>
              </div>
              <div class="kf-name">cut-slide-in</div>
              <div class="kf-role">Off-cut tab swap — skewX + translateX + fade. Ease-stab</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-rip">
                <div class="rip-corner"></div>
              </div>
              <div class="kf-name">rip</div>
              <div class="kf-role">Paper corner tears off top-right of tile on fire</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-cross-fade-rip">
                <span class="cf-label">Lydian</span>
                <span class="cf-label">Locrian</span>
                <span class="cf-label">Dorian</span>
                <span class="cf-label">Aeolian</span>
              </div>
              <div class="kf-name">rip-mode</div>
              <div class="kf-role">Cross-fade-rip: old tears up, new slides in. Ease-bend</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-lift">
                <div class="dot"></div>
              </div>
              <div class="kf-name">lift</div>
              <div class="kf-role">Tile rises 3 px on tap, returns by 34 %. Ease-stab</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-smear">
                <div class="dot"></div>
              </div>
              <div class="kf-name">smear</div>
              <div class="kf-role">Horizontal stretch-snap. Lifted from v2 .p5-active.smearing</div>
            </div>
    
          </div>
        </div>
    
        <!-- GROUP C — FEEDBACK -->
        <div class="group">
          <div class="group-label">Feedback · Flash · Glow</div>
          <div class="swatches">
    
            <div class="kf-kf">
              <div class="kf-stage demo-ring">
                <div class="ring-el"></div>
                <div class="dot-sm"></div>
              </div>
              <div class="kf-name">ring</div>
              <div class="kf-role">Chromatic ring expands to 1.5× and fades on tile fire</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-flash">
                <div class="ring-el"></div>
                <div class="dot"></div>
              </div>
              <div class="kf-name">ring-flash</div>
              <div class="kf-role">Brass ring strobes on the downbeat (knob outer edge)</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-flash-tile">
                <div class="ring-el"></div>
                <div class="dot"></div>
              </div>
              <div class="kf-name">flash</div>
              <div class="kf-role">Tile fire — rise + scale + brighten. Lifted from v2 tileFire</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage demo-paper-rip-flash">
                <div class="ring-el"></div>
                <div class="dot"></div>
              </div>
              <div class="kf-name">paper-rip-flash</div>
              <div class="kf-role">Composed: lift + flash + flash-ring layered on one tile</div>
            </div>
    
          </div>
        </div>
    
        <!-- GROUP D — GESTURE EASES (ease-run on each curve) -->
        <div class="group">
          <div class="group-label">Gesture Eases · Horn Section</div>
          <div class="swatches">
    
            <div class="kf-kf">
              <div class="kf-stage">
                <div class="kf-ease-name-big">Swing</div>
                <div class="kf-ease-track"><div class="e-dot swing"></div></div>
              </div>
              <div class="kf-name">ease-swing</div>
              <div class="kf-role">Overshoot. Tabs, knobs, drawer-in</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage">
                <div class="kf-ease-name-big">Stab</div>
                <div class="kf-ease-track"><div class="e-dot stab"></div></div>
              </div>
              <div class="kf-name">ease-stab</div>
              <div class="kf-role">Snap in. Press, play, hit</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage">
                <div class="kf-ease-name-big">Brush</div>
                <div class="kf-ease-track"><div class="e-dot brush"></div></div>
              </div>
              <div class="kf-name">ease-brush</div>
              <div class="kf-role">Smooth fade. Reveal, drift</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage">
                <div class="kf-ease-name-big">Sustain</div>
                <div class="kf-ease-track"><div class="e-dot sustain"></div></div>
              </div>
              <div class="kf-name">ease-sustain</div>
              <div class="kf-role">Linear. Playhead, scrub, meters</div>
            </div>
    
            <div class="kf-kf">
              <div class="kf-stage">
                <div class="kf-ease-name-big">Bend</div>
                <div class="kf-ease-track"><div class="e-dot bend"></div></div>
              </div>
              <div class="kf-name">ease-bend</div>
              <div class="kf-role">Tears and recovers. Pitch, mode change</div>
            </div>
    
          </div>
        </div>
    
        <!-- GROUP E — BRASS / SHIMMER -->
        <div class="group">
          <div class="group-label">Brass · Shimmer</div>
          <div class="swatches">
    
            <div class="kf-kf" style="width:200px">
              <div class="kf-stage" style="width:200px">
                <div class="demo-shimmer" style="position:absolute;inset:0">
                  <div class="brass-bar"></div>
                </div>
              </div>
              <div class="kf-name">brass-sheen · shimmer</div>
              <div class="kf-role">Gradient sweep across brass fills. 6.5 s, cubic. One signal max</div>
            </div>
    
          </div>
        </div>
    
        <div class="caption" style="margin-top:20px;color:var(--fg-3);line-height:1.55">
          All keyframes now defined globally in <code>colors_and_type.css</code>: rhythm (<code>beat</code>, <code>pulse</code>, <code>bob</code>, <code>strobe</code>, <code>beat-cell</code>, <code>beat-down</code>), transition (<code>cut-slide-in</code>, <code>rip</code>, <code>rip-mode</code>, <code>smear</code>, <code>cross-fade-rip</code>, <code>lift</code>), feedback (<code>ring</code>, <code>ring-flash</code>, <code>flash</code>, <code>flash-ring</code>), brand (<code>brass-sheen</code>). <code>paper-rip-flash</code> is a composition of <code>lift</code> + <code>flash</code> + <code>flash-ring</code>, not its own keyframe. <code>glow</code> is promoted to a static shadow token (<code>--shadow-glow</code>) — see Geometry tokens.
          The five "gesture eases" (swing / stab / brush / sustain / bend) are easing curves, not keyframes — shown here on the shared <code>ease-run</code> track for comparison.
        </div>
    
      </div><!-- .block -->
    
    </div><!-- .card -->
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* ─── TOKENS · MOTION ────────────────────────────────────────────
   Beat · Duration · Easing · Keyframes — all motion tokens in one
   card using the named-cell-grid pattern (no specimen grammar).
   ─────────────────────────────────────────────────────────── */

/* ── block chrome ─────────────────────────────────────────────── */
.block {
  margin-top: 24px;
}
.block-head {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ivory-4);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ink-5);
  margin-bottom: 12px;
}

/* ── shared swatch cell chrome ────────────────────────────────── */
.kf-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.kf {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.kf:nth-child(1) { transform: rotate(-0.3deg); }
.kf:nth-child(2) { transform: rotate( 0.2deg); }
.kf:nth-child(3) { transform: rotate(-0.2deg); }
.kf:nth-child(4) { transform: rotate( 0.3deg); }
.kf:nth-child(5) { transform: rotate(-0.25deg); }
.kf:nth-child(6) { transform: rotate( 0.2deg); }
.kf:nth-child(7) { transform: rotate(-0.3deg); }

.stage {
  background: var(--ink);
  border: 1px solid var(--ink-5);
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.kf-name {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-2);
  line-height: 1.2;
}
.kf-role {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  color: var(--ivory-4);
  line-height: 1.35;
}

/* ════════════════════════════════════════════════════════════════
   BLOCK 1 — RHYTHM · BEAT
   Four-cell beat indicator pulsing at different tempos.
   ════════════════════════════════════════════════════════════════ */

.beat-cell .stage {
  width: 160px;
  height: 80px;
  flex-direction: column;
  gap: 10px;
}
.beats {
  display: flex;
  gap: 5px;
  align-items: flex-end;
}
.beats b {
  width: 18px;
  height: 18px;
  display: block;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
}
.beats b:nth-child(1) {
  background: var(--brass-fill);
}

@keyframes beat-cell {
  0%, 100% { transform: scaleY(1); }
  5%        { transform: scaleY(1.35); }
  55%       { transform: scaleY(0.9); }
}

/* BPM indicator label */
.bpm-badge {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ivory-2);
  line-height: 1;
  position: absolute;
  top: 8px;
  right: 10px;
}

/* each cell animates its beats at the target BPM */
.beat-120 .beats b:nth-child(1) { animation: beat-cell 500ms  var(--ease-stab) infinite; animation-delay: 0ms; }
.beat-120 .beats b:nth-child(2) { animation: beat-cell 500ms  var(--ease-stab) infinite; animation-delay: 125ms; }
.beat-120 .beats b:nth-child(3) { animation: beat-cell 500ms  var(--ease-stab) infinite; animation-delay: 250ms; }
.beat-120 .beats b:nth-child(4) { animation: beat-cell 500ms  var(--ease-stab) infinite; animation-delay: 375ms; }

.beat-60  .beats b:nth-child(1) { animation: beat-cell 1000ms var(--ease-stab) infinite; animation-delay: 0ms; }
.beat-60  .beats b:nth-child(2) { animation: beat-cell 1000ms var(--ease-stab) infinite; animation-delay: 250ms; }
.beat-60  .beats b:nth-child(3) { animation: beat-cell 1000ms var(--ease-stab) infinite; animation-delay: 500ms; }
.beat-60  .beats b:nth-child(4) { animation: beat-cell 1000ms var(--ease-stab) infinite; animation-delay: 750ms; }

.beat-240 .beats b:nth-child(1) { animation: beat-cell 250ms  var(--ease-stab) infinite; animation-delay: 0ms; }
.beat-240 .beats b:nth-child(2) { animation: beat-cell 250ms  var(--ease-stab) infinite; animation-delay: 62ms; }
.beat-240 .beats b:nth-child(3) { animation: beat-cell 250ms  var(--ease-stab) infinite; animation-delay: 125ms; }
.beat-240 .beats b:nth-child(4) { animation: beat-cell 250ms  var(--ease-stab) infinite; animation-delay: 188ms; }

/* ════════════════════════════════════════════════════════════════
   BLOCK 2 — GESTURE · DURATION
   Ivory bar fills over each token's duration (looped).
   ════════════════════════════════════════════════════════════════ */

.dur-cell .stage {
  width: 155px;
  height: 80px;
  padding: 10px 12px;
  flex-direction: column;
  justify-content: space-between;
}

.stage-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ivory);
  line-height: 1;
  align-self: flex-start;
}
.stage-ms {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  color: var(--brass);
  letter-spacing: 0.02em;
  position: absolute;
  top: 10px;
  right: 10px;
}
.stage-ms sup {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  color: var(--ivory-4);
  vertical-align: 4px;
  margin-left: 2px;
}
.dur-track {
  width: 100%;
  height: 8px;
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  position: relative;
  overflow: hidden;
  align-self: flex-end;
}
.dur-track i {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  background: var(--ivory);
  width: 8px;
}

@keyframes dur-fill {
  0%, 5%  { width: 8px; }
  48%     { width: calc(100% - 8px); }
  52%     { width: calc(100% - 8px); }
  100%    { width: 8px; }
}

.dur-cell.tap   .dur-track i { animation: dur-fill 1.4s var(--ease-stab)   infinite; }
.dur-cell.ui    .dur-track i { animation: dur-fill 1.8s var(--ease-brush)  infinite; }
.dur-cell.panel .dur-track i { animation: dur-fill 2.4s var(--ease-swing)  infinite; }
.dur-cell.scene .dur-track i { animation: dur-fill 3.2s var(--ease-bend)   infinite; }

/* ════════════════════════════════════════════════════════════════
   BLOCK 3 — GESTURE · EASING
   Bezier curve SVG + runner dot per easing token.
   ════════════════════════════════════════════════════════════════ */

.ease-cell .stage {
  width: 120px;
  height: 90px;
}

.ease-name-big {
  position: absolute;
  top: 8px;
  left: 9px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ivory-2);
  line-height: 1;
}

.ease-cell .stage svg {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 22px;
  width: calc(100% - 16px);
  height: 30px;
}

.ease-track {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 8px;
  bottom: 8px;
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
}
.ease-track .e-dot {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  background: var(--ivory);
  transform: translateY(-50%);
}

@keyframes ease-run {
  0%   { left: 4px; }
  50%  { left: calc(100% - 12px); }
  100% { left: 4px; }
}

.ease-track .e-dot.swing   { animation: ease-run 2.2s var(--ease-swing)   infinite; }
.ease-track .e-dot.stab    { animation: ease-run 1.6s var(--ease-stab)    infinite; }
.ease-track .e-dot.brush   { animation: ease-run 2.0s var(--ease-brush)   infinite; }
.ease-track .e-dot.sustain { animation: ease-run 2.4s var(--ease-sustain) infinite; }
.ease-track .e-dot.bend    { animation: ease-run 2.0s var(--ease-bend)    infinite; }

/* ════════════════════════════════════════════════════════════════
   BLOCK 4 — KEYFRAMES (lifted verbatim from tokens-motion-keyframes)
   ════════════════════════════════════════════════════════════════ */

.group {
  margin-top: 20px;
}
.group-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ivory-4);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ink-5);
  margin-bottom: 10px;
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.kf-kf {
  width: 100px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.kf-kf:nth-child(1)  { transform: rotate(-0.3deg); }
.kf-kf:nth-child(2)  { transform: rotate(0.2deg); }
.kf-kf:nth-child(3)  { transform: rotate(-0.2deg); }
.kf-kf:nth-child(4)  { transform: rotate(0.3deg); }
.kf-kf:nth-child(5)  { transform: rotate(-0.25deg); }
.kf-kf:nth-child(6)  { transform: rotate(0.2deg); }
.kf-kf:nth-child(7)  { transform: rotate(-0.3deg); }

.kf-stage {
  width: 100px;
  height: 70px;
  background: var(--ink);
  border: 1px solid var(--ink-5);
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.kf-kf .kf-name { color: var(--ivory-2); }
.kf-kf .kf-role { color: var(--ivory-4); }

/* ── dots / wires for keyframe demos ─────────────────────────── */
.dot {
  width: 18px;
  height: 18px;
  background: var(--ivory);
  border-radius: 0;
}
.dot-sm {
  width: 10px;
  height: 10px;
  background: var(--ivory);
}
.wire {
  position: absolute;
  inset: 10px;
  border: 1px solid var(--hairline);
}
.panel-demo {
  position: absolute;
  inset: 8px;
  background: var(--ink-2);
  border: 1px solid var(--hairline);
}

/* GROUP A — RHYTHM / BEAT */
.demo-beat .dot   { animation: beat var(--beat) var(--ease-stab) infinite; }
.demo-pulse .dot  { animation: pulse var(--beat) var(--ease-stab) infinite; }
.demo-strobe .wire { animation: strobe 2s steps(1) infinite; }
.demo-bob .dot    { animation: bob var(--beat) var(--ease-brush) infinite; }

/* GROUP B — TRANSITION */
.demo-slide .dot  { animation: cut-slide-in var(--dur-panel) var(--ease-stab) infinite; position: absolute; }
.demo-rip .rip-corner {
  width: 20px;
  height: 20px;
  background: var(--ivory-2);
  clip-path: polygon(0 0, 100% 0, 100% 4%, 88% 20%, 100% 40%, 78% 56%, 100% 78%, 100% 100%, 0 100%);
  animation: rip 1.8s var(--ease-stab) infinite;
}
.demo-cross-fade-rip {
  overflow: hidden;
  flex-direction: column;
  gap: 0;
}
.demo-cross-fade-rip .cf-label {
  position: absolute;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ivory);
  animation: cross-fade-rip 2.8s var(--ease-bend) infinite;
}
.demo-cross-fade-rip .cf-label:nth-child(2) { animation-delay: 700ms; }
.demo-cross-fade-rip .cf-label:nth-child(3) { animation-delay: 1400ms; }
.demo-cross-fade-rip .cf-label:nth-child(4) { animation-delay: 2100ms; }
.demo-lift .dot   { animation: lift 1.6s var(--ease-stab) infinite; }

/* smear — horizontal stretch-snap (lifted from v2 .p5-active.smearing) */
.demo-smear .dot  { animation: smear 1.8s var(--ease-swing) infinite; }

/* flash — standalone tile fire (lifted from v2 @keyframes tileFire) */
.demo-flash-tile .dot {
  background: var(--note-do);
  animation: flash 1.6s var(--ease-stab) infinite;
}
.demo-flash-tile .ring-el {
  position: absolute;
  inset: 14px;
  border: 2px solid var(--note-do);
  border-radius: 0;
  opacity: 0;
}

/* paper-rip-flash — composed: lift + flash + flash-ring layered */
.demo-paper-rip-flash .dot {
  background: var(--note-do);
  animation: flash 1.6s var(--ease-stab) infinite, lift 1.6s var(--ease-stab) infinite;
}
.demo-paper-rip-flash .ring-el {
  position: absolute;
  inset: 14px;
  border: 2px solid var(--note-do);
  border-radius: 0;
  animation: flash-ring 1.6s var(--ease-brush) infinite;
}

/* GROUP C — FEEDBACK */
.demo-ring .ring-el {
  position: absolute;
  inset: 14px;
  border: 2px solid var(--note-do);
  animation: ring 2s var(--ease-brush) infinite;
}
.demo-flash .ring-el {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  border: 1px solid transparent;
  animation: ring-flash 2s linear infinite;
}

/* GROUP D — ease-run track for keyframes card (reuse shared @keyframes) */
.kf-ease-track {
  position: absolute;
  left: 6px; right: 6px;
  height: 8px;
  bottom: 16px;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
}
.kf-ease-track .e-dot {
  position: absolute;
  top: 50%;
  width: 8px; height: 8px;
  background: var(--ivory);
  transform: translateY(-50%);
}
.kf-ease-track .e-dot.swing   { animation: ease-run 2.2s var(--ease-swing)   infinite; }
.kf-ease-track .e-dot.stab    { animation: ease-run 1.6s var(--ease-stab)    infinite; }
.kf-ease-track .e-dot.brush   { animation: ease-run 2.0s var(--ease-brush)   infinite; }
.kf-ease-track .e-dot.sustain { animation: ease-run 2.4s var(--ease-sustain) infinite; }
.kf-ease-track .e-dot.bend    { animation: ease-run 2.0s var(--ease-bend)    infinite; }

.kf-ease-name-big {
  position: absolute;
  top: 8px;
  left: 8px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ivory-2);
  line-height: 1;
}

/* GROUP E — BRASS */
.demo-shimmer .brass-bar {
  position: absolute;
  inset: 12px;
  background: var(--brass-fill);
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.55),
    inset 0 -1px 0 rgba(0,0,0,.45);
}
.demo-shimmer .brass-bar::after {
  content: "";
  position: absolute;
  inset: -10% -30%;
  background: var(--brass-sheen);
  background-size: 220% 100%;
  background-repeat: no-repeat;
  pointer-events: none;
  mix-blend-mode: screen;
  animation: brass-sheen 6.5s cubic-bezier(.55,.05,.45,.95) infinite;
}

/* ─── Reduced motion ─────────────────────────────────────────────
   Every animation degrades to an opacity blink. No displacement. */
@media (prefers-reduced-motion: reduce) {
  @keyframes opacity-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.3; }
  }
  /* block 1 — beat cells */
  .beat-120 .beats b,
  .beat-60  .beats b,
  .beat-240 .beats b {
    animation: opacity-blink 1s steps(1) infinite !important;
  }
  /* block 2 — duration fills */
  .dur-track i { animation: opacity-blink 1s steps(1) infinite !important; }
  /* block 3 — easing runners */
  .ease-track .e-dot { animation: opacity-blink 2s steps(1) infinite !important; }
  /* block 4 — keyframe demos */
  .demo-beat .dot,
  .demo-pulse .dot,
  .demo-bob .dot,
  .demo-lift .dot,
  .demo-slide .dot {
    animation: opacity-blink var(--beat) steps(1) infinite !important;
  }
  .demo-strobe .wire  { animation: opacity-blink 2s steps(1) infinite !important; }
  .demo-rip .rip-corner { animation: opacity-blink 1.8s steps(1) infinite !important; }
  .demo-cross-fade-rip .cf-label { animation: opacity-blink 2.8s steps(1) infinite !important; }
  .demo-ring .ring-el  { animation: opacity-blink 2s steps(1) infinite !important; }
  .demo-flash .ring-el { animation: opacity-blink 2s steps(1) infinite !important; }
  .kf-ease-track .e-dot { animation: opacity-blink 2s steps(1) infinite !important; }
  .demo-shimmer .brass-bar::after { animation: none !important; }
}
</style>
