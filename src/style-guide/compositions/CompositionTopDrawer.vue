<script setup lang="ts">
// @ts-nocheck
import { onMounted } from "vue";

onMounted(() => {
  (function(){
    const frame = document.getElementById('drawerFrame');
    const handle = document.getElementById('drawerHandle');
    const scrim  = document.getElementById('drawerScrim');
    const drawer = document.getElementById('drawer');
    const panes  = drawer.querySelectorAll('.drawer-pane');
  
    function showPane(name) {
      panes.forEach(p => { p.hidden = (p.dataset.pane !== name); });
    }
    function open(name) { showPane(name); frame.classList.add('is-open'); }
    function close() { frame.classList.remove('is-open'); }
  
    document.querySelectorAll('.drawer-trigger').forEach(t => {
      t.addEventListener('click', () => open(t.dataset.drawer));
    });
    scrim.addEventListener('click', close);
    handle.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  })();
});
</script>

<template>
  <section class="preview-port preview-port--composition-top-drawer">
    <div class="card">
      <!-- Trigger buttons -->
      <div class="triggers">
        <button class="trig primary drawer-trigger" data-drawer="instrument">Instrument picker</button>
        <button class="trig ghost drawer-trigger" data-drawer="presets">Visual presets</button>
        <button class="trig ghost drawer-trigger" data-drawer="settings">Settings</button>
      </div>
    
      <!-- The stage frame -->
      <div class="drawer-frame" id="drawerFrame">
    
        <!-- The drawer (top) -->
        <div class="drawer" id="drawer">
          <div class="drawer-body">
    
            <!-- Pane: Instrument picker -->
            <div class="drawer-pane" data-pane="instrument">
              <div class="drawer-head">
                <div class="seg"><button class="on">Sound</button><button>All Sounds</button></div>
                <span style="font: var(--t-label); letter-spacing: .18em; color: var(--ivory-3); font-size: 10px; text-transform: uppercase; margin-left: auto;">992 SAMPLES</span>
              </div>
              <div class="search-bar">
                <span class="icon">⌕</span>
                <span class="placeholder">Search sounds</span>
              </div>
              <div class="group">
                <div class="group-label">Keyboards</div>
                <div class="instrument-grid">
                  <button class="instrument">clavisynth</button>
                  <button class="instrument">fmpiano</button>
                  <button class="instrument">celesta</button>
                  <button class="instrument active">piano</button>
                  <button class="instrument">steinway</button>
                  <button class="instrument">harpsichord</button>
                </div>
              </div>
              <div class="seg"><button>Mall</button><button>Strin</button><button>Orga</button><button>Winds</button><button class="on">Synth</button></div>
            </div>
    
            <!-- Pane: Visual presets -->
            <div class="drawer-pane" data-pane="presets" hidden>
              <div class="drawer-head">
                <div class="title">Visual presets</div>
              </div>
              <div class="preset-row"><span class="preset-spine" style="background:var(--tomato);"></span><span class="preset-name">Soft Glass</span><button class="preset-apply">Apply</button></div>
              <div class="preset-row"><span class="preset-spine" style="background:var(--tomato);"></span><span class="preset-name">Pulse Lab</span><button class="preset-apply">Apply</button></div>
              <div class="preset-row"><span class="preset-spine" style="background:var(--plum);"></span><span class="preset-name">Ambient Bloom</span><button class="preset-apply">Apply</button></div>
              <div class="preset-row"><span class="preset-spine" style="background:var(--pine);"></span><span class="preset-name">Classroom</span><button class="preset-apply">Apply</button></div>
              <div class="seg" style="margin-top:12px;"><button>Anim</button><button>Freq</button><button class="on">Color</button><button>Popup</button><button>Scope</button></div>
            </div>
    
            <!-- Pane: Settings -->
            <div class="drawer-pane" data-pane="settings" hidden>
              <div class="drawer-head"><div class="title">Settings</div></div>
              <div class="setting-item"><div class="setting-name">MIDI Input</div><div class="setting-val">2 DEVICES · ROLI · BLOCKS</div></div>
              <div class="setting-item"><div class="setting-name">Haptic feedback</div><div class="setting-val">ON · MEDIUM</div></div>
              <div class="setting-item"><div class="setting-name">Audio engine</div><div class="setting-val">SUPERDOUGH · 48 KHZ</div></div>
              <div class="setting-item"><div class="setting-name">Reduced motion</div><div class="setting-val">SYSTEM</div></div>
            </div>
    
          </div>
    
          <!-- Torn paper handle -->
          <button class="drawer-handle" id="drawerHandle" aria-label="close drawer">
            <span class="drawer-tear" aria-hidden="true">
              <svg viewBox="0 0 200 14" preserveAspectRatio="none">
                <path d="M0 0 L12 8 L24 2 L38 10 L52 4 L66 11 L80 3 L94 9 L108 2 L122 10 L136 4 L150 9 L164 3 L178 10 L192 5 L200 12 L200 14 L0 14 Z" fill="var(--ink-3)"/>
              </svg>
            </span>
            <span class="drawer-grip"></span>
            <span class="handle-label">Drag · ESC · Tap</span>
            <span class="drawer-grip"></span>
          </button>
        </div>
    
        <!-- Scrim -->
        <div class="drawer-scrim" id="drawerScrim"></div>
    
        <!-- App content visible behind -->
        <div class="drawer-app">
          <div class="app-panel-header">
            <span class="app-badge">Piano</span>
            <span class="app-meta">E LOCRIAN · <strong>2I</strong> · EXPIRING</span>
            <div class="app-meta-right">
              <button class="icon-btn">●</button>
              <button class="icon-btn">⎘</button>
            </div>
          </div>
          <div class="chromatic-tape"></div>
          <div class="param-row">
            <div class="param"><span class="v">E</span><span class="lbl">Key</span></div>
            <div class="param"><span class="v" style="font-size:11px;letter-spacing:.02em;">LOCRIAN</span><span class="lbl">Mode</span></div>
            <div class="param"><span class="v">120</span><span class="lbl">BPM</span></div>
            <div class="param"><span class="v">4</span><span class="lbl">Octave</span></div>
            <div class="param"><span class="v">3</span><span class="lbl">Rows</span></div>
          </div>
          <div class="tile-row">
            <div class="tile" style="background:hsl(18 85% 56%)"><span class="corner">E5</span><span class="syll">Do</span><span class="pitch">E₄</span></div>
            <div class="tile" style="background:hsl(78 72% 52%)"><span class="corner">F5</span><span class="syll">Ra</span><span class="pitch">F₄</span></div>
            <div class="tile" style="background:hsl(108 62% 48%)"><span class="corner">G5</span><span class="syll">Me</span><span class="pitch">G₄</span></div>
            <div class="tile" style="background:hsl(178 68% 50%)"><span class="corner">A5</span><span class="syll">Fa</span><span class="pitch">A₄</span></div>
            <div class="tile dark" style="background:hsl(228 78% 58%)"><span class="corner">A♯5</span><span class="syll">Se</span><span class="pitch">A♯₄</span></div>
            <div class="tile dark" style="background:hsl(282 66% 60%)"><span class="corner">C6</span><span class="syll">Le</span><span class="pitch">C₅</span></div>
            <div class="tile dark" style="background:hsl(342 80% 56%)"><span class="corner">D6</span><span class="syll">Te</span><span class="pitch">D₅</span></div>
          </div>
        </div>
    
      </div><!-- /drawer-frame -->
    
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px;font-size:11px;">
        <div style="border-left:2px solid var(--hairline);padding:4px 0 4px 8px;"><b style="display:block;font:700 11px/1 var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--ivory);">Anchor</b><code style="font:var(--t-mono);font-size:9px;color:var(--ivory-3);">top edge · full width · push-down not overlay</code></div>
        <div style="border-left:2px solid var(--hairline);padding:4px 0 4px 8px;"><b style="display:block;font:700 11px/1 var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--ivory);">Open</b><code style="font:var(--t-mono);font-size:9px;color:var(--ivory-3);">translateY(−100%) → 0 · Swing 380ms</code></div>
        <div style="border-left:2px solid var(--hairline);padding:4px 0 4px 8px;"><b style="display:block;font:700 11px/1 var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--ivory);">Edge</b><code style="font:var(--t-mono);font-size:9px;color:var(--ivory-3);">torn-paper SVG · grip + caption on the tear</code></div>
        <div style="border-left:2px solid var(--hairline);padding:4px 0 4px 8px;"><b style="display:block;font:700 11px/1 var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--ivory);">Dismiss</b><code style="font:var(--t-mono);font-size:9px;color:var(--ivory-3);">tap handle · click scrim · ESC key</code></div>
      </div>
    
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* Trigger buttons row */
.triggers { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.trig {
  font: 700 12px/1 var(--font-display);
  letter-spacing: .14em; text-transform: uppercase; cursor: pointer;
  padding: 9px 16px; border: 0;
}
.trig.primary { background: var(--ivory); color: var(--ink); }
.trig.ghost   { background: transparent; color: var(--ivory); border: 1px solid var(--ink-5); }

/* Drawer frame — the "app stage" */
.drawer-frame {
  position: relative;
  height: 480px;
  overflow: hidden;
  background: var(--ink);
  border: 1px solid var(--ink-5);
}

/* App content (visible behind drawer) */
.drawer-app {
  position: relative;
  padding: 14px;
  transition: transform var(--dur-panel) var(--ease-swing);
}
.drawer-frame.is-open .drawer-app { transform: translateY(16px); }

/* Scrim */
.drawer-scrim {
  position: absolute; inset: 0;
  background: var(--scrim);
  opacity: 0; pointer-events: none;
  transition: opacity var(--dur-panel) var(--ease-brush);
  z-index: 2;
}
.drawer-frame.is-open .drawer-scrim { opacity: 1; pointer-events: auto; }

/* The drawer itself */
.drawer {
  position: absolute; left: 0; right: 0; top: 0;
  background: var(--ink-3);
  transform: translateY(-100%);
  transition: transform var(--dur-panel) var(--ease-swing);
  z-index: 3;
  max-height: 72%;
  display: flex; flex-direction: column;
}
.drawer-frame.is-open .drawer { transform: translateY(0); }

/* Drawer body — scrollable content */
.drawer-body { padding: 20px 22px 24px; overflow: auto; flex: 1; }
.drawer-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.drawer-head .title { font: 400 22px/1 var(--font-display); letter-spacing: .03em; text-transform: uppercase; color: var(--ivory); }

/* Panes — only one visible at a time */
.drawer-pane[hidden] { display: none; }

/* Torn paper edge at drawer bottom */
.drawer-handle {
  position: relative;
  height: 28px;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  cursor: pointer; user-select: none;
  background: transparent; border: 0; padding: 0; width: 100%;
}
.drawer-tear {
  position: absolute; left: 0; right: 0; top: -10px; height: 14px;
  pointer-events: none; overflow: hidden;
}
.drawer-tear svg { width: 100%; height: 100%; display: block; }
.drawer-grip { width: 36px; height: 3px; background: var(--ivory-4); }
.handle-label {
  font: var(--t-label); letter-spacing: .22em; text-transform: uppercase;
  color: var(--ivory-3); font-size: 10px;
}

/* ─── Pane: Instrument picker ─── */
.search-bar {
  border: 1px solid var(--ink-5);
  padding: 9px 14px;
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 14px;
}
.search-bar .icon { color: var(--ivory-3); }
.search-bar .placeholder { font: var(--t-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--ivory-3); }

.group {
  border: 1px solid var(--ink-5);
  padding: 14px;
  position: relative;
  margin-bottom: 10px;
}
.group-label {
  position: absolute; top: -10px; left: 12px;
  background: var(--ink-3); padding: 0 8px;
  font: 700 13px/1 var(--font-display); letter-spacing: .14em; text-transform: uppercase;
  color: var(--ivory);
}
.instrument-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-top: 4px; }
.instrument {
  border: 1px solid var(--ink-5); padding: 7px 10px; text-align: center;
  font: var(--t-mono); font-size: 11px; letter-spacing: .12em;
  color: var(--ivory-3); cursor: pointer; background: transparent;
}
.instrument.active { background: var(--ivory); color: var(--ink); border-color: var(--ivory); }

.seg { display: inline-flex; border: 1px solid var(--ink-5); padding: 2px; gap: 1px; background: var(--ink-2); }
.seg button {
  background: transparent; border: 0; padding: 5px 10px;
  font: 700 12px/1 var(--font-display); letter-spacing: .12em; text-transform: uppercase;
  color: var(--ivory-3); cursor: pointer;
}
.seg button.on { background: var(--ivory-4); color: var(--ivory); }

/* ─── Pane: Visual presets ─── */
.preset-row {
  border: 1px solid var(--ink-5); padding: 10px 12px;
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
}
.preset-spine { width: 4px; align-self: stretch; flex-shrink: 0; }
.preset-name { font: 400 18px/1 var(--font-display); letter-spacing: .03em; text-transform: uppercase; color: var(--ivory); flex: 1; }
.preset-apply {
  padding: 4px 10px; border: 1px solid var(--ink-5);
  background: transparent; color: var(--ivory-3);
  font: 700 11px/1 var(--font-display); letter-spacing: .14em; text-transform: uppercase;
  cursor: pointer;
}

/* ─── Pane: Settings ─── */
.setting-item {
  border: 1px solid var(--ink-5); padding: 12px 14px; margin-bottom: 8px;
}
.setting-name { font: 400 16px/1 var(--font-display); letter-spacing: .03em; text-transform: uppercase; color: var(--ivory); }
.setting-val { font: var(--t-label); letter-spacing: .16em; color: var(--ivory-3); margin-top: 4px; }

/* ─── App content behind drawer ─── */
.app-panel-header {
  display: flex; align-items: center; gap: 12px;
  border: 1px solid var(--ink-5); background: var(--ink-3);
  padding: 9px 12px; margin-bottom: 6px;
}
.app-badge { font: 400 14px/1 var(--font-display); letter-spacing: .05em; text-transform: uppercase; color: var(--ivory); border: 1px solid var(--ink-5); padding: 3px 8px 2px; }
.app-meta { font: var(--t-label); letter-spacing: .12em; color: var(--ivory-3); font-size: 11px; }
.app-meta strong { color: var(--ivory-2); }
.app-meta-right { margin-left: auto; display: flex; gap: 6px; }
.icon-btn { width: 26px; height: 26px; border: 1px solid var(--ink-5); background: transparent; color: var(--ivory-3); cursor: pointer; display: grid; place-items: center; font-size: 10px; }

.chromatic-tape { height: 5px; background: linear-gradient(90deg, var(--note-do) 0 14%, var(--note-re) 14% 28%, var(--note-mi) 28% 43%, var(--note-fa) 43% 57%, var(--note-sol) 57% 71%, var(--note-la) 71% 86%, var(--note-ti) 86% 100%); border-left: 1px solid var(--ink-5); border-right: 1px solid var(--ink-5); border-bottom: 1px solid var(--ink-5); margin-top: -1px; margin-bottom: 14px; }

.param-row { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 14px; padding: 8px 4px; border-top: 1px solid var(--ink-5); border-bottom: 1px solid var(--ink-5); }
.param { text-align: center; }
.param .v { display: block; font: 400 18px/1 var(--font-display); letter-spacing: .01em; text-transform: uppercase; color: var(--ivory); }
.param .lbl { display: block; font: var(--t-label); letter-spacing: .12em; text-transform: uppercase; color: var(--ivory-3); margin-top: 4px; font-size: 10px; }

.tile-row { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; }
.tile { aspect-ratio: 1.05; display: flex; flex-direction: column; justify-content: space-between; padding: 7px 8px 8px; border: 1px solid rgba(0,0,0,.5); position: relative; overflow: hidden; }
.tile .syll { font: 400 26px/.9 var(--font-display); color: rgba(0,0,0,.88); }
.tile .pitch { font: 400 14px/.9 var(--font-display); color: rgba(0,0,0,.6); }
.tile.dark .syll { color: rgba(255,255,255,.95); }
.tile.dark .pitch { color: rgba(255,255,255,.7); }
.tile .corner { position: absolute; right: 5px; top: 5px; font: var(--t-mono); font-size: 8px; color: rgba(0,0,0,.45); letter-spacing: .1em; }
.tile.dark .corner { color: rgba(255,255,255,.45); }
</style>
