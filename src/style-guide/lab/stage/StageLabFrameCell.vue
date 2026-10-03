<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

/*
 * One frame in the comparison strip. The iframe gives each direction a real
 * viewport, so production's fixed, window-sized Stage runs unmodified. It
 * mounts only near the viewport, because every frame owns a canvas loop and
 * an audio graph. Guide scaffold only.
 */
const props = defineProps<{
  caption: string;
  letter: string;
  params: Record<string, string>;
  wide: boolean;
  /** Called when the frame loads, so it can join the page's current state. */
  join: (frame: HTMLIFrameElement) => void;
}>();

const root = ref<HTMLElement | null>(null);
const frame = ref<HTMLIFrameElement | null>(null);
const near = ref(false);
let observer: IntersectionObserver | null = null;

const src = computed(() => `/style-guide/lab/stage/frame?${new URLSearchParams(props.params)}`);

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { near.value = entry.isIntersecting; }, { rootMargin: "400px" });
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

const onLoad = () => { if (frame.value) props.join(frame.value); };
</script>

<template>
  <figure ref="root" class="stage-lab-cell" :class="{ 'stage-lab-cell--wide': wide }">
    <div class="stage-lab-cell__screen">
      <iframe
        v-if="near"
        ref="frame"
        :src="src"
        :title="`${caption} Stage frame`"
        allow="autoplay"
        data-stage-lab-frame
        @load="onLoad"
      />
    </div>
    <figcaption class="stage-lab-cell__caption">
      <span class="stage-lab-cell__letter">{{ letter }}</span>
      <span>{{ caption }}</span>
      <a :href="src" target="_blank" rel="noopener">Full screen</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.stage-lab-cell {
  display: grid;
  gap: var(--s-3);
  min-width: 0;
  margin: 0;
  scroll-snap-align: start;
}

.stage-lab-cell__screen {
  aspect-ratio: 390 / 844;
  overflow: hidden;
  background: var(--ink);
}

.stage-lab-cell--wide .stage-lab-cell__screen { aspect-ratio: 16 / 10; }

.stage-lab-cell iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.stage-lab-cell__caption {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  color: var(--ivory-3);
  font: var(--t-caption);
}

.stage-lab-cell__letter {
  color: var(--ivory);
  font: 700 16px/1 var(--font-display);
}

.stage-lab-cell__caption a {
  margin-left: auto;
  color: var(--ivory-2);
}
</style>
