<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import VariantGrid from "@/style-guide/guide/VariantGrid.vue";

/*
 * One-shot gestures replay on a guide "bar": four beats of --dur-scene
 * (4 × 600ms). Each replay remounts the demo so it runs once at its real
 * token duration and then rests, instead of looping frantically.
 * Under Reduced Motion the bar never starts and CSS holds every demo still.
 */
const DEMO_BAR_MS = 2400;

const take = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  timer = setInterval(() => {
    take.value += 1;
  }, DEMO_BAR_MS);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

interface DurationLane {
  id: string;
  name: string;
  token: string;
  ms: number;
  ease: string;
  role: string;
}

const durations: DurationLane[] = [
  { id: "tap", name: "Tap", token: "--dur-tap", ms: 90, ease: "--ease-stab", role: "press · ripple · instant ack" },
  { id: "ui", name: "UI", token: "--dur-ui", ms: 220, ease: "--ease-stab", role: "tab swap · chip · segmented" },
  { id: "panel", name: "Panel", token: "--dur-panel", ms: 360, ease: "--ease-swing", role: "drawer in/out · mode change" },
  { id: "rip-mode", name: "Rip Mode", token: "--dur-rip-mode", ms: 360, ease: "--ease-rip-mode", role: "alias of --dur-panel · Mode Knob label swap" },
  { id: "scene", name: "Scene", token: "--dur-scene", ms: 600, ease: "--ease-brush", role: "visual fx fade · hero swap" },
  { id: "bounce", name: "Bounce", token: "--dur-bounce", ms: 600, ease: "--ease-bounce", role: "tactile elastic rebound" },
];

interface EaseCell {
  id: string;
  name: string;
  value: string;
  role: string;
  path: string;
  viewBox: string;
  polyline?: boolean;
}

const eases: EaseCell[] = [
  { id: "swing", name: "Swing", value: "cubic-bezier(.7, -.2, .3, 1.2)", role: "overshoot · press-play · tabs · knobs · drawer-in", path: "M0 28 C 70 32, 30 -4, 100 0", viewBox: "0 -6 100 40" },
  { id: "stab", name: "Stab", value: "cubic-bezier(.2, .9, .3, 1)", role: "snap in · key hit · press · play", path: "M0 28 C 20 0, 30 0, 100 0", viewBox: "0 -6 100 40" },
  { id: "brush", name: "Brush", value: "cubic-bezier(.4, 0, .2, 1)", role: "smooth · reveal fade · drift", path: "M0 28 C 40 28, 60 0, 100 0", viewBox: "0 -6 100 40" },
  { id: "sustain", name: "Sustain", value: "linear", role: "flywheel · playhead · scrub · meters", path: "M0 28 L 100 0", viewBox: "0 -6 100 40" },
  { id: "bend", name: "Bend", value: "cubic-bezier(.85, 0, .15, 1)", role: "tears and recovers · pitch · mode change · --ease-rip-mode alias", path: "M0 28 C 60 26, 40 2, 100 0", viewBox: "0 -6 100 40" },
  { id: "bounce", name: "Bounce", value: "linear() · 21 stops · elastic", role: "Boolean Knob · non-brass Button · Joystick stick · drag value", path: "0,28 10,-4 15,-8 25,3 30,5 40,0 45,-1 60,0 100,0", viewBox: "0 -12 100 42", polyline: true },
];
</script>

<template>
  <section class="preview-port preview-port--token-motion">
    <p class="caption mo-intro">
      Local gestures: durations say how long, easings say how it feels, keyframes say what moves.
      UIBeat is the transport clock; tempo and meter live in its System Protocols specimen.
    </p>
    <p class="mo-bar-note">
      <span class="mo-tape">Demo bar</span>
      <span class="mo-mono">each demo replays every 4 × --dur-scene and runs once at its own token timing</span>
    </p>

    <!-- ═══ DURATION ═══════════════════════════════════════════════ -->
    <VariantGrid id="motion-duration" title="Duration &middot; how long">
      <div class="mo-span-all mo-score">
        <div
          v-for="lane in durations"
          :key="lane.id"
          class="mo-lane"
          :class="`mo-lane--${lane.id}`"
          :style="{ '--lane-span': `${(lane.ms / 600) * 100}%` }"
        >
          <div class="mo-lane__head">
            <span class="mo-name">{{ lane.name }}</span>
            <span class="mo-ms">{{ lane.ms }}<small>ms</small></span>
          </div>
          <div class="mo-lane__well">
            <div class="mo-lane__track">
              <i :key="take" class="mo-lane__fill"></i>
            </div>
          </div>
          <div class="mo-lane__meta">
            <code class="mo-token">{{ lane.token }}</code>
            <span class="mo-mono">{{ lane.role }} · filled with {{ lane.ease }}</span>
          </div>
        </div>
        <p class="mo-mono mo-score__scale">Track length is time: full width = 600ms. Bounce overshoots its track, then settles.</p>
      </div>
    </VariantGrid>

    <!-- ═══ EASING ═════════════════════════════════════════════════ -->
    <VariantGrid id="motion-easing" title="Easing &middot; the horn section">
      <figure
        v-for="(ease, i) in eases"
        :key="ease.id"
        class="mo-cell mo-ease"
        :class="`mo-ease--${ease.id}`"
        :style="{ '--cell-rot': `var(--rot-tile-${(i % 5) + 1})` }"
      >
        <div class="mo-well mo-ease__well">
          <svg :viewBox="ease.viewBox" preserveAspectRatio="none" aria-hidden="true">
            <polyline v-if="ease.polyline" :points="ease.path" class="mo-ease__curve" />
            <path v-else :d="ease.path" class="mo-ease__curve" />
          </svg>
          <div class="mo-ease__track"><i class="mo-ease__runner"></i></div>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">{{ ease.name }}</span>
          <code class="mo-token">--ease-{{ ease.id }}</code>
          <span class="mo-mono mo-value">{{ ease.value }}</span>
          <span class="mo-mono">{{ ease.role }}</span>
        </figcaption>
      </figure>
    </VariantGrid>

    <!-- ═══ KEYFRAMES · TRANSITION ═════════════════════════════════ -->
    <VariantGrid id="motion-keyframes-transition" title="Keyframes &middot; transition">
      <figure class="mo-cell">
        <div class="mo-well demo-slide">
          <div :key="take" class="mo-tile mo-tile--cobalt"></div>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Cut Slide In</span>
          <code class="mo-token">@keyframes cut-slide-in</code>
          <span class="mo-mono mo-value">--dur-panel · --ease-stab</span>
          <span class="mo-mono">off-cut tab swap: skewX + translateX + fade</span>
        </figcaption>
      </figure>

      <figure class="mo-cell">
        <div class="mo-well demo-rip">
          <div class="mo-tile mo-tile--bone mo-tile--lg">
            <i :key="take" class="rip-corner"></i>
          </div>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Rip</span>
          <code class="mo-token">@keyframes rip</code>
          <span class="mo-mono mo-value">--dur-scene · --ease-stab</span>
          <span class="mo-mono">paper corner (--clip-paper-rip) tears off a tile on fire</span>
        </figcaption>
      </figure>

      <figure class="mo-cell">
        <div class="mo-well demo-rip-mode">
          <template v-if="take % 2 === 0">
            <span :key="`out-${take}`" class="cf-label cf-label--out">Lydian</span>
            <span :key="`in-${take}`" class="cf-label cf-label--in">Phrygian</span>
          </template>
          <template v-else>
            <span :key="`out-${take}`" class="cf-label cf-label--out">Phrygian</span>
            <span :key="`in-${take}`" class="cf-label cf-label--in">Lydian</span>
          </template>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Rip Mode</span>
          <code class="mo-token">@keyframes rip-mode-out · rip-mode-in</code>
          <span class="mo-mono mo-value">--dur-rip-mode · --ease-rip-mode</span>
          <span class="mo-mono">mode change: old label tears up, new one slides in</span>
        </figcaption>
      </figure>

      <figure class="mo-cell">
        <div class="mo-well demo-lift">
          <div :key="take" class="mo-tile mo-tile--pine"></div>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Lift</span>
          <code class="mo-token">@keyframes lift</code>
          <span class="mo-mono mo-value">--dur-scene · --ease-stab</span>
          <span class="mo-mono">tile rises 3px on tap, home by 34%</span>
        </figcaption>
      </figure>

      <figure class="mo-cell">
        <div class="mo-well demo-smear">
          <div :key="take" class="mo-tile mo-tile--plum"></div>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Smear</span>
          <code class="mo-token">@keyframes smear</code>
          <span class="mo-mono mo-value">--dur-panel · --ease-swing</span>
          <span class="mo-mono">horizontal stretch-snap</span>
        </figcaption>
      </figure>
    </VariantGrid>

    <!-- ═══ KEYFRAMES · FEEDBACK ═══════════════════════════════════ -->
    <VariantGrid id="motion-keyframes-feedback" title="Keyframes &middot; flash and glow">
      <figure class="mo-cell">
        <div class="mo-well demo-ring">
          <template v-for="n in [take]" :key="n">
            <i class="ring-el"></i>
            <div class="mo-tile mo-tile--sm mo-tile--ivory"></div>
          </template>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Ring</span>
          <code class="mo-token">@keyframes ring</code>
          <span class="mo-mono mo-value">--dur-scene · --ease-brush</span>
          <span class="mo-mono">chromatic ring grows to 1.45× and fades on tile fire</span>
        </figcaption>
      </figure>

      <figure class="mo-cell">
        <div class="mo-well demo-flash-tile">
          <div :key="take" class="mo-tile mo-tile--tomato"></div>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Flash</span>
          <code class="mo-token">@keyframes flash</code>
          <span class="mo-mono mo-value">--dur-panel · --ease-stab</span>
          <span class="mo-mono">tile fire: rise + scale + brighten</span>
        </figcaption>
      </figure>

      <figure class="mo-cell">
        <div class="mo-well demo-flash-ring">
          <template v-for="n in [take]" :key="n">
            <i class="ring-el"></i>
            <div class="mo-tile mo-tile--mustard"></div>
          </template>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Flash Ring</span>
          <code class="mo-token">@keyframes flash-ring</code>
          <span class="mo-mono mo-value">--dur-ui · --ease-stab</span>
          <span class="mo-mono">ring scales to 1.18× and fades · Note fire</span>
        </figcaption>
      </figure>

      <figure class="mo-cell">
        <div class="mo-well demo-paper-rip-flash">
          <template v-for="n in [take]" :key="n">
            <i class="ring-el"></i>
            <div class="mo-tile mo-tile--tomato"></div>
          </template>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Paper Rip Flash</span>
          <code class="mo-token">lift + flash + flash-ring</code>
          <span class="mo-mono mo-value">--dur-panel · ring --dur-ui</span>
          <span class="mo-mono">composed recipe layered on one tile</span>
        </figcaption>
      </figure>
    </VariantGrid>

    <!-- ═══ KEYFRAMES · BRASS ══════════════════════════════════════ -->
    <VariantGrid id="motion-keyframes-brass" title="Keyframes &middot; brass">
      <figure class="mo-cell mo-cell--wide">
        <div class="mo-well demo-shimmer">
          <div class="brass-bar"></div>
        </div>
        <figcaption class="mo-cap">
          <span class="mo-name">Brass Sheen</span>
          <code class="mo-token">@keyframes brass-sheen</code>
          <span class="mo-mono mo-value">6.5s · cubic-bezier(.55, .05, .45, .95) · the .brass recipe</span>
          <span class="mo-mono">gradient sweep across brass fills; one signal per view</span>
        </figcaption>
      </figure>
    </VariantGrid>

    <p class="caption mo-outro">
      Shared keyframes cover transition (<code>cut-slide-in</code>, <code>rip</code>, <code>rip-mode-out</code>,
      <code>rip-mode-in</code>, <code>smear</code>, <code>lift</code>), event feedback (<code>ring</code>,
      <code>flash</code>, <code>flash-ring</code>), and brand (<code>brass-sheen</code>).
      <code>paper-rip-flash</code> composes <code>lift</code> + <code>flash</code> + <code>flash-ring</code>.
      The six gesture eases are curves, not keyframes; the horn section runs each on the same track for comparison.
      Bounce promotes the Boolean Knob's elastic rebound for shared tactile use.
      Tempo-linked recipes belong to UIBeat consumers, not global CSS loops.
    </p>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

/* ─── intro ─────────────────────────────────────────────────────── */
.mo-intro {
  max-width: 62ch;
  margin: 0;
}
.mo-bar-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3) var(--s-4);
  margin: var(--s-5) 0 0;
}
.mo-tape {
  padding: 5px 10px 3px;
  background: var(--guide-paper, var(--bone));
  color: var(--guide-paper-ink, var(--ink));
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tab);
  transform: rotate(var(--rot-sticker));
}

/* ─── shared type ───────────────────────────────────────────────── */
.mo-name {
  font: 700 20px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}
.mo-token {
  font: var(--t-body-s-mono);
  color: var(--ivory);
}
.mo-mono {
  font: var(--t-caption);
  color: var(--ivory-3);
}
.mo-value {
  color: var(--guide-paper-text, var(--bone));
}

/* ─── cells ─────────────────────────────────────────────────────── */
.mo-span-all { grid-column: 1 / -1; }

.mo-cell {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
  margin: 0;
}
.mo-cell--wide { grid-column: span 2; }

.mo-well {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 110px;
  background: var(--ink);
  overflow: hidden;
}

.mo-cap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* cut-paper tiles used by every keyframe demo */
.mo-tile {
  position: relative;
  width: 30px;
  height: 30px;
  clip-path: var(--clip-tile);
}
.mo-tile--sm { width: 14px; height: 14px; }
.mo-tile--lg { width: 44px; height: 44px; clip-path: none; }
.mo-tile--ivory   { background: var(--ivory); }
.mo-tile--bone    { background: var(--bone); }
.mo-tile--tomato  { background: var(--tomato); }
.mo-tile--pine    { background: var(--pine); }
.mo-tile--plum    { background: var(--plum); }
.mo-tile--mustard { background: var(--mustard); }
.mo-tile--cobalt  { background: var(--cobalt); }

/* ════════════════════════════════════════════════════════════════
   DURATION — a score: each lane's track is proportional to its time,
   and the fill crosses it in exactly that token's duration.
   ════════════════════════════════════════════════════════════════ */
.mo-score {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: var(--s-6) var(--s-7);
}
.mo-score__scale { grid-column: 1 / -1; margin: 0; }

.mo-lane {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  min-width: 0;
}
.mo-lane__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-4);
}
.mo-ms {
  font: 700 28px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  color: var(--guide-paper-text, var(--bone));
}
.mo-ms small {
  margin-left: 2px;
  font: var(--t-caption);
  color: var(--ivory-3);
}
.mo-lane__well {
  padding: 16px 14px;
  background: var(--ink);
}
.mo-lane__track {
  position: relative;
  width: var(--lane-span);
  height: 14px;
  background: var(--ink-3);
  clip-path: var(--clip-tab);
  overflow: visible;
}
.mo-lane__fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 100%;
  background: var(--ivory);
  clip-path: var(--clip-tab);
  animation: dur-fill var(--lane-dur) var(--lane-ease) both;
  animation-delay: var(--lane-delay, 0s);
}
.mo-lane--bounce .mo-lane__track { clip-path: none; }
.mo-lane__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mo-lane--tap      { --lane-dur: var(--dur-tap);      --lane-ease: var(--ease-stab); }
.mo-lane--ui       { --lane-dur: var(--dur-ui);       --lane-ease: var(--ease-stab); }
.mo-lane--panel    { --lane-dur: var(--dur-panel);    --lane-ease: var(--ease-swing); }
.mo-lane--rip-mode { --lane-dur: var(--dur-rip-mode); --lane-ease: var(--ease-rip-mode); }
.mo-lane--scene    { --lane-dur: var(--dur-scene);    --lane-ease: var(--ease-brush); }
.mo-lane--bounce   { --lane-dur: var(--dur-bounce);   --lane-ease: var(--ease-bounce); }
.mo-lane--bounce .mo-lane__fill { background: var(--mustard); }

@keyframes dur-fill {
  from { width: 0; }
  to   { width: 100%; }
}

/* ════════════════════════════════════════════════════════════════
   EASING — the horn section: curve + a cut-paper runner on one track.
   Each runner crosses in 2 × --dur-scene, then plays back.
   ════════════════════════════════════════════════════════════════ */
.mo-ease { transform: rotate(var(--cell-rot)); }
.mo-ease--swing   { --ease-colour: var(--cobalt);  --ease-fn: var(--ease-swing); }
.mo-ease--stab    { --ease-colour: var(--tomato);  --ease-fn: var(--ease-stab); }
.mo-ease--brush   { --ease-colour: var(--bone);    --ease-fn: var(--ease-brush); }
.mo-ease--sustain { --ease-colour: var(--pine);    --ease-fn: var(--ease-sustain); }
.mo-ease--bend    { --ease-colour: var(--plum);    --ease-fn: var(--ease-bend); }
.mo-ease--bounce  { --ease-colour: var(--mustard); --ease-fn: var(--ease-bounce); }

.mo-ease__well {
  flex-direction: column;
  justify-content: flex-end;
  gap: 12px;
  min-height: 120px;
  padding: 14px 12px 14px;
}
.mo-ease__well svg {
  width: 100%;
  height: 52px;
  overflow: visible;
}
.mo-ease__curve {
  fill: none;
  stroke: var(--ease-colour);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}
.mo-ease__track {
  position: relative;
  width: 100%;
  height: 12px;
  background: var(--ink-3);
  clip-path: var(--clip-tab);
}
.mo-ease__runner {
  position: absolute;
  top: 0;
  left: 0;
  width: 18px;
  height: 12px;
  background: var(--ease-colour);
  clip-path: var(--clip-tile);
  animation: ease-run calc(var(--dur-scene) * 2) var(--ease-fn) infinite alternate;
}
.mo-ease--bounce .mo-ease__track { clip-path: none; }

@keyframes ease-run {
  from { left: 0; }
  to   { left: calc(100% - 18px); }
}

/* ════════════════════════════════════════════════════════════════
   KEYFRAMES — global @keyframes from the design system, run once per
   demo bar at the token timing printed under each well.
   ════════════════════════════════════════════════════════════════ */
.demo-slide .mo-tile {
  animation: cut-slide-in var(--dur-panel) var(--ease-stab) both;
}

.demo-rip .rip-corner {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: var(--ivory);
  clip-path: var(--clip-paper-rip);
  animation: rip var(--dur-scene) var(--ease-stab) both;
}

.demo-rip-mode .cf-label {
  position: absolute;
  font: 700 24px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
  animation-duration: var(--dur-rip-mode);
  animation-timing-function: var(--ease-rip-mode);
  animation-fill-mode: both;
}
.demo-rip-mode .cf-label--out { animation-name: rip-mode-out; }
.demo-rip-mode .cf-label--in  { animation-name: rip-mode-in; color: var(--guide-paper-text, var(--bone)); }

.demo-lift .mo-tile {
  animation: lift var(--dur-scene) var(--ease-stab) both;
}
.demo-smear .mo-tile {
  animation: smear var(--dur-panel) var(--ease-swing) both;
}

.ring-el {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border: 2px solid var(--tomato);
  box-sizing: border-box;
  opacity: 0;
}
.demo-ring .ring-el {
  animation: ring var(--dur-scene) var(--ease-brush) both;
}
.demo-flash-tile .mo-tile {
  animation: flash var(--dur-panel) var(--ease-stab) both;
}
.demo-flash-ring .ring-el {
  border-color: var(--mustard);
  animation: flash-ring var(--dur-ui) var(--ease-stab) both;
}
.demo-paper-rip-flash .mo-tile {
  animation:
    flash var(--dur-panel) var(--ease-stab) both,
    lift var(--dur-panel) var(--ease-stab) both;
}
.demo-paper-rip-flash .ring-el {
  animation: flash-ring var(--dur-ui) var(--ease-stab) both;
}

/* brass-sheen: brass is the subject here, so the brass finish is allowed */
.demo-shimmer .brass-bar {
  position: absolute;
  inset: 22px 18px;
  background: var(--brass-fill);
  overflow: hidden;
  isolation: isolate;
  clip-path: var(--clip-offcut);
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

.mo-outro {
  max-width: 72ch;
  margin: var(--s-9) 0 0;
  line-height: 1.55;
}

/* ─── Reduced motion ─────────────────────────────────────────────
   The guide becomes fully still; UIBeat keeps logical phase only.
   Every demo rests on its end state. */
@media (prefers-reduced-motion: reduce) {
  .preview-port--token-motion *,
  .preview-port--token-motion *::before,
  .preview-port--token-motion *::after {
    animation: none !important;
    transition: none !important;
  }

  .demo-rip-mode .cf-label--out { display: none; }
  .demo-rip-mode .cf-label--in  { opacity: 1; }
}
</style>
