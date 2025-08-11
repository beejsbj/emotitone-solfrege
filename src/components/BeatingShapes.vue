<template>
  <div v-if="config.isEnabled" class="beating-shapes" :style="rootStyle">
    <div
      v-for="i in config.count"
      :key="i"
      class="shape-set"
      :style="getSetStyle(i)"
    >
      <div v-if="config.commonBeat" class="dancer shape square common-beat" />
      <div v-if="config.quarterBeat" class="dancer shape line quarter-beat" />
      <div v-if="config.thirdBeat" class="dancer shape triangle third-beat" />
      <div v-if="config.halfBeat" class="dancer shape rectangle half-beat" />
      <div v-if="config.doubleBeat" class="dancer shape circle double-beat" />
      <div v-if="config.tripleBeat" class="dancer shape hexagon triple-beat" />
      <div
        v-if="config.quadrupleBeat"
        class="dancer shape octagon quadruple-beat"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { useVisualConfigStore } from "@/stores/visualConfig";

const sequencerStore = useSequencerStore();
const visualConfigStore = useVisualConfigStore();

const config = computed(() => visualConfigStore.config.beatingShapes);
const tempo = computed(() => sequencerStore.config.tempo);

const rootStyle = computed(() => ({
  "--bpm": tempo.value,
  "--base-scale": config.value.scale,
}));

function getSetStyle(i: number) {
  const offset = (i - 1) * 5;
  return {
    transform: `translate(${offset}%, ${offset}%)`,
  };
}
</script>

<style scoped>
.beating-shapes {
  position: fixed;
  inset: 0;
  z-index: -10;
  overflow: hidden;
  pointer-events: none;
  --bpm: 120;
  --common-time-beat: calc(60s / var(--bpm));
  --quarter-time-beat: calc(var(--common-time-beat) * 4);
  --third-time-beat: calc(var(--common-time-beat) * 3);
  --half-time-beat: calc(var(--common-time-beat) * 2);
  --double-time-beat: calc(var(--common-time-beat) / 2);
  --triple-time-beat: calc(var(--common-time-beat) / 3);
  --quadruple-time-beat: calc(var(--common-time-beat) / 4);
  --hue: 80;
  --color: hsla(var(--hue), 100%, 60%, 1);
  --highlight: hsla(calc(var(--hue) + 180), 100%, 60%, 1);
  --accent: hsla(calc(var(--hue) - 60), 100%, 60%, 1);
  animation: 0s calc(var(--common-time-beat) * 4) shiftColors infinite forwards;
}

.dancer {
  animation: var(--beat-time) var(--action, beat) infinite forwards;
}

.shape-set {
  position: absolute;
  inset: 0;
}

.shape {
  background: black;
  position: absolute;
  scale: var(--base-scale, 1);
}

.rotate {
  --action: rotate;
}

.line {
  width: 50vmax;
  height: 1px;
  rotate: 40deg;
  top: 20%;
  --action: rotate;
}

.rectangle {
  width: 50vw;
  height: 50px;
  rotate: -100deg;
  bottom: 50%;
  right: 1%;
  --action: rotate;
}

.triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  width: 10vw;
  top: -5%;
  left: 50%;
  aspect-ratio: 1;
  rotate: 20deg;
  --action: rotate;
}

.square {
  bottom: -10%;
  left: -5%;
  rotate: 45deg;
  width: 70vmin;
  aspect-ratio: 1;
}

.hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  bottom: -10%;
  right: -5%;
  width: 30vmax;
  aspect-ratio: 1;
  --action: rotate;
}

.octagon {
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  top: 10%;
  left: 5%;
  width: 5vmax;
  aspect-ratio: 1;
}

.circle {
  border-radius: 50%;
  right: -5%;
  top: -5%;
  width: 20vmax;
  aspect-ratio: 1;
}

.common-beat {
  --beat-time: var(--common-time-beat);
}

.quarter-beat {
  --beat-time: var(--quarter-time-beat);
}

.third-beat {
  --beat-time: var(--third-time-beat);
}


.half-beat {
  --beat-time: var(--half-time-beat);
}

.double-beat {
  --beat-time: var(--double-time-beat);
}

.triple-beat {
  --beat-time: var(--triple-time-beat);
}

.quadruple-beat {
  --beat-time: var(--quadruple-time-beat);
}

@keyframes beat {
  0% {
    scale: 0.8;
  }
  14% {
    scale: 1.1;
    box-shadow: -5px -5px var(--color), -10px -10px var(--accent);
  }
  96% {
    scale: 1;
  }
  100% {
    scale: 0.8;
  }
}

@keyframes rotate {
  0% {
    transform: rotate(-5deg);
  }
  14% {
    transform: rotate(3deg);
    box-shadow: -5px -5px var(--color), -10px -10px var(--highlight);
  }
  96% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(10deg);
  }
}

@keyframes shiftColors {
  100% {
    --hue: calc(var(--hue) + 36);
  }
}
</style>
