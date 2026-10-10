<template>
  <div
    v-if="saveFailureNotice"
    class="save-failure-notice"
    role="alert"
    data-testid="save-failure-notice"
  >
    <button
      type="button"
      class="save-failure-notice__button"
      aria-label="Dismiss save warning"
      @click="dismissSaveFailure"
    >
      <Sticker variant="fill" color="ivory" paper="cut">{{ saveFailureNotice.message }}</Sticker>
    </button>
  </div>
</template>

<script setup lang="ts">
import Sticker from "@/components/primatives/Sticker";
import { dismissSaveFailure, saveFailureNotice } from "@/services/safeStorage";
</script>

<style scoped>
.save-failure-notice {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  /* Leave the corners to the top-menu handles, and sit under TopDrawer (100-102). */
  left: 56px;
  right: 56px;
  z-index: 90;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.save-failure-notice__button {
  pointer-events: auto;
  padding: 6px;
  background: none;
  border: 0;
  cursor: pointer;
}
</style>
