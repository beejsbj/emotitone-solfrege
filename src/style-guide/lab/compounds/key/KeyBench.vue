<script setup lang="ts">
import Keyboard from "@/components/compounds/Keyboard.vue";
import { KEYBOARD_GEOMETRY_FAMILIES } from "@/components/compounds/keyboardEdition";
import { defaultKeyboardHeight, fitKeyboardRows, KEYBOARD_CHORD_ROW_HEIGHT } from "@/components/compounds/keyboardSizing";
import type { LabBenchProps } from "@/types/compoundsLab";
import LabCell from "../LabCell.vue";
import { cMajorRows } from "./keyLabFixtures";
import "./key-skins.css";

/**
 * Real Keys on the real controlled Keyboard, at the deployed phone's
 * three-row allocation, pinned to today's `offcut` edition so every direction
 * is compared on identical cuts, tilts and layers. States are production
 * props (`pressed`, `sounding`) on the Keyboard's own rows. Loupes and the
 * editions strip hide the ChordKey row (a separate unit) to isolate Keys.
 */
const props = defineProps<LabBenchProps>();

const FAMILY = "offcut";
const SEED = "compounds-lab";
const ROWS = 3;
const height = defaultKeyboardHeight(ROWS);
const phoneRows = fitKeyboardRows(height - KEYBOARD_CHORD_ROW_HEIGHT, ROWS);

const resting = cMajorRows(ROWS);
const playing = cMajorRows(ROWS, { pressed: ["D4", "E4"], sounding: ["E4", "A4"] });

const loupes = [
  { id: "dark", label: "Dark pitches · Do La", rows: cMajorRows(1, {}, { only: ["Do", "La"] }) },
  { id: "light", label: "Light pitches · Sol Ti", rows: cMajorRows(1, {}, { only: ["Sol", "Ti"] }) },
  { id: "held", label: "Held · Mi beside Fa", rows: cMajorRows(1, { pressed: ["E4"], sounding: ["E4"] }, { only: ["Mi", "Fa"] }) },
];
const mainRow = cMajorRows(1);
</script>

<template>
  <div class="ulab-bench key-bench" :class="props.skin ? `key-skin--${props.skin}` : 'key-skin--production'">
    <LabCell
      v-if="!props.compact"
      caption="Resting · C major · chords + three melody rows · phone host (390px)"
      wide
    >
      <div class="key-bench__host" data-state="resting">
        <Keyboard usage="controlled" :rows="resting" :available-height="height" :geometry-family="FAMILY" :edition-seed="SEED" />
      </div>
    </LabCell>

    <LabCell caption="Playing · Re pressed · Mi held (pressed + sounding) · La sounding from the sequencer" wide>
      <div class="key-bench__host" data-state="playing">
        <Keyboard usage="controlled" :rows="playing" :available-height="height" :geometry-family="FAMILY" :edition-seed="SEED" />
      </div>
    </LabCell>

    <template v-if="!props.compact">
      <LabCell caption="Loupe ×1.75 · main-row Keys at their exact phone width (chord row hidden)" wide>
        <div class="key-bench__loupes">
          <figure v-for="loupe in loupes" :key="loupe.id" class="key-bench__loupe" :data-state="`loupe-${loupe.id}`">
            <div class="key-bench__loupe-host" :style="{ '--loupe-keys': loupe.rows[0].keys.length }">
              <Keyboard
                usage="controlled"
                :rows="loupe.rows"
                :main-row-height="phoneRows.main"
                :geometry-family="FAMILY"
                :edition-seed="SEED"
              />
            </div>
            <figcaption>{{ loupe.label }}</figcaption>
          </figure>
        </div>
      </LabCell>

      <LabCell caption="Editions · the main row in each daily geometry family; Misprint would join this draw as a print treatment (chord row hidden)" wide>
        <div class="key-bench__editions">
          <div v-for="family in KEYBOARD_GEOMETRY_FAMILIES" :key="family" class="key-bench__edition" :data-family="family">
            <span class="key-bench__edition-name">{{ family }}</span>
            <div class="key-bench__host">
              <Keyboard
                usage="controlled"
                :rows="mainRow"
                :main-row-height="phoneRows.main"
                :geometry-family="family"
                :edition-seed="SEED"
              />
            </div>
          </div>
        </div>
      </LabCell>
    </template>
  </div>
</template>

<style scoped>
.key-bench__host { width: min(100%, 390px); min-width: 0; }

.key-bench__loupes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-6) var(--s-8);
}

.key-bench__loupe { display: grid; gap: var(--s-3); justify-items: center; margin: 0; }

/* One phone main-row Key is (390 − 6 gaps × 2px) / 7 ≈ 54px wide. */
.key-bench__loupe-host {
  width: calc(var(--loupe-keys) * 54px + (var(--loupe-keys) - 1) * 2px);
  zoom: 1.75;
}

.key-bench__loupe figcaption,
.key-bench__edition-name {
  color: var(--ivory-3);
  font: var(--t-caption);
}

.key-bench__editions { display: grid; gap: var(--s-5); width: min(100%, 390px); }
.key-bench__edition { display: grid; gap: var(--s-2); }
.key-bench__edition .key-bench__host { width: 100%; }

.key-bench__loupe :deep(.keyboard__chord-row),
.key-bench__edition :deep(.keyboard__chord-row) { display: none; }
</style>
