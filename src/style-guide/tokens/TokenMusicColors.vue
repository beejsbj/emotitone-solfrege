<script setup lang="ts">
// @ts-nocheck
import { onMounted } from "vue";

onMounted(() => {
  (function () {
    const NOTE_LETTERS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const SOL_7        = ['Do','Re','Mi','Fa','Sol','La','Ti'];
    // Chromatic solfege from root position
    const SOL_CHROM    = ['Do','Ra','Re','Me','Mi','Fa','Fi','Sol','Le','La','Te','Ti'];
  
    // State
    let movableMode = false;
    let root        = 0;
    let octave      = 4;
    let count       = 12;
    let sweepOn     = false;
    let sweepDur    = 5;
  
    // Elements
    const wheelSeg   = document.getElementById('wheel-segments');
    const wheelLbls  = document.getElementById('wheel-labels');
    const hueTrack   = document.getElementById('hue-track');
    const sweepTrack = document.getElementById('sweep-track');
    const lblFixed   = document.getElementById('lbl-fixed');
    const lblMovable = document.getElementById('lbl-movable');
    const lblSweepOff = document.getElementById('lbl-sweep-off');
    const lblSweepOn  = document.getElementById('lbl-sweep-on');
    const rngRoot    = document.getElementById('rng-root');
    const rngOctave  = document.getElementById('rng-octave');
    const rngCount   = document.getElementById('rng-count');
    const rngDur     = document.getElementById('rng-dur');
    const valRoot    = document.getElementById('val-root');
    const valOctave  = document.getElementById('val-octave');
    const valCount   = document.getElementById('val-count');
    const valDur     = document.getElementById('val-dur');
    const ctrlRoot   = document.getElementById('ctrl-root');
    const ctrlDur    = document.getElementById('ctrl-dur');
    const sweepStyles = document.createElement('style');
    sweepStyles.id = 'sweep-styles';
    document.head.appendChild(sweepStyles);
  
    const TAU = Math.PI * 2;
  
    // Returns OKLCH color string given a degree-offset from root (0..11) and octave
    function noteColor(degreeOffset, oct, isSweeping, idx) {
      const l = 20 + oct * 7.5;
      // In fixed mode: hue = absolute semitone × 30
      // In movable mode: hue = offset from root × 30 (root lands at 0°)
      const hue = movableMode
        ? degreeOffset * 30
        : ((root + degreeOffset) % 12) * 30;
      if (isSweeping) return `oklch(${l}% 0.18 0) /* placeholder for anim */`;
      return `oklch(${l}% 0.18 ${hue})`;
    }
  
    // Build a single SVG donut arc path from startAngle to endAngle (radians)
    // outerR and innerR define the donut band
    function arcPath(startAngle, endAngle, outerR, innerR) {
      const gap = 0.025; // radians gap between segments
      const s = startAngle + gap / 2;
      const e = endAngle   - gap / 2;
      const cos = Math.cos, sin = Math.sin;
      const x1 = cos(s) * outerR, y1 = sin(s) * outerR;
      const x2 = cos(e) * outerR, y2 = sin(e) * outerR;
      const x3 = cos(e) * innerR, y3 = sin(e) * innerR;
      const x4 = cos(s) * innerR, y4 = sin(s) * innerR;
      const large = (e - s) > Math.PI ? 1 : 0;
      return [
        `M ${x1} ${y1}`,
        `A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');
    }
  
    function renderWheel() {
      wheelSeg.innerHTML = '';
      wheelLbls.innerHTML = '';
  
      // Collect which cells to show — always up to count cells evenly from root
      // When count < 12: drop cells (don't stretch)
      const cells = [];
      for (let deg = 0; deg < count; deg++) {
        const chromaticOffset = Math.round(deg * 12 / count);
        cells.push({ deg, chromaticOffset });
      }
  
      const outerR = 100;
      const innerR = 44;
      const labelR = 75; // midpoint radius for label placement
  
      // Wheel layout is fixed: C at 12 o'clock, clockwise through B.
      // Only the color (hue) mapping shifts when root changes in movable mode.
      cells.forEach(({ deg, chromaticOffset }) => {
        const slotIdx = (root + chromaticOffset) % 12;
  
        const baseAngle   = -TAU / 4; // start at 12 o'clock
        const sliceAngle  = TAU / 12;
        const startAngle  = baseAngle + slotIdx * sliceAngle;
        const endAngle    = startAngle + sliceAngle;
  
        const l   = 20 + octave * 7.5;
        const hue = movableMode
          ? chromaticOffset * 30
          : slotIdx * 30;
        const fill = `oklch(${l}% 0.18 ${hue})`;
  
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', arcPath(startAngle, endAngle, outerR, innerR));
        path.setAttribute('fill', fill);
        path.setAttribute('stroke', 'var(--ink)');
        path.setAttribute('stroke-width', '0.5');
        path.dataset.segIdx = slotIdx;
  
        // Root highlight
        if (deg === 0) {
          path.setAttribute('stroke', 'rgba(255,255,255,.5)');
          path.setAttribute('stroke-width', '1.5');
        }
  
        // Sweep animation
        if (sweepOn) {
          const kfName = `hue-sweep-seg-${slotIdx}`;
          const halfSlice = 15; // half of 30° slice
          const stagger = -(slotIdx / 12) * sweepDur;
          path.style.animation = `${kfName} ${sweepDur}s ease-in-out ${stagger}s infinite`;
        }
  
        wheelSeg.appendChild(path);
  
        // Label at segment centre
        const midAngle = (startAngle + endAngle) / 2;
        const lx = Math.cos(midAngle) * labelR;
        const ly = Math.sin(midAngle) * labelR;
  
        const pitch = slotIdx;
  
        let labelText;
        if (movableMode && count <= 7) {
          labelText = SOL_7[deg] || SOL_CHROM[chromaticOffset];
        } else if (movableMode && count > 7) {
          labelText = NOTE_LETTERS[pitch];
        } else {
          labelText = NOTE_LETTERS[pitch];
        }
  
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', lx.toFixed(1));
        txt.setAttribute('y', ly.toFixed(1));
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('dominant-baseline', 'central');
        txt.setAttribute('font-family', 'var(--font-mono)');
        txt.setAttribute('font-size', '11');
        txt.setAttribute('font-weight', '600');
        txt.setAttribute('fill', 'rgba(0,0,0,.72)');
        txt.setAttribute('letter-spacing', '0');
        txt.textContent = labelText;
        wheelLbls.appendChild(txt);
      });
  
      // Build sweep keyframes
      if (sweepOn) {
        let kfCss = '';
        for (let i = 0; i < 12; i++) {
          const l    = 20 + octave * 7.5;
          const baseHue = movableMode ? i * 30 : i * 30;
          kfCss += `@keyframes hue-sweep-seg-${i} {
    0%   { fill: oklch(${l}% 0.18 ${baseHue - 15}); }
    50%  { fill: oklch(${l}% 0.18 ${baseHue + 15}); }
    100% { fill: oklch(${l}% 0.18 ${baseHue - 15}); }
  }\n`;
        }
        // reduced-motion: opacity-only oscillation
        kfCss += `@media (prefers-reduced-motion: reduce) {
    [data-seg-idx] { animation: none !important; }
  }\n`;
        sweepStyles.textContent = kfCss;
      } else {
        sweepStyles.textContent = '';
      }
    }
  
    // Hue mode toggle
    function setHueMode(movable) {
      movableMode = movable;
      hueTrack.classList.toggle('on', movable);
      hueTrack.setAttribute('aria-checked', String(movable));
      lblFixed.classList.toggle('lit', !movable);
      lblFixed.classList.toggle('dim', movable);
      lblMovable.classList.toggle('lit', movable);
      lblMovable.classList.toggle('dim', !movable);
      // Root slider only meaningful in movable
      rngRoot.disabled = !movable;
      ctrlRoot.style.opacity = movable ? '1' : '0.4';
      renderWheel();
    }
  
    hueTrack.addEventListener('click', () => setHueMode(!movableMode));
    hueTrack.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setHueMode(!movableMode); }
    });
  
    // Sweep toggle
    function setSweep(on) {
      sweepOn = on;
      sweepTrack.classList.toggle('on', on);
      sweepTrack.setAttribute('aria-checked', String(on));
      lblSweepOff.classList.toggle('dim', on);
      lblSweepOff.classList.toggle('lit', !on);
      lblSweepOn.classList.toggle('lit', on);
      lblSweepOn.classList.toggle('dim', !on);
      ctrlDur.classList.toggle('visible', on);
      renderWheel();
    }
  
    sweepTrack.addEventListener('click', () => setSweep(!sweepOn));
    sweepTrack.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setSweep(!sweepOn); }
    });
  
    // Root slider
    rngRoot.addEventListener('input', () => {
      root = parseInt(rngRoot.value, 10);
      valRoot.textContent = NOTE_LETTERS[root];
      renderWheel();
    });
  
    // Octave slider
    rngOctave.addEventListener('input', () => {
      octave = parseInt(rngOctave.value, 10);
      valOctave.textContent = octave;
      renderWheel();
    });
  
    // Scale count slider
    rngCount.addEventListener('input', () => {
      count = parseInt(rngCount.value, 10);
      valCount.textContent = count;
      renderWheel();
    });
  
    // Sweep duration slider
    rngDur.addEventListener('input', () => {
      sweepDur = parseInt(rngDur.value, 10);
      valDur.textContent = sweepDur;
      if (sweepOn) renderWheel();
    });
  
    // Init
    setHueMode(false);
    renderWheel();
  })();
});
</script>

<template>
  <section class="preview-port preview-port--token-music-colors">
    <div class="card">
      <div class="label">Music Color Recipe</div>
    
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
    
        <!-- Hero: segmented wheel -->
        <div class="wheel-hero">
          <div class="wheel-wrap">
            <svg id="wheel-svg" viewBox="-110 -110 220 220" aria-label="Chromatic color wheel — 12 segments">
              <g id="wheel-segments"></g>
              <circle r="42" fill="var(--ink)" stroke="var(--ink-5)" stroke-width="1"/>
              <g id="wheel-labels"></g>
              <!-- root notch at 12 o'clock -->
              <line id="root-notch" x1="0" y1="-43" x2="0" y2="-55"
                    stroke="var(--ivory)" stroke-width="1.5"
                    stroke-linecap="butt"/>
            </svg>
          </div>
        </div>
    
        <!-- Spec table -->
        <div class="anatomy">
          <div class="row"><b>--note-degree</b><div>0–11 · semitones from C (fixed) or from root (movable)</div></div>
          <div class="row"><b>--note-octave</b><div>0–8 · drives lightness</div></div>
          <div class="row"><b>--note-l</b><div>20% + octave × 7.5% · range 20–80%</div></div>
          <div class="row"><b>--note-hue</b><div>(degree + --music-rotate) × 30deg</div></div>
          <div class="row"><b>--music-c</b><div>OKLCH chroma · default 0.18 · range 0–0.4</div></div>
          <div class="row"><b>--music-rotate</b><div>0 = fixed · −root×30 = movable hue mode</div></div>
          <div class="recipe"><span class="k">.note</span> {
      <span class="c">/* degree + rotate → final hue */</span>
      --note-hue: calc(
        (var(--note-degree) + var(--music-rotate)) * <span class="k">30deg</span>
      );
      --note-l: calc(<span class="k">20%</span> + var(--note-octave) * <span class="k">7.5%</span>);
      background: oklch(
        var(--note-l) var(--music-c) var(--note-hue)
      );
    }</div>
        </div>
      </div>
    
      <!-- ── Controls ──────────────────────────────────────────────── -->
      <div class="section-head">Controls</div>
      <div class="controls-block">
    
        <!-- Hue mode toggle (full width) -->
        <div class="ctrl-toggle" id="hue-mode-toggle">
          <div class="toggle-track" id="hue-track" role="switch" aria-checked="false" tabindex="0"></div>
          <span class="toggle-label">
            <span class="mode-a lit" id="lbl-fixed">Fixed hue</span>
            <span class="ctrl-sep">/</span>
            <span class="mode-b dim" id="lbl-movable">Movable hue</span>
          </span>
        </div>
    
        <!-- Root (only meaningful in Movable) -->
        <div class="ctrl" id="ctrl-root">
          <label>Root <span class="val" id="val-root">C</span></label>
          <input type="range" id="rng-root" min="0" max="11" step="1" value="0" disabled>
        </div>
    
        <!-- Octave -->
        <div class="ctrl">
          <label>Octave <span class="val" id="val-octave">4</span></label>
          <input type="range" id="rng-octave" min="0" max="8" step="1" value="4">
        </div>
    
        <!-- Scale count -->
        <div class="ctrl">
          <label>Scale count <span class="val" id="val-count">12</span></label>
          <input type="range" id="rng-count" min="5" max="12" step="1" value="12">
        </div>
    
        <!-- Sweep toggle (full width) -->
        <div class="ctrl-toggle" id="sweep-mode-toggle">
          <div class="toggle-track" id="sweep-track" role="switch" aria-checked="false" tabindex="0"></div>
          <span class="toggle-label">
            <span class="mode-a lit" id="lbl-sweep-off">Animate hue sweep</span>
            <span class="ctrl-sep">·</span>
            <span class="mode-b dim" id="lbl-sweep-on">on</span>
          </span>
        </div>
    
        <!-- Sweep duration (hidden until sweep on) -->
        <div class="ctrl" id="ctrl-dur">
          <label>Sweep duration <span class="val" id="val-dur">5</span>s</label>
          <input type="range" id="rng-dur" min="2" max="12" step="1" value="5">
        </div>
    
      </div>
    
      <div class="caption">OKLCH recipe: lightness from octave, hue from degree, chroma from music-c. Fixed hue nails C to 0°; movable rotates root to 0°. Scale-count drops cells.</div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* ── Grammar CSS (verbatim from specimen-card-grammar) ─────── */
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

  /* ── Wheel hero ─────────────────────────────────────────────── */
  .wheel-hero {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 0 8px;
  }

  .wheel-wrap {
    position: relative;
    width: 220px;
    height: 220px;
  }

  #wheel-svg {
    width: 220px;
    height: 220px;
    overflow: visible;
  }

  /* segment labels (pitch/solfege) */
  .wheel-wrap .seg-label {
    position: absolute;
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 600;
    color: rgba(0,0,0,.7);
    pointer-events: none;
    text-anchor: middle;
    dominant-baseline: central;
    transform: translate(-50%, -50%);
    line-height: 1;
    letter-spacing: 0;
    white-space: nowrap;
  }

  /* ── Recipe block ───────────────────────────────────────────── */
  .recipe {
    background: var(--ink-2);
    border: 1px solid var(--ink-5);
    padding: 8px 10px;
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 1.55;
    color: var(--ivory-2);
    white-space: pre;
    overflow-x: auto;
    margin-top: 10px;
    letter-spacing: 0.04em;
  }
  .recipe .k { color: var(--brass); }
  .recipe .c { color: var(--ivory-4); }

  /* ── Controls block ─────────────────────────────────────────── */
  .controls-block {
    background: var(--ink-3);
    border: 1px solid var(--ink-5);
    padding: 12px 14px;
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 20px;
  }
  .ctrl {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ctrl label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ivory-3);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .ctrl label .val {
    color: var(--ivory);
    font-size: 10px;
    letter-spacing: 0;
  }
  .ctrl input[type=range] {
    width: 100%;
    accent-color: var(--brass);
    cursor: pointer;
  }
  .ctrl input[type=range]:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Toggle row */
  .ctrl-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    grid-column: 1 / -1;
  }
  .ctrl-toggle .toggle-track {
    position: relative;
    width: 36px;
    height: 18px;
    background: var(--ink-5);
    border: 1px solid var(--hairline);
    cursor: pointer;
    flex-shrink: 0;
  }
  .ctrl-toggle .toggle-track::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    background: var(--ivory-3);
    transition: left var(--dur-tap) var(--ease-swing),
                background var(--dur-tap) var(--ease-swing);
  }
  .ctrl-toggle .toggle-track.on::after {
    left: 20px;
    background: var(--brass);
  }
  .ctrl-toggle .toggle-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ivory-3);
    cursor: pointer;
  }
  .ctrl-toggle .toggle-label .mode-a,
  .ctrl-toggle .toggle-label .mode-b {
    transition: color var(--dur-tap);
  }
  .ctrl-toggle .toggle-label .mode-a.dim,
  .ctrl-toggle .toggle-label .mode-b.dim {
    color: var(--ivory-4);
  }
  .ctrl-toggle .toggle-label .mode-a.lit,
  .ctrl-toggle .toggle-label .mode-b.lit {
    color: var(--ivory);
  }
  .ctrl-sep {
    color: var(--ivory-4);
    margin: 0 4px;
  }

  /* Sweep duration ctrl — hidden until sweep is on */
  #ctrl-dur { display: none; }
  #ctrl-dur.visible { display: flex; }

  @media (prefers-reduced-motion: reduce) {
    .toggle-track::after { transition: none; }
  }

  /* inject sweep keyframes here */
  #sweep-styles {}
</style>
