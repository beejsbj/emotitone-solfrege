<script setup lang="ts">
import type { LabBenchProps } from "@/types/compoundsLab";
import LabCell from "../LabCell.vue";
import HeaderPanelSlice from "./HeaderPanelSlice.vue";
import "./overlay-header-skins.css";

/**
 * The real OverlayPanelHeader inside a slice of its real top-drawer panel:
 * Config Menu and the Instrument Picker, each fed what its consumer passes,
 * over the live Tabs rail. `skin` is applied around the real source.
 */
withDefaults(defineProps<LabBenchProps>(), { skin: null, compact: false });


</script>

<template>
  <div
    class="ulab-bench overlay-header-bench"
    :class="skin ? `overlay-header-skin--${skin}` : 'overlay-header-skin--production'"
  >
    <LabCell v-if="compact" caption="Config · Global over its Tabs rail" wide>
      <div class="overlay-header-bench__phone"><HeaderPanelSlice consumer="config" :body="false" /></div>
    </LabCell>

    <template v-else>
      <LabCell caption="Config Menu · Global · Visuals master, Reset, Export, Close (tabs are live)" wide>
        <div class="overlay-header-bench__phone"><HeaderPanelSlice consumer="config" /></div>
      </LabCell>
      <LabCell caption="Instrument Picker · Synths bank · sound count as status" wide>
        <div class="overlay-header-bench__phone"><HeaderPanelSlice consumer="sounds" initial-tab="synths" /></div>
      </LabCell>
      <LabCell caption="Instrument Picker · Shape · Reset shaping joins the rail, no status" wide>
        <div class="overlay-header-bench__phone"><HeaderPanelSlice consumer="sounds" initial-tab="shape" instrument="piano" /></div>
      </LabCell>
      <LabCell caption="Truncation · 320px host · MIDI shortcut crowds the rail; long sound name" wide>
        <div class="overlay-header-bench__narrow">
          <HeaderPanelSlice consumer="config" initial-tab="bodies" show-midi :body="false" />
          <HeaderPanelSlice consumer="sounds" initial-tab="shape" instrument="acoustic_grand_piano" :body="false" />
        </div>
      </LabCell>
      <LabCell caption="Wide host · the top drawer at tablet and desktop widths" wide>
        <div class="overlay-header-bench__wide"><HeaderPanelSlice consumer="config" initial-tab="stage" /></div>
      </LabCell>
    </template>
  </div>
</template>

<style scoped>
.overlay-header-bench { display: grid; gap: var(--s-5); }
.overlay-header-bench :deep(.plab-cell__stage) { padding-inline: 0; }
.overlay-header-bench__phone { inline-size: min(100%, 390px); }
.overlay-header-bench__narrow { display: grid; gap: var(--s-6); inline-size: min(100%, 320px); }
.overlay-header-bench__wide { inline-size: 100%; }
</style>
