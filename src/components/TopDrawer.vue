<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import Drawer from "./uniques/Drawer/index.vue";
import { activeTopDrawer } from "./uniques/Drawer/topDrawerGroup";

const props = withDefaults(defineProps<{
  anchor?: "top-left" | "top-right";
  contentHeight?: number;
  handleLabel?: string;
  ariaLabel?: string;
  handleTestId?: string;
}>(), {
  anchor: "top-right",
  handleLabel: "",
  ariaLabel: "Settings",
});
const identity = Symbol("top-drawer");
const showPanel = ref(false);
const renderPanel = ref(false);
const openSession = ref(0);
const drawer = ref<InstanceType<typeof Drawer> | null>(null);
const isActive = computed(() => activeTopDrawer.value === identity);
watch(showPanel, open => {
  if (open) {
    openSession.value += 1;
    renderPanel.value = true;
    activeTopDrawer.value = identity;
  }
  else if (isActive.value) activeTopDrawer.value = null;
}, { flush: "sync" });
watch(activeTopDrawer, active => {
  if (active !== identity) showPanel.value = false;
}, { flush: "sync" });
const openPanel = () => { showPanel.value = true; };
const closePanel = () => { showPanel.value = false; };
const togglePanel = () => { showPanel.value = !showPanel.value; };
onBeforeUnmount(() => { if (isActive.value) activeTopDrawer.value = null; });
defineExpose({ showPanel, openSession, closePanel, openPanel, togglePanel });
</script>

<template>
  <Teleport to="body">
    <Drawer
      ref="drawer"
      v-model="showPanel"
      @closed="renderPanel = showPanel"
      class="top-drawer"
      :class="{ 'top-drawer--active': isActive, 'top-drawer--closing': !isActive && renderPanel }"
      fixed
      anchor="top"
      :handle-align="anchor === 'top-left' ? 'left' : 'right'"
      fit-content-on-open
      :natural-content-height="contentHeight"
      close-on-outside
      :handle-label="handleLabel"
      :accessible-name="ariaLabel"
      :handle-test-id="handleTestId"
      :initial-content-height="360"
      :scroll="false"
      haptic
      close-on-escape
    >
      <template v-if="$slots.icon" #icon><slot name="icon" /></template>
      <template #default="{ height }">
        <div v-if="renderPanel" data-testid="top-drawer-panel" class="top-drawer__panel">
          <slot name="panel" :height="height" :open="openPanel" :close="closePanel" :toggle="togglePanel" :is-open="showPanel" :anchor="anchor" />
        </div>
      </template>
    </Drawer>
  </Teleport>
</template>

<style scoped>
.top-drawer { z-index: 102; background: var(--ink); }
.top-drawer--active { z-index: 101; }
.top-drawer--closing { z-index: 100; }
.top-drawer__panel { height: 100%; min-height: 0; }
.top-drawer:deep(.drawer__handle) { background: var(--ink); }
.top-drawer:deep(.drawer__grip) { background: var(--ivory); opacity: .28; }
</style>
