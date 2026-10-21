<template>
  <div
    v-if="sharedPhraseNotice"
    class="shared-phrase-notice"
    role="status"
    data-testid="shared-phrase-notice"
    :style="clearance ? { '--shared-notice-clearance': `${clearance}px` } : undefined"
    @pointerdown="dismissSharedPhraseNotice"
  >
    <Sticker variant="fill" color="ivory" paper="cut">{{ sharedPhraseNotice }}</Sticker>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Sticker from "@/components/primatives/Sticker";
import { topNoticeClearance } from "@/composables/useTopNoticeClearance";
import {
  dismissSharedPhraseNotice,
  sharedPhraseNotice,
} from "@/composables/useSharedPhraseLink";

const clearance = computed(() => topNoticeClearance.value);
</script>

<style scoped>
.shared-phrase-notice {
  position: fixed;
  /* Where the save warning sits: below the humming key and its feedback. */
  top: max(
    calc(env(safe-area-inset-top, 0px) + var(--s-5) + var(--hit-min)),
    var(--shared-notice-clearance, 0px)
  );
  left: 56px;
  right: 56px;
  z-index: 90;
  display: flex;
  justify-content: center;
  padding: 6px;
}
</style>
