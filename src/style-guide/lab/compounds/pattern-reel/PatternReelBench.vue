<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import PatternStrip from "@/components/compounds/PatternStrip.vue";
import type { PatternStripItem } from "@/components/compounds/PatternStrip.vue";
import type { LabBenchProps } from "@/types/compoundsLab";
import LabCell from "../LabCell.vue";
import ReelDeck from "./ReelDeck.vue";
import { useReelFixtures } from "./reelFixtures";
import { attachSkinRelay } from "./skinRelay";
import "./pattern-reel-skins.css";

/**
 * The real PatternReel on the real bottom Drawer, as PerformanceDeck mounts it,
 * plus the real PatternStrip alone. States: the collapsed deck over the Drawer
 * lip, the same deck held unfolded through the reel's own reveal, one strip
 * selected, and a long library title on the desk. `skin` wraps the real source.
 */
const props = defineProps<LabBenchProps>();

const fixtures = useReelFixtures();
const restDeck = fixtures.deck();
const unfoldedDeck = fixtures.deck();
const selected = fixtures.selected();
const long = fixtures.long();

function rename(item: PatternStripItem, name: string) {
  item.name = name;
}

const root = ref<HTMLElement | null>(null);
let detach: (() => void) | undefined;
onMounted(() => {
  if (root.value) detach = attachSkinRelay(root.value, props.skin);
});
onBeforeUnmount(() => detach?.());
</script>

<template>
  <div
    ref="root"
    class="ulab-bench reel-bench"
    :class="skin ? `pattern-reel-skin--${skin}` : 'pattern-reel-skin--production'"
  >
    <LabCell caption="Collapsed deck · Current and three peeking predecessors on the Drawer lip" wide>
      <ReelDeck :items="restDeck" :initial-id="fixtures.frontId" />
    </LabCell>
    <template v-if="!compact">
      <LabCell caption="Unfolded · held open through the reel's own wheel reveal; tap, drag and rename stay live" wide>
        <ReelDeck :items="unfoldedDeck" :initial-id="fixtures.frontId" hold />
      </LabCell>
      <LabCell caption="One strip selected · on the desk, a key held (double-tap or F2 renames)" wide>
        <div class="reel-bench__strip">
          <PatternStrip :item="selected" active :selectable="false" @rename="rename(selected, $event)" />
        </div>
      </LabCell>
      <LabCell caption="Long title · a library phrase looked at in place" wide>
        <div class="reel-bench__strip">
          <PatternStrip :item="long" active :selectable="false" @rename="rename(long, $event)" />
        </div>
      </LabCell>
    </template>
  </div>
</template>

<style scoped>
.reel-bench :deep(.plab-cell__stage) { padding-inline: 0; }
.reel-bench__strip { width: 100%; }
</style>
