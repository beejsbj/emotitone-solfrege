<script setup lang="ts">
import { computed, createApp, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch, type App } from "vue";
import { createPinia, disposePinia, type Pinia } from "pinia";
import UnifiedVisualEffects from "@/components/UnifiedVisualEffects.vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import {
  STAGE_LAB_DIRECTION_IDS,
  STAGE_LAB_UNIT_IDS,
  type StageLabMessage,
  type StageLabSelection,
  type StageLabState,
  type StageLabUnitId,
} from "@/types/stageLab";
import { createStageLabConductor, STAGE_LAB_STATES } from "./labConductor";
import StageLabSurface from "./StageLabSurface.vue";
import { applyLook, lookById } from "./labFamilies";

/*
 * One lab frame: a whole phone or desktop viewport inside an iframe. Each
 * Stage part reads its own query parameter (`scope=phosphor`, `bodies=facets`,
 * ...). With every part production it mounts the real `UnifiedVisualEffects`
 * exactly as the Stage specimen does; otherwise it mounts the lab surface. Either way the same conductor plays it, and
 * the parent page drives every frame with the same messages.
 */
const query = new URLSearchParams(window.location.search);
const pick = <T extends string>(name: string, options: readonly T[], fallback: T) => {
  const value = query.get(name) as T | null;
  return value && options.includes(value) ? value : fallback;
};
const selection = Object.fromEntries(STAGE_LAB_UNIT_IDS.map((unit) => [
  unit,
  pick<string>(unit, ["production", ...STAGE_LAB_DIRECTION_IDS[unit]], "production"),
])) as StageLabSelection;
const initialState = pick<StageLabState>("state", STAGE_LAB_STATES.map((s) => s.id), "phrase");
const mode = ref(pick<"merge" | "web">("mode", ["merge", "web"], "merge"));
const deck = query.get("deck") !== "0";
const hidden = ref((query.get("hide") ?? "").split(",").filter((unit): unit is StageLabUnitId =>
  (STAGE_LAB_UNIT_IDS as readonly string[]).includes(unit)));
const look = lookById(query.get("look")).id;
// Each part's smoothed paint cost, shown when the page turns timings on.
const timings = reactive(Object.fromEntries(STAGE_LAB_UNIT_IDS.map((unit) => [unit, 0])) as Record<StageLabUnitId, number>);
const showTimings = ref(query.get("timings") === "1");
const totalCost = computed(() => STAGE_LAB_UNIT_IDS.reduce((sum, unit) => sum + timings[unit], 0));
// Compose always takes the per-part surface, so any part can be muted or soloed.
const isProduction = query.get("surface") !== "parts"
  && STAGE_LAB_UNIT_IDS.every((unit) => selection[unit] === "production");

const conductor = createStageLabConductor(initialState);
const mountPoint = ref<HTMLElement | null>(null);
const audioRunning = ref(false);
let app: App<Element> | null = null;
let pinia: Pinia | null = null;
let audioPoll = 0;

const wake = async () => {
  try { await conductor.wake(); } catch { /* the overlay stays until a tap succeeds */ }
  audioRunning.value = conductor.isAudioRunning();
};

const onMessage = (event: MessageEvent<StageLabMessage>) => {
  if (event.origin !== window.location.origin) return;
  const message = event.data;
  if (message?.type === "stage-lab:state") conductor.setState(message.state);
  else if (message?.type === "stage-lab:key") conductor.key(message.pitch, message.down);
  else if (message?.type === "stage-lab:mode") mode.value = message.mode;
  else if (message?.type === "stage-lab:hidden") hidden.value = message.hidden;
  else if (message?.type === "stage-lab:timings") showTimings.value = message.on;
  else if (message?.type === "stage-lab:wake") void wake();
};

onMounted(() => {
  if (!mountPoint.value) return;
  pinia = createPinia();
  app = createApp(defineComponent({
    name: "StageLabFrameApp",
    setup() {
      if (!isProduction) {
        return () => h(StageLabSurface, { selection, mode: mode.value, hidden: hidden.value, look, timings, conductor });
      }
      const visualConfig = useVisualConfigStore();
      visualConfig.useEphemeralDefaults();
      applyLook(visualConfig.config as unknown as Record<string, Record<string, unknown>>, look);
      watch(mode, (value) => { visualConfig.config.blobs.connectionMode = value; }, { immediate: true });
      return () => h(UnifiedVisualEffects, {
        audioFeatures: conductor.audio,
        activeNotes: conductor.activeNotes.value,
        eventTarget: conductor.eventTarget,
      });
    },
  }));
  app.use(pinia);
  app.mount(mountPoint.value);
  window.addEventListener("message", onMessage);
  audioPoll = window.setInterval(() => { audioRunning.value = conductor.isAudioRunning(); }, 400);
  void wake();
});

onBeforeUnmount(() => {
  window.removeEventListener("message", onMessage);
  window.clearInterval(audioPoll);
  conductor.dispose();
  app?.unmount();
  app = null;
  if (pinia) disposePinia(pinia);
  pinia = null;
});
</script>

<template>
  <main class="stage-lab-frame">
    <div ref="mountPoint" />
    <div v-if="deck" class="stage-lab-frame__deck" data-stage-occlusion-host>
      <section data-stage-occluder aria-label="Deck stand-in">
        <span>PerformanceDeck stand-in</span>
      </section>
    </div>
    <dl v-if="showTimings && !isProduction" class="stage-lab-frame__timings" aria-label="Paint cost per part">
      <div v-for="unit in STAGE_LAB_UNIT_IDS" :key="unit">
        <dt>{{ unit }}</dt><dd>{{ timings[unit].toFixed(2) }}</dd>
      </div>
      <div class="stage-lab-frame__total"><dt>ms / frame</dt><dd>{{ totalCost.toFixed(2) }}</dd></div>
    </dl>
    <button v-if="!audioRunning" class="stage-lab-frame__wake" type="button" @click="wake">
      Tap to start the silent signal
    </button>
  </main>
</template>

<style scoped>
.stage-lab-frame {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--ink);
}

/* Specimen scaffold: an opaque deck slab where PerformanceDeck sits on a phone. */
.stage-lab-frame__deck {
  position: fixed;
  inset: auto 0 0;
  height: 38%;
  z-index: 2;
}

.stage-lab-frame__deck section {
  display: flex;
  align-items: flex-start;
  height: 100%;
  padding: var(--s-4);
  background: var(--ink-2);
  color: var(--ivory-4);
  font: var(--t-caption);
  text-transform: uppercase;
}

/* Specimen scaffold: measured paint cost, over the deck stand-in. */
.stage-lab-frame__timings {
  position: fixed;
  left: var(--s-4);
  bottom: var(--s-4);
  z-index: 3;
  display: grid;
  gap: 2px;
  margin: 0;
  padding: var(--s-3);
  background: var(--ink);
  color: var(--ivory-2);
  font: 500 11px/1.2 var(--font-mono);
}

.stage-lab-frame__timings div { display: flex; justify-content: space-between; gap: var(--s-4); }
.stage-lab-frame__timings dd { margin: 0; font-variant-numeric: tabular-nums; }
.stage-lab-frame__total { color: var(--ivory); }

.stage-lab-frame__wake {
  position: fixed;
  inset: var(--s-4) var(--s-4) auto auto;
  z-index: 3;
  padding: var(--s-3) var(--s-4);
  border: 0;
  background: var(--ivory);
  color: var(--ink);
  font: var(--t-caption);
  text-transform: uppercase;
  cursor: pointer;
}
</style>
