<script setup lang="ts">
import type { LabBenchProps } from "@/types/compoundsLab";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import CodeStripBarFixture from "@/style-guide/compounds/CodeStripBarFixture.vue";
import LabCell from "../LabCell.vue";

/**
 * Left alone: the real CodeStrip Bar through the guide's own fixture, which
 * gives it an isolated UIBeat clock, so Play/Stop sits in its live ring.
 */
defineProps<LabBenchProps>();

const tokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", duration: "@0.125", progress: 1 },
  { type: "note", note: "mi", text: "Mi", duration: "@0.125", progress: 0.72 },
  { type: "rest", duration: "@0.0625", progress: 0.4 },
  { type: "note", note: "sol", text: "Sol", duration: "@0.25", progress: 0 },
];
</script>

<template>
  <div class="ulab-bench code-strip-bar-skin--production">
    <LabCell caption="Playing · Stop in its live beat ring · 4/4 · 120 BPM" wide>
      <div class="code-strip-bar-bench__rail">
        <CodeStripBarFixture :tokens="tokens" playing />
      </div>
    </LabCell>
  </div>
</template>

<style scoped>
.code-strip-bar-bench__rail {
  inline-size: min(100%, 760px);
}
</style>
