<script setup lang="ts">
// @ts-nocheck
import { onMounted } from "vue";

onMounted(() => {
  /* ── Shared chip-slide init — wires every .js-chip-tabs and #hero-tabs ── */
  function initChipTabs(rail) {
    var chip = rail.querySelector('.active-chip');
    var btns = [].slice.call(rail.querySelectorAll('.btn:not(.is-disabled)'));
    if (!chip || !btns.length) return;
  
    function moveTo(btn) {
      var rr = rail.getBoundingClientRect();
      var br = btn.getBoundingClientRect();
      chip.style.left  = (br.left  - rr.left)  + 'px';
      chip.style.width = br.width + 'px';
      chip.classList.add('smearing');
      setTimeout(function() { chip.classList.remove('smearing'); }, 220);
      btns.forEach(function(b) { b.classList.toggle('on', b === btn); });
    }
  
    requestAnimationFrame(function() {
      var on = rail.querySelector('.btn.on') || btns[0];
      if (on) moveTo(on);
    });
  
    rail.addEventListener('click', function(e) {
      var btn = e.target.closest('.btn');
      if (!btn || btn.classList.contains('is-disabled')) return;
      moveTo(btn);
    });
  
    window.addEventListener('resize', function() {
      var on = rail.querySelector('.btn.on');
      if (on) moveTo(on);
    });
  }
  
  /* Wire hero */
  var heroRail = document.getElementById('hero-tabs');
  if (heroRail) initChipTabs(heroRail);
  
  /* Wire all variant bars */
  document.querySelectorAll('.js-chip-tabs').forEach(initChipTabs);
});
</script>

<template>
  <section class="preview-port preview-port--primitive-tabs">
    <div class="card">
      <div class="label">TABS &middot; CHIP-SLIDE &middot; PRIMITIVE</div>
    
      <!-- ── ANATOMY ──────────────────────────────────────────────────────── -->
      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
    
        <div>
          <div class="p5-stage">
            <div class="p5-tabs" id="hero-tabs">
              <span class="streak"></span>
              <span class="active-chip" id="hero-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
              <button class="btn">Scope</button>
            </div>
          </div>
          <div class="p5-meta">
            <div class="a"><b>Chip</b><code>slides on click · ease-swing · 320ms</code></div>
            <div class="a"><b>Streak</b><code>ink bar · full height behind tabs</code></div>
            <div class="a"><b>Blend</b><code>mix-blend-mode: difference</code></div>
          </div>
        </div>
    
        <div class="anatomy">
          <div class="row"><b>Rail</b><span>ink-2 · 6px pad · border ink-5</span></div>
          <div class="row"><b>Streak</b><span>ink · 60% height · centered behind</span></div>
          <div class="row"><b>Chip</b><span>ivory · slides left+width · clip-tab</span></div>
          <div class="row"><b>Label</b><span>display 13px · uppercase · tracked</span></div>
          <div class="row"><b>Blend</b><span>difference · inverts text auto</span></div>
          <div class="row"><b>Smear</b><span>scaleX 1.08 + skewX -12deg · 220ms</span></div>
          <div class="row"><b>Motion</b><span>ease-swing · 320ms · chip only</span></div>
          <div class="row"><b>Axis</b><span>chip geometry varies per variant</span></div>
        </div>
    
      </div>
    
      <!-- ── STATES ──────────────────────────────────────────────────────── -->
      <div class="section-head">States — tab face (rest / hover / pressed / active / disabled)</div>
      <div class="states-grid">
    
        <div class="state-col">
          <div class="state-pin">Rest</div>
          <div class="state-tab">Freq</div>
        </div>
    
        <div class="state-col">
          <div class="state-pin">Hover</div>
          <div class="state-tab s-hover">Freq</div>
        </div>
    
        <div class="state-col">
          <div class="state-pin">Pressed</div>
          <div class="state-tab s-pressed">Freq</div>
        </div>
    
        <div class="state-col">
          <div class="state-pin">Active</div>
          <div class="state-tab s-active">Freq</div>
        </div>
    
        <div class="state-col">
          <div class="state-pin">Disabled</div>
          <div class="state-tab s-disabled">Freq</div>
        </div>
    
      </div>
    
      <!-- ── CHIP GEOMETRY VARIANTS ──────────────────────────────────────── -->
      <div class="section-head">Variants — chip geometry (same mechanic, different cut)</div>
      <div class="variants-full" style="grid-template-columns:1fr 1fr;gap:14px">
    
        <!-- 1. Tab slide — default (clip-tab) -->
        <div class="vt-cell">
          <div class="vt-label">Tab-slide (default) &middot; clip-tab</div>
          <div class="p5-stage" style="padding:16px 14px 14px">
            <div class="p5-tabs js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
            </div>
          </div>
        </div>
    
        <!-- 2. Off-cut hex (6-point) -->
        <div class="vt-cell">
          <div class="vt-label">Off-cut hex &middot; clip-offcut</div>
          <div class="p5-stage" style="padding:16px 14px 14px">
            <div class="p5-tabs chip-offcut js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
            </div>
          </div>
        </div>
    
        <!-- 3. Tile cut (4-corner subtle) -->
        <div class="vt-cell">
          <div class="vt-label">Tile cut &middot; clip-tile</div>
          <div class="p5-stage" style="padding:16px 14px 14px">
            <div class="p5-tabs chip-tile js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
            </div>
          </div>
        </div>
    
        <!-- 4. Sharp rectangle (no clip) -->
        <div class="vt-cell">
          <div class="vt-label">Sharp rect &middot; no clip · corners 0</div>
          <div class="p5-stage" style="padding:16px 14px 14px">
            <div class="p5-tabs chip-sharp js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
            </div>
          </div>
        </div>
    
        <!-- 5. Paper-rip edge -->
        <div class="vt-cell">
          <div class="vt-label">Paper-rip &middot; clip-paper-rip</div>
          <div class="p5-stage" style="padding:16px 14px 14px">
            <div class="p5-tabs chip-rip js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
            </div>
          </div>
        </div>
    
        <!-- 6. Brass chip -->
        <div class="vt-cell">
          <div class="vt-label">Brass chip &middot; clip-tab + brass-fill</div>
          <div class="p5-stage" style="padding:16px 14px 14px">
            <div class="p5-tabs chip-brass js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
            </div>
          </div>
        </div>
    
      </div>
    
      <!-- ── DENSITY ──────────────────────────────────────────────────────── -->
      <div class="section-head">Density — comfortable / compact</div>
      <div class="variants-full" style="grid-template-columns:1fr 1fr;gap:14px">
    
        <div class="vt-cell">
          <div class="vt-label">Comfortable (default) &middot; 4 tabs</div>
          <div class="p5-stage">
            <div class="p5-tabs js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
              <button class="btn">Scope</button>
            </div>
          </div>
        </div>
    
        <div class="vt-cell">
          <div class="vt-label">Compact &middot; 5 tabs &middot; dense padding</div>
          <div class="p5-stage is-dense">
            <div class="p5-tabs is-dense js-chip-tabs">
              <span class="streak"></span>
              <span class="active-chip"></span>
              <button class="btn on">Anim</button>
              <button class="btn">Freq</button>
              <button class="btn">Color</button>
              <button class="btn">Scope</button>
              <button class="btn">Keys</button>
            </div>
          </div>
        </div>
    
      </div>
    
      <div class="caption" style="margin-top:18px">
        Chip-slide is the sole tab mechanic. The variant axis is chip geometry — the clip-path or border-radius of the sliding chip — not the indicator type. The streak and mix-blend-mode difference inversion are invariant across all variants. Density compresses padding and font-size but does not change the mechanic.
      </div>
    
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   TABS — chip-slide · PRIMITIVE
   One mechanic: the chip slides. The variant axis is chip geometry.
   No brand colors. UI chrome only: ink/ivory + one brass-lit variant.
   ===================================================================== */

/* ── Section heads ─────────────────────────────────────────────────── */
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

/* ── Anatomy layout ────────────────────────────────────────────────── */
.anatomy-wrap {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
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
  grid-template-columns: 80px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--ink-5);
}
.anatomy .row:last-child { border-bottom: 0; }
.anatomy .row b { color: var(--ivory); font-weight: 700; }

/* ── Variant layout helpers ────────────────────────────────────────── */
.variants-full {
  display: grid;
  gap: 14px;
}
.vt-label {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin-bottom: 8px;
}
.vt-cell {
  display: flex;
  flex-direction: column;
}

/* ── States grid ─────────────────────────────────────────────────── */
.states-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.state-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.state-pin {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-4);
}

/* ── Shared chip-slide stage ──────────────────────────────────────── */
.p5-stage {
  background: #0a0908;
  border: 1px solid var(--hairline);
  padding: 28px 20px 22px;
}
.p5-stage.is-dense {
  padding: 16px 14px 14px;
}

/* ── Tab rail ─────────────────────────────────────────────────────── */
.p5-tabs {
  position: relative;
  display: inline-flex;
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  padding: 6px;
  gap: 0;
  isolation: isolate;
  width: 100%;
}
.p5-tabs.is-dense {
  padding: 4px;
}

/* the streak — full-width black bar behind all tabs */
.p5-tabs .streak {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 60%;
  transform: translateY(-50%);
  background: var(--ink);
  z-index: 0;
}

/* ── Active chip — default geometry: clip-tab ─────────────────────── */
.p5-tabs .active-chip {
  position: absolute;
  top: 6px;
  bottom: 6px;
  background: var(--ivory);
  z-index: 1;
  box-shadow: 3px 3px 0 var(--ink);
  clip-path: polygon(2% 0, 100% 4%, 98% 100%, 0 96%);
  transition:
    left 320ms var(--ease-swing),
    width 320ms var(--ease-swing),
    transform 320ms var(--ease-swing);
}
.p5-tabs.is-dense .active-chip {
  top: 4px;
  bottom: 4px;
}
.p5-tabs .active-chip.smearing {
  transform: scaleX(1.08) skewX(-12deg);
}

/* ── Chip geometry variants ─────────────────────────────────────────
   Each modifier only overrides clip-path and/or border-radius.
   ─────────────────────────────────────────────────────────────────── */

/* Off-cut hex (6-point wobble) */
.p5-tabs.chip-offcut .active-chip {
  clip-path: polygon(4% 0%, 98% 6%, 100% 90%, 96% 100%, 2% 94%, 0% 8%);
}

/* Tile cut (very subtle 4-corner wobble) */
.p5-tabs.chip-tile .active-chip {
  clip-path: polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%);
}

/* Sharp rectangle — no clip, hard corners */
.p5-tabs.chip-sharp .active-chip {
  clip-path: none;
  border-radius: 0;
  box-shadow: 3px 3px 0 var(--ink);
}

/* Soft pill — fully rounded, no clip */
.p5-tabs.chip-pill .active-chip {
  clip-path: none;
  border-radius: 999px;
  box-shadow: none;
}

/* Paper-rip edge — torn right side */
.p5-tabs.chip-rip .active-chip {
  clip-path: polygon(0 0, 100% 0, 100% 4%, 88% 20%, 100% 40%, 78% 56%, 100% 78%, 100% 100%, 0 100%);
}

/* Brass chip — ivory replaced by brass fill + sheen */
.p5-tabs.chip-brass .active-chip {
  background: var(--brass-fill);
  clip-path: polygon(2% 0, 100% 4%, 98% 100%, 0 96%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.55),
    inset 0 -1px 0 rgba(0,0,0,.45),
    0 1px 0 rgba(0,0,0,.6),
    0 0 0 1px rgba(0,0,0,.18),
    0 0 14px rgba(224,169,58,.18);
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.p5-tabs.chip-brass .active-chip::after {
  content: "";
  position: absolute; inset: -10% -30%;
  background: var(--brass-sheen);
  background-size: 220% 100%;
  background-repeat: no-repeat;
  pointer-events: none;
  mix-blend-mode: screen;
  animation: brass-sheen 6.5s cubic-bezier(.55,.05,.45,.95) infinite;
  z-index: 1;
}

/* ── Clickable tab buttons ────────────────────────────────────────── */
.p5-tabs .btn {
  position: relative;
  z-index: 2;
  flex: 1;
  background: transparent;
  border: 0;
  font: 700 13px/1 var(--font-display);
  letter-spacing: .14em;
  text-transform: uppercase;
  padding: 10px 14px;
  cursor: pointer;
  mix-blend-mode: difference;
  color: var(--ivory);
  white-space: nowrap;
}
.p5-tabs.is-dense .btn {
  font-size: 10px;
  padding: 7px 10px;
}
.p5-tabs .btn.is-disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* ── Reduced motion ──────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .p5-tabs .active-chip {
    transition: none;
  }
  .p5-tabs .active-chip.smearing {
    transform: none;
  }
  .p5-tabs.chip-brass .active-chip::after {
    animation: none;
  }
}

/* ── Meta legend row ─────────────────────────────────────────────── */
.p5-meta {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.p5-meta .a {
  border-left: 2px solid var(--hairline);
  padding: 4px 0 4px 8px;
}
.p5-meta .a b {
  display: block;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ivory);
}
.p5-meta .a code {
  display: block;
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .14em;
  color: var(--ivory-3);
  text-transform: uppercase;
  margin-top: 2px;
}

/* ── State single-tab specimens ──────────────────────────────────── */
.state-tab {
  position: relative;
  font: 700 13px/1 var(--font-display);
  letter-spacing: .14em;
  text-transform: uppercase;
  padding: 10px 16px;
  color: var(--ivory-3);
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  user-select: none;
}
.state-tab.s-hover {
  color: var(--ivory-2);
  background: var(--ink-4);
}
.state-tab.s-pressed {
  color: var(--ivory);
  background: var(--ink-5);
  transform: scale(0.97);
}
.state-tab.s-active {
  color: var(--ink);
  background: var(--ivory);
  clip-path: polygon(2% 0, 100% 4%, 98% 100%, 0 96%);
  box-shadow: 3px 3px 0 var(--ink);
}
.state-tab.s-disabled {
  color: var(--ivory-4);
  opacity: 0.38;
  cursor: not-allowed;
}
</style>
