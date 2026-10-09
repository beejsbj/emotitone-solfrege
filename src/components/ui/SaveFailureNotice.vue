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
      <Sticker variant="fill" color="tomato" paper="cut">{{ saveFailureNotice.message }}</Sticker>
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
  left: 0;
  right: 0;
  z-index: 200;
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
