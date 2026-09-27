<script setup lang="ts">
import { ref, type Component } from "vue";
import { CornerDownLeft, Delete, Play, Plus, Square, Undo2 } from "lucide-vue-next";
import LabCell from "../LabCell.vue";

/** Every Button state production owns, mounted through one component seam. */
defineProps<{ component: Component }>();
const taps = ref(0);
const playing = ref(false);
</script>

<template>
  <div class="plab-bench">
    <LabCell caption="Ink · Ivory · Brass — the three materials">
      <component :is="component" tone="ink" accessible-name="Add" @click="taps++"><Plus /></component>
      <component :is="component" tone="ivory" accessible-name="Undo" @click="taps++"><Undo2 /></component>
      <component :is="component" tone="brass" accessible-name="Send" @click="taps++"><CornerDownLeft /></component>
    </LabCell>
    <LabCell caption="SM · MD · LG — 32 / 40 / 48px hit boxes">
      <component :is="component" size="sm" accessible-name="Play small"><Play /></component>
      <component :is="component" size="md" accessible-name="Play"><Play /></component>
      <component :is="component" size="lg" accessible-name="Play large"><Play /></component>
    </LabCell>
    <LabCell caption="Loading · Disabled · Loading Brass">
      <component :is="component" tone="ink" loading accessible-name="Loading"><Play /></component>
      <component :is="component" tone="ivory" disabled accessible-name="Unavailable"><Undo2 /></component>
      <component :is="component" tone="brass" loading accessible-name="Sending"><CornerDownLeft /></component>
    </LabCell>
    <LabCell :caption="`In the CodeStrip Bar at 32px · tapped ${taps}×`">
      <span class="plab-bar">
        <component
          :is="component"
          size="sm"
          :tone="playing ? 'ink' : 'ivory'"
          :accessible-name="playing ? 'Stop' : 'Play'"
          @click="playing = !playing; taps++"
        >
          <Square v-if="playing" /><Play v-else />
        </component>
        <span class="plab-bar__code">n("0 2 4 7")</span>
        <component :is="component" size="sm" tone="ink" accessible-name="Backspace" @click="taps++"><Delete /></component>
        <component :is="component" size="sm" tone="ivory" accessible-name="Return" @click="taps++"><CornerDownLeft /></component>
      </span>
    </LabCell>
  </div>
</template>

<style scoped>
.plab-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(100%, 320px);
  padding: 8px 12px;
  background: var(--instrument-bar-surface);
  box-shadow: 0 0 0 1px var(--ink-4);
}

.plab-bar__code {
  flex: 1;
  margin-inline: 2px;
  color: var(--ivory-2);
  font: var(--t-mono);
}
</style>
