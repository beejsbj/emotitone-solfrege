<script setup lang="ts">
// @ts-nocheck
import { onMounted } from "vue";

onMounted(() => {
  (function () {
    /* ── Hero anatomy stage (click-toggle only, no drag) ─────────── */
    var heroStage  = document.getElementById('heroStage');
    var heroDrawer = document.getElementById('heroDrawer');
    var heroHandle = document.getElementById('heroHandle');
    var heroScrim  = document.getElementById('heroScrim');

    function heroToggle() {
      var open = heroDrawer.classList.toggle('is-open');
      if (open) heroStage.classList.add('is-open');
      else heroStage.classList.remove('is-open');
    }
    heroHandle.addEventListener('click', heroToggle);
    heroScrim.addEventListener('click', function () {
      heroDrawer.classList.remove('is-open');
      heroStage.classList.remove('is-open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        heroDrawer.classList.remove('is-open');
        heroStage.classList.remove('is-open');
      }
    });

    /* ── Drag-to-resize helper ───────────────────────────────────── */
    /*
     * Snap points: closed (0% — fully off-screen via translateY),
     *              designed (72% of frame height),
     *              full (100% of frame height).
     *
     * "Full" means the drawer fills the entire var-frame — it is bounded by
     * the card's 700px width and the var-frame's fixed height (200px). It
     * does NOT mean browser full-screen.
     *
     * Drag logic:
     *   - pointerdown on handle → capture initial pointer Y + drawer height.
     *   - pointermove → compute delta, update drawer height directly (no
     *     transform while dragging so the panel tracks the finger).
     *   - pointerup → measure distance from each snap point; snap to nearest.
     *   - If total drag < 6px, treat as click and toggle between closed <-> designed.
     *
     * Top drawer height grows downward (delta = currentY - startY).
     * Bottom drawer height grows upward (delta = startY - currentY).
     */

    function makeDrawerController(opts) {
      /*
       * opts = {
       *   frame      : HTMLElement,   // .var-frame (defines available height)
       *   drawer     : HTMLElement,   // .var-drawer-top | .var-drawer-bottom
       *   handle     : HTMLElement,   // the handle button
       *   scrim      : HTMLElement,
       *   anchor     : 'top' | 'bottom',
       *   snapBadge  : HTMLElement,
       * }
       */
      var frame    = opts.frame;
      var drawer   = opts.drawer;
      var handle   = opts.handle;
      var scrim    = opts.scrim;
      var anchor   = opts.anchor;
      var badge    = opts.snapBadge;

      var DESIGNED_FRAC = 0.72;  // designed snap height as fraction of frame
      var MIN_DRAG_PX   = 6;     // below this threshold, treat as click

      var dragging     = false;
      var startY       = 0;
      var startHeight  = 0;
      var currentOpen  = true;  // variants start open

      /* Helpers */
      function frameH() { return frame.offsetHeight; }

      function snapPoints() {
        var fh = frameH();
        return [0, Math.round(fh * DESIGNED_FRAC), fh];
      }

      function nearestSnap(h) {
        var pts = snapPoints();
        var best = pts[0];
        var bestDist = Math.abs(h - pts[0]);
        for (var i = 1; i < pts.length; i++) {
          var d = Math.abs(h - pts[i]);
          if (d < bestDist) { bestDist = d; best = pts[i]; }
        }
        return best;
      }

      function snapName(h) {
        var fh = frameH();
        if (h <= 0) return 'closed';
        if (h >= fh - 2) return 'full';
        return 'designed';
      }

      function applyHeight(h, animate) {
        if (!animate) drawer.classList.add('is-dragging');
        else drawer.classList.remove('is-dragging');

        if (h <= 0) {
          /* closed: restore translateY so CSS handles it */
          drawer.style.height = '';
          drawer.style.transform = '';
          drawer.classList.remove('is-open');
          frame.classList.remove('is-open');
          currentOpen = false;
        } else {
          drawer.style.height = h + 'px';
          drawer.style.transform = 'translateY(0)';
          drawer.classList.add('is-open');
          frame.classList.add('is-open');
          currentOpen = true;
        }
      }

      function flashBadge(name) {
        badge.textContent = name;
        badge.classList.add('show');
        clearTimeout(badge._t);
        badge._t = setTimeout(function () { badge.classList.remove('show'); }, 900);
      }

      /* Click toggle (no drag) */
      function toggle() {
        if (currentOpen) {
          /* close */
          drawer.style.height = '';
          drawer.style.transform = '';
          drawer.classList.remove('is-dragging', 'is-open');
          frame.classList.remove('is-open');
          currentOpen = false;
          flashBadge('closed');
        } else {
          /* open to designed height */
          var dh = Math.round(frameH() * DESIGNED_FRAC);
          applyHeight(dh, true);
          flashBadge('designed');
        }
      }

      /* Pointer handlers */
      function onPointerDown(e) {
        /* Only primary button / touch */
        if (e.button && e.button !== 0) return;
        dragging  = true;
        startY    = e.clientY;
        startHeight = (drawer.style.height ? parseInt(drawer.style.height, 10) : 0);
        if (startHeight === 0 && currentOpen) {
          startHeight = Math.round(frameH() * DESIGNED_FRAC);
        }
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
      }

      function onPointerMove(e) {
        if (!dragging) return;
        var delta = (anchor === 'top')
          ? (e.clientY - startY)   /* top: drag down = bigger */
          : (startY - e.clientY);  /* bottom: drag up = bigger */
        var h = Math.max(0, Math.min(frameH(), startHeight + delta));
        applyHeight(h, false);
        e.preventDefault();
      }

      function onPointerUp(e) {
        if (!dragging) return;
        dragging = false;
        var totalDrag = Math.abs(e.clientY - startY);

        if (totalDrag < MIN_DRAG_PX) {
          /* Treat as click */
          toggle();
          return;
        }

        /* Snap to nearest point */
        var currentH = drawer.style.height ? parseInt(drawer.style.height, 10) : 0;
        var snapped  = nearestSnap(currentH);
        applyHeight(snapped, true);
        flashBadge(snapName(snapped));
      }

      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup',   onPointerUp);
      handle.addEventListener('pointercancel', function () { dragging = false; });

      /* Scrim closes */
      scrim.addEventListener('click', function () {
        drawer.style.height = '';
        drawer.style.transform = '';
        drawer.classList.remove('is-dragging', 'is-open');
        frame.classList.remove('is-open');
        currentOpen = false;
        flashBadge('closed');
      });

      /* ESC key closes */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && currentOpen) {
          drawer.style.height = '';
          drawer.style.transform = '';
          drawer.classList.remove('is-dragging', 'is-open');
          frame.classList.remove('is-open');
          currentOpen = false;
        }
      });
    }

    /* Wire up top variant */
    makeDrawerController({
      frame:     document.getElementById('topFrame'),
      drawer:    document.getElementById('topDrawer'),
      handle:    document.getElementById('topHandle'),
      scrim:     document.getElementById('topScrim'),
      anchor:    'top',
      snapBadge: document.getElementById('topSnapBadge'),
    });

    /* Wire up bottom variant */
    makeDrawerController({
      frame:     document.getElementById('botFrame'),
      drawer:    document.getElementById('botDrawer'),
      handle:    document.getElementById('botHandle'),
      scrim:     document.getElementById('botScrim'),
      anchor:    'bottom',
      snapBadge: document.getElementById('botSnapBadge'),
    });

  })();
});
</script>

<template>
  <section class="preview-port preview-port--unique-drawer">
    <div class="card">
      <div class="label">DRAWER · SLIDING PANEL</div>

      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">

        <!-- Hero: top drawer, open state (interactive) -->
        <div class="hero-stage is-open" id="heroStage">
          <div class="hero-app-stub">
            <div class="hero-app-stub-row" style="width:60%;"></div>
            <div class="hero-app-stub-row" style="width:90%;"></div>
            <div class="hero-app-stub-row" style="width:75%;"></div>
          </div>
          <div class="hero-scrim" id="heroScrim"></div>
          <div class="hero-drawer is-open" id="heroDrawer">
            <div class="hero-drawer-body">
              <div class="hero-content-stub" style="width:80%;"></div>
              <div class="hero-content-stub" style="width:55%;"></div>
              <div class="hero-content-stub" style="width:70%;"></div>
            </div>
            <button class="drawer-handle" id="heroHandle" aria-label="toggle drawer">
              <span class="drawer-tear" aria-hidden="true">
                <svg viewBox="0 0 200 14" preserveAspectRatio="none">
                  <path stroke-linecap="butt" d="M0 0 L12 8 L24 2 L38 10 L52 4 L66 11 L80 3 L94 9 L108 2 L122 10 L136 4 L150 9 L164 3 L178 10 L192 5 L200 12 L200 14 L0 14 Z" fill="var(--ink-3)"/>
                </svg>
              </span>
              <span class="drawer-grip"></span>
              <span class="handle-label">Drag &middot; Tap &middot; ESC</span>
              <span class="drawer-grip"></span>
            </button>
          </div>
        </div><!-- /hero-stage -->

        <!-- Anatomy spec table -->
        <div class="anatomy">
          <div class="row"><b>Panel</b><div>ink-3 bg &middot; slides over stage &middot; z-index 3</div></div>
          <div class="row"><b>Handle</b><div>28px bar &middot; torn SVG edge &middot; 2&times; grip bars &middot; ns-resize cursor</div></div>
          <div class="row"><b>Anchor</b><div>top-edge or bottom-edge &middot; full container width</div></div>
          <div class="row"><b>Slide</b><div>translateY(&minus;100%&rarr;0) &middot; ease-swing &middot; dur-panel 360ms</div></div>
          <div class="row"><b>Scrim</b><div>opacity 0&rarr;1 &middot; ease-brush &middot; var(--scrim) overlay</div></div>
          <div class="row"><b>Resize</b><div>drag handle &middot; snaps to closed / designed (72%) / full (100%)</div></div>
        </div>

      </div><!-- /anatomy-wrap -->

      <div class="section-head">Anchors</div>
      <div class="variants-full" style="grid-template-columns:repeat(2,1fr); gap:12px;">

        <!-- Top anchor variant -->
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div class="var-frame" id="topFrame" data-anchor="top">
            <span class="var-pin">Top &middot; Open</span>
            <div class="var-app-stub" id="topAppStub">
              <div class="var-app-stub-row"></div>
              <div class="var-app-stub-row" style="width:75%;"></div>
              <div class="var-app-stub-row" style="width:55%;"></div>
              <div class="var-app-stub-row" style="width:85%;"></div>
            </div>
            <div class="var-scrim" id="topScrim"></div>
            <div class="var-drawer-top is-open" id="topDrawer">
              <div class="var-drawer-body">
                <div class="var-content-stub" style="width:80%;"></div>
                <div class="var-content-stub" style="width:60%;"></div>
                <div class="var-content-stub" style="width:70%;"></div>
              </div>
              <button class="var-handle-top" id="topHandle" aria-label="toggle top drawer">
                <span class="var-tear-top" aria-hidden="true">
                  <svg viewBox="0 0 200 14" preserveAspectRatio="none">
                    <path stroke-linecap="butt" d="M0 0 L12 8 L24 2 L38 10 L52 4 L66 11 L80 3 L94 9 L108 2 L122 10 L136 4 L150 9 L164 3 L178 10 L192 5 L200 12 L200 14 L0 14 Z" fill="var(--ink-3)"/>
                  </svg>
                </span>
                <span class="var-grip"></span>
                <span class="var-grip"></span>
              </button>
            </div>
            <span class="snap-badge" id="topSnapBadge"></span>
          </div>
          <div class="var-caption">Top anchor &mdash; drag handle to resize &middot; tap scrim to close</div>
        </div>

        <!-- Bottom anchor variant -->
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div class="var-frame" id="botFrame" data-anchor="bottom">
            <span class="var-pin">Bottom &middot; Open</span>
            <div class="var-app-stub" id="botAppStub">
              <div class="var-app-stub-row"></div>
              <div class="var-app-stub-row" style="width:80%;"></div>
              <div class="var-app-stub-row" style="width:65%;"></div>
              <div class="var-app-stub-row" style="width:90%;"></div>
            </div>
            <div class="var-scrim" id="botScrim"></div>
            <div class="var-drawer-bottom is-open" id="botDrawer">
              <button class="var-handle-bottom" id="botHandle" aria-label="toggle bottom drawer">
                <span class="var-tear-bottom" aria-hidden="true">
                  <svg viewBox="0 0 200 14" preserveAspectRatio="none">
                    <path stroke-linecap="butt" d="M0 0 L12 8 L24 2 L38 10 L52 4 L66 11 L80 3 L94 9 L108 2 L122 10 L136 4 L150 9 L164 3 L178 10 L192 5 L200 12 L200 14 L0 14 Z" fill="var(--ink-3)"/>
                  </svg>
                </span>
                <span class="var-grip"></span>
                <span class="var-grip"></span>
              </button>
              <div class="var-drawer-body">
                <div class="var-content-stub" style="width:75%;"></div>
                <div class="var-content-stub" style="width:50%;"></div>
                <div class="var-content-stub" style="width:65%;"></div>
              </div>
            </div>
            <span class="snap-badge" id="botSnapBadge"></span>
          </div>
          <div class="var-caption">Bottom anchor &mdash; drag handle to resize &middot; tap scrim to close</div>
        </div>

      </div><!-- /variants-full -->

      <div class="caption">
        Drawer slides on <code>--ease-swing</code>; drag the handle to resize. Top and bottom anchors share the same primitive.
      </div>

    </div><!-- /card -->
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}
/* =====================================================================
   DRAWER — SLIDING PANEL (UNIQUE SPECIMEN)
   Two side-by-side interactive variants (top + bottom) with
   drag-to-resize affordance and anatomy hero.
   ===================================================================== */

/* ── Grammar markers ─────────────────────────────────────────────── */
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

/* ── Hero anatomy stage — top drawer, mid-open ─────────────────── */
.hero-stage {
  position: relative;
  height: 260px;
  overflow: hidden;
  background: var(--ink);
  border: 1px solid var(--ink-5);
}

.hero-app-stub {
  position: absolute;
  inset: 0;
  padding: 14px;
  transition: transform var(--dur-panel) var(--ease-swing);
}
.hero-app-stub-row {
  border: 1px solid var(--ink-5);
  background: var(--ink-3);
  height: 28px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.hero-scrim {
  position: absolute; inset: 0;
  background: var(--scrim);
  opacity: 0; pointer-events: none;
  transition: opacity var(--dur-panel) var(--ease-brush);
  z-index: 2;
  cursor: pointer;
}

/* Top-anchored drawer */
.hero-drawer {
  position: absolute; left: 0; right: 0; top: 0;
  background: var(--ink-3);
  transform: translateY(-100%);
  transition: transform var(--dur-panel) var(--ease-swing);
  z-index: 3;
  height: 72%;
  display: flex; flex-direction: column;
}
.hero-drawer.is-open { transform: translateY(0); }
.hero-stage.is-open .hero-scrim { opacity: 1; pointer-events: auto; }
.hero-stage.is-open .hero-app-stub { transform: translateY(16px); }

.hero-drawer-body { padding: 20px 22px 16px; overflow: auto; flex: 1; }
.hero-content-stub {
  border: 1px solid var(--ink-5);
  height: 20px;
  margin-bottom: 10px;
  background: var(--ink-4);
  opacity: 0.6;
}

/* Torn paper handle — lifted verbatim from composition-top-drawer.html */
.drawer-handle {
  position: relative;
  height: 28px;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  cursor: ns-resize; user-select: none;
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

/* ── Variant frames (interactive, draggable) ────────────────────── */
.var-frame {
  position: relative;
  overflow: hidden;
  background: var(--ink);
  border: 1px solid var(--ink-5);
  height: 200px;
}

/* Label pin */
.var-pin {
  position: absolute;
  top: 6px; left: 8px;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--ivory-4);
  z-index: 10;
  pointer-events: none;
}

/* App stubs behind drawers */
.var-app-stub {
  position: absolute;
  inset: 0;
  padding: 22px 10px 10px;
  transition: transform var(--dur-panel) var(--ease-swing);
}
.var-app-stub-row {
  height: 12px;
  border: 1px solid var(--ink-5);
  background: var(--ink-3);
  margin-bottom: 6px;
  opacity: 0.45;
}

/* Scrim */
.var-scrim {
  position: absolute; inset: 0;
  background: var(--scrim);
  opacity: 0; pointer-events: none;
  transition: opacity var(--dur-panel) var(--ease-brush);
  z-index: 2;
  cursor: pointer;
}
.var-frame.is-open .var-scrim { opacity: 1; pointer-events: auto; }

/* ── Top-anchored variant drawer ───────────────────────────────── */
.var-drawer-top {
  position: absolute; left: 0; right: 0; top: 0;
  background: var(--ink-3);
  /* height controlled via JS drag; default designed height */
  height: 72%;
  transform: translateY(-100%);
  transition: transform var(--dur-panel) var(--ease-swing);
  z-index: 3;
  display: flex; flex-direction: column;
  /* clip to the frame via parent overflow:hidden */
}
.var-drawer-top.is-open {
  transform: translateY(0);
}

/* ── Bottom-anchored variant drawer ────────────────────────────── */
.var-drawer-bottom {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: var(--ink-3);
  height: 72%;
  transform: translateY(100%);
  transition: transform var(--dur-panel) var(--ease-swing);
  z-index: 3;
  display: flex; flex-direction: column;
}
.var-drawer-bottom.is-open {
  transform: translateY(0);
}

/* Drawer content area */
.var-drawer-body {
  flex: 1; overflow: hidden;
  padding: 10px 12px 6px;
}
.var-content-stub {
  height: 8px;
  border: 1px solid var(--ink-5);
  background: var(--ink-4);
  margin-bottom: 6px;
  opacity: 0.65;
}

/* Handle for top drawer (sits at bottom of top drawer) */
.var-handle-top {
  position: relative;
  height: 24px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  cursor: ns-resize; user-select: none;
  background: transparent; border: 0; padding: 0; width: 100%;
  flex-shrink: 0;
}
.var-tear-top {
  position: absolute; left: 0; right: 0; top: -8px; height: 12px;
  pointer-events: none; overflow: hidden;
}
.var-tear-top svg { width: 100%; height: 100%; display: block; }

/* Handle for bottom drawer (sits at top of bottom drawer via order) */
.var-handle-bottom {
  position: relative;
  height: 24px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  cursor: ns-resize; user-select: none;
  background: transparent; border: 0; padding: 0; width: 100%;
  flex-shrink: 0;
  order: -1; /* float to top of flex column */
}
.var-tear-bottom {
  position: absolute; left: 0; right: 0; bottom: -8px; height: 12px;
  pointer-events: none; overflow: hidden;
  transform: scaleY(-1);
}
.var-tear-bottom svg { width: 100%; height: 100%; display: block; }

.var-grip { width: 24px; height: 2px; background: var(--ivory-4); }

/* Snap hint badge — shown briefly after drag snaps */
.snap-badge {
  position: absolute;
  bottom: 6px; right: 8px;
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-4);
  z-index: 20;
  pointer-events: none;
  opacity: 0;
  transition: opacity 180ms var(--ease-brush);
}
.snap-badge.show { opacity: 1; }

/* Variant caption below frame */
.var-caption {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ivory-4);
  text-align: center;
  padding-top: 3px;
}

/* Dragging state — suppress transition so it tracks the pointer */
.var-drawer-top.is-dragging,
.var-drawer-bottom.is-dragging {
  transition: none;
}

/* ── reduced-motion guards ─────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .hero-drawer,
  .hero-scrim,
  .hero-app-stub,
  .var-drawer-top,
  .var-drawer-bottom,
  .var-scrim {
    transition: opacity 120ms linear !important;
    transform: none !important;
  }
  .hero-drawer:not(.is-open),
  .var-drawer-top:not(.is-open),
  .var-drawer-bottom:not(.is-open) { opacity: 0; }
  .hero-drawer.is-open,
  .var-drawer-top.is-open,
  .var-drawer-bottom.is-open { opacity: 1; }
}
</style>
