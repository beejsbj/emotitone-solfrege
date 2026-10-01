<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import { Play, Square } from "lucide-vue-next";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import Button from "@/components/primatives/Button.vue";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import { useUIBeatFixture } from "@/style-guide/guide/useUIBeatFixture";
import BeatStill from "./BeatStill.vue";
import StepChadsFace from "./StepChadsFace.vue";

/**
 * One isolated UIBeat clock and the real Play/Stop it drives: either the real
 * CodeStrip Bar (its own BeatIndicator around its own Button) or, for the
 * close-up, a real BeatIndicator around a real 48px Button. A direction's face
 * is teleported into the real indicator root and reads the same clock; the skin hides the
 * production ring from outside. Play/Stop stays live and toggles this clock.
 */
const props = withDefaults(
  defineProps<{
    skin?: string | null;
    beats?: 3 | 4;
    mode?: "playing" | "idle" | "still";
    layout?: "bar" | "key";
  }>(),
  { skin: null, beats: 4, mode: "playing", layout: "bar" },
);

const { running, toggle } = useUIBeatFixture({
  bpm: ref(120),
  meter: ref({ beatsPerBar: props.beats, beatUnit: 4 }),
  autoplay: props.mode !== "idle",
});

const tokens: CodeStripToken[] = props.beats === 3
  ? [
      { type: "note", note: "sol", text: "Sol", duration: "@0.333", progress: 1 },
      { type: "note", note: "mi", text: "Mi", duration: "@0.333", progress: 0.5 },
      { type: "note", note: "do", text: "Do", duration: "@0.333", progress: 0 },
    ]
  : [
      { type: "note", note: "do", text: "Do", duration: "@0.125", progress: 1 },
      { type: "note", note: "mi", text: "Mi", duration: "@0.125", progress: 0.72 },
      { type: "rest", duration: "@0.0625", progress: 0.4 },
      { type: "note", note: "sol", text: "Sol", duration: "@0.25", progress: 0 },
    ];

const placement = computed(() => ({ "chad-lip": "below", "chad-crown": "above" } as const)[props.skin ?? ""] ?? null);
const keySize = props.layout === "key" ? 48 : 32;

const root = ref<HTMLElement | null>(null);
const target = shallowRef<HTMLElement | null>(null);

onMounted(() => {
  const indicator = root.value?.querySelector<HTMLElement>(".beat-indicator") ?? null;
  target.value = indicator;
});
</script>

<template>
  <div ref="root" class="beatlab-stage" :class="`beatlab-stage--${layout}`" :style="{ '--beatlab-key': `${keySize}px` }">
    <component :is="mode === 'still' ? BeatStill : 'div'">
      <CodeStripBar
        v-if="layout === 'bar'"
        :tokens="tokens"
        :is-playing="running"
        :time-signature="`${beats}/4`"
        @toggle-playback="toggle"
      />
      <BeatIndicator v-else :beats="beats" aria-label="Beat indicator close-up">
        <Button
          size="lg"
          :tone="running ? 'ink' : 'ivory'"
          :accessible-name="running ? 'Stop close-up' : 'Play close-up'"
          @click="toggle"
        >
          <Square v-if="running" />
          <Play v-else />
        </Button>
      </BeatIndicator>
      <Teleport v-if="placement && target" :to="target">
        <StepChadsFace :beats="beats" :key-size="keySize" :placement="placement" />
      </Teleport>
    </component>
  </div>
</template>

<style scoped>
.beatlab-stage {
  min-inline-size: 0;
}

.beatlab-stage--bar {
  inline-size: min(100%, 560px);
}
</style>
