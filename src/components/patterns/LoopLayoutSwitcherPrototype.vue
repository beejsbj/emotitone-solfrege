<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Not for main.
 * Flips between placements of the mic and loop buttons so Burooj can taste them
 * on the phone. `?layout=a|b|c|d|e` picks one; the pill steps through them.
 * Positions are pure CSS keyed off `html[data-loop-layout]`, because both
 * buttons are teleported to body with fixed positioning.
 *
 * The root is a zero-height anchor sitting at the Drawer's top edge; its top is
 * published as `--loop-layout-drawer-top` so variants can ride the Drawer.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const LAYOUTS = [
  { key: "a", name: "centred pair" },
  { key: "b", name: "rail right" },
  { key: "c", name: "diagonal" },
  { key: "d", name: "loop roots dials" },
  { key: "e", name: "on the lip" },
] as const;

function readLayout() {
  const requested = new URLSearchParams(window.location.search).get("layout")?.toLowerCase();
  const index = LAYOUTS.findIndex((layout) => layout.key === requested);
  return index < 0 ? 0 : index;
}

const index = ref(readLayout());
const current = computed(() => LAYOUTS[index.value]);
const label = computed(() => `${current.value.key.toUpperCase()} · ${current.value.name}`);

function apply() {
  document.documentElement.dataset.loopLayout = current.value.key;
  const url = new URL(window.location.href);
  url.searchParams.set("layout", current.value.key);
  history.replaceState(history.state, "", url);
}

function step(delta: number) {
  index.value = (index.value + delta + LAYOUTS.length) % LAYOUTS.length;
  apply();
}

const anchor = ref<HTMLElement>();
let frame = 0;
let lastTop = -1;
function track() {
  frame = requestAnimationFrame(track);
  const top = Math.round(anchor.value?.getBoundingClientRect().top ?? -1);
  if (top === lastTop || top < 0) return;
  lastTop = top;
  document.documentElement.style.setProperty("--loop-layout-drawer-top", `${top}px`);
}

onMounted(() => {
  apply();
  track();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  delete document.documentElement.dataset.loopLayout;
  document.documentElement.style.removeProperty("--loop-layout-drawer-top");
});
</script>

<template>
  <div ref="anchor" class="loop-layout-anchor" aria-hidden="true" />
  <Teleport to="body">
    <div class="loop-layout-switcher" role="group" aria-label="Prototype layout switcher">
      <button type="button" aria-label="Previous layout" @click="step(-1)">‹</button>
      <span>{{ label }}</span>
      <button type="button" aria-label="Next layout" @click="step(1)">›</button>
    </div>
  </Teleport>
</template>

<style scoped>
.loop-layout-anchor {
  height: 0;
}
</style>

<style>
/* PROTOTYPE — throwaway. Deliberately not the design: a plain debug pill. */
.loop-layout-switcher {
  position: fixed;
  z-index: 200;
  top: calc(var(--loop-layout-drawer-top, 60vh) * 0.42);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border: 2px solid #000;
  border-radius: 999px;
  background: #fff;
  color: #000;
  font: 600 13px/1 system-ui, sans-serif;
  white-space: nowrap;
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
}

.loop-layout-switcher button {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: #000;
  color: #fff;
  font: 700 22px/1 system-ui, sans-serif;
}

.loop-layout-switcher span {
  min-width: 132px;
  text-align: center;
}

/* ---- Shared: both keys equal, 28px visible, 44px to touch. ---- */
html[data-loop-layout] .loop-mode-button__button::before,
html[data-loop-layout] .humming-capture-transport__primary::before {
  content: "";
  position: absolute;
  inset: -8px;
}

/* Offsets below place the 28px visible key; its hit area reaches 8px further.
   Each variant resets inset and transform itself, so its offsets win. */

/* ---- B · rail right: a vertical channel strip on the right edge, mic over loop. ---- */
html[data-loop-layout="b"] .humming-capture-transport {
  inset: auto;
  transform: none;
  top: calc(env(safe-area-inset-top, 0px) + 44px);
  right: 14px;
}
html[data-loop-layout="b"] .loop-mode-button {
  inset: auto;
  transform: none;
  top: calc(env(safe-area-inset-top, 0px) + 88px);
  right: 14px;
}

/* ---- C · diagonal: mic under the instrument tab, loop low on the right. ---- */
html[data-loop-layout="c"] .humming-capture-transport {
  inset: auto;
  transform: none;
  top: calc(env(safe-area-inset-top, 0px) + 44px);
  left: 14px;
}
html[data-loop-layout="c"] .loop-mode-button {
  inset: auto;
  transform: none;
  top: calc(var(--loop-layout-drawer-top, 60vh) * 0.68);
  right: 14px;
}

/* ---- D · loop roots dials: loop is the base of its layer column; mic top right. ---- */
html[data-loop-layout="d"] .humming-capture-transport {
  inset: auto;
  transform: none;
  top: calc(env(safe-area-inset-top, 0px) + 44px);
  right: 14px;
}
html[data-loop-layout="d"] .loop-mode-button {
  inset: auto;
  transform: none;
  top: calc(var(--loop-layout-drawer-top, 60vh) - 74px);
  left: 14px;
}
html[data-loop-layout="d"] .loop-platter__layers {
  bottom: 86px;
}

/* ---- E · on the lip: the pair sits on the Drawer's top edge, left; dials climb above. ---- */
html[data-loop-layout="e"] .loop-mode-button {
  inset: auto;
  transform: none;
  top: calc(var(--loop-layout-drawer-top, 60vh) - 74px);
  left: 14px;
}
html[data-loop-layout="e"] .humming-capture-transport {
  inset: auto;
  transform: none;
  top: calc(var(--loop-layout-drawer-top, 60vh) - 74px);
  left: 58px;
}
html[data-loop-layout="e"] .loop-platter__layers {
  bottom: 86px;
}

/* ---- Mic furniture follows its key away from the centre. ---- */
/* Right edge: cancel hangs to the left, feedback drops below, right-aligned. */
html[data-loop-layout="b"] .humming-capture-transport__cancel-slot,
html[data-loop-layout="d"] .humming-capture-transport__cancel-slot {
  left: auto;
  right: calc(100% + 12px);
}
html[data-loop-layout="b"] .humming-capture-transport__feedback,
html[data-loop-layout="d"] .humming-capture-transport__feedback {
  left: auto;
  right: 0;
  transform: none;
  justify-items: end;
}
/* B's loop sits directly below the mic, so its feedback clears the loop key. */
html[data-loop-layout="b"] .humming-capture-transport__feedback {
  top: calc(100% + 60px);
}
/* Left edge: feedback left-aligned (below in C, above in E). */
html[data-loop-layout="c"] .humming-capture-transport__feedback,
html[data-loop-layout="e"] .humming-capture-transport__feedback {
  left: 0;
  transform: none;
  justify-items: start;
}
html[data-loop-layout="e"] .humming-capture-transport__feedback {
  top: auto;
  bottom: calc(100% + 12px);
}
</style>
