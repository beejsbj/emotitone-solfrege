<script setup lang="ts">
import type { LabBenchProps } from "@/types/compoundsLab";
import LabCell from "../LabCell.vue";
import BeatStage from "./BeatStage.vue";
import "./beat-indicator-skins.css";

/**
 * The real Play/Stop Button in the real CodeStrip Bar, each state on its own
 * isolated guide UIBeat clock: playing in 4/4 and 3/4, stopped (indicator
 * hidden), and the still downbeat that Reduced Motion and Visuals off both
 * hold. Two 48px close-ups show the shape at a size the eye can judge.
 * `skin` hides the production ring and mounts that direction's guide face.
 */
withDefaults(defineProps<LabBenchProps>(), { skin: null, compact: false });
</script>

<template>
  <div class="ulab-bench" :class="skin ? `beat-indicator-skin--${skin}` : 'beat-indicator-skin--production'">
    <template v-if="compact">
      <BeatStage :skin="skin" :beats="4" mode="playing" />
    </template>
    <template v-else>
      <LabCell caption="Playing · 4/4 · 120 BPM · in the bar" wide>
        <BeatStage :skin="skin" :beats="4" mode="playing" />
      </LabCell>
      <LabCell :caption="skin ? 'Playing · 3/4 · in the bar' : 'Playing · 3/4 · in the bar (the bar passes no meter, so the ring keeps four)'" wide>
        <BeatStage :skin="skin" :beats="3" mode="playing" />
      </LabCell>
      <LabCell caption="Stopped · indicator hidden · Play" wide>
        <BeatStage :skin="skin" :beats="4" mode="idle" />
      </LabCell>
      <LabCell caption="Still downbeat · Reduced Motion / Visuals off" wide>
        <BeatStage :skin="skin" :beats="4" mode="still" />
      </LabCell>
      <LabCell caption="Close-up · 48px key · 4/4 playing">
        <BeatStage :skin="skin" :beats="4" mode="playing" layout="key" />
      </LabCell>
      <LabCell caption="Close-up · 48px key · 3/4 playing">
        <BeatStage :skin="skin" :beats="3" mode="playing" layout="key" />
      </LabCell>
    </template>
  </div>
</template>
