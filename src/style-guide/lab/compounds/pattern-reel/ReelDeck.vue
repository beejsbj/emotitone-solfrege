<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Keyboard as KeyboardIcon } from "lucide-vue-next";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import PatternReel from "@/components/compounds/PatternReel.vue";
import type { PatternReelItem } from "@/components/compounds/PatternReel.vue";
import Drawer from "@/components/uniques/Drawer/index.vue";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";

/**
 * Guide-only frame: the real PatternReel on the real bottom Drawer, composed as
 * PerformanceDeck composes it (reel in `persistent-leading`, overflow visible,
 * centred handle with its lip, icon and row meter, the CodeStrip Bar below).
 * Only the stage above and the empty body stand in for the app.
 *
 * `hold` keeps the deck unfolded by relaying the reel's own wheel reveal: a
 * 1px wheel nudge (below one step, so nothing commits) every 600ms re-arms the
 * reel's 900ms open hold. It pauses while a pointer is down so the real drag
 * still works.
 */
const props = withDefaults(defineProps<{ items: PatternReelItem[]; initialId: string; hold?: boolean }>(), {
  hold: false,
});

const selectedId = ref(props.initialId);
const open = ref(false);
const guarded = ref(false);
const frame = ref<HTMLElement | null>(null);
const tokens: CodeStripToken[] = [
  { type: "note", note: "la", text: "La", duration: "@0.125", progress: 0 },
  { type: "note", note: "sol", text: "Sol", duration: "@0.125", progress: 0 },
  { type: "note", note: "fa", text: "Fa", duration: "@0.125", progress: 0 },
  { type: "note", note: "mi", text: "Mi", duration: "@0.25", progress: 0 },
];

function rename(id: string, name: string) {
  const item = props.items.find((candidate) => candidate.id === id);
  if (item) item.name = name;
}

let timer: ReturnType<typeof setInterval> | undefined;
let pausedUntil = 0;
function nudge() {
  if (performance.now() < pausedUntil) return;
  frame.value?.querySelector(".pattern-reel__viewport")
    ?.dispatchEvent(new WheelEvent("wheel", { deltaY: 1, bubbles: true, cancelable: true }));
}
function pause() { pausedUntil = Number.POSITIVE_INFINITY; }
function resume() { pausedUntil = performance.now() + 1500; }
onMounted(() => {
  if (!props.hold) return;
  nudge();
  timer = setInterval(nudge, 600);
  window.addEventListener("pointerup", resume);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  window.removeEventListener("pointerup", resume);
});
</script>

<template>
  <div ref="frame" class="reel-deck" :class="{ 'reel-deck--hold': hold }" @pointerdown="hold && pause()">
    <Drawer
      v-model="open"
      class="reel-deck__drawer"
      anchor="bottom"
      handle-align="center"
      persistent-overflow="visible"
      accessible-name="Performance deck"
      :initial-content-height="64"
      :drag-to-collapse="false"
      :scroll="false"
      :handle-pointer-disabled="guarded"
      :handle-meter="{ value: open ? 1 : 0, max: 8 }"
    >
      <template #icon><KeyboardIcon /></template>
      <template #persistent-leading>
        <PatternReel
          :items="items"
          :selected-id="selectedId"
          :cyclic="false"
          label="Phrase reel. The selected strip is what you play into."
          @commit="selectedId = $event"
          @rename="rename"
          @interaction-change="guarded = $event"
        />
      </template>
      <template #persistent>
        <div class="reel-deck__surface"><CodeStripBar :tokens="tokens" /></div>
      </template>
      <div class="reel-deck__body" />
    </Drawer>
  </div>
</template>

<style scoped>
.reel-deck {
  position: relative;
  width: 100%;
  height: 232px;
  overflow: hidden;
  background: var(--ink);
  isolation: isolate;
}

.reel-deck--hold { height: 268px; }

.reel-deck__drawer { background: transparent; }
.reel-deck__drawer :deep(.drawer__handle) { z-index: 2; }
.reel-deck__surface { background: var(--ink); }
.reel-deck__body { height: 100%; background: var(--ink); }

@media (forced-colors: active) {
  .reel-deck,
  .reel-deck__drawer { background: Canvas; }
}
</style>
