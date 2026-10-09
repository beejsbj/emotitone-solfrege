<template>
  <CodeStripBar :tokens="tokens" :is-playing="playing" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import { useUIBeatFixture } from "../guide/useUIBeatFixture";

const props = defineProps<{
  tokens: CodeStripToken[];
  playing?: boolean;
}>();

useUIBeatFixture({
  bpm: ref(120),
  meter: ref({ beatsPerBar: 4, beatUnit: 4 }),
  autoplay: props.playing ?? false,
});
</script>
