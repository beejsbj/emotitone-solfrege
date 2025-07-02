<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui";

interface Props {
  activeTabId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  activeTabId: "palette",
});

const emit = defineEmits<{
  "update:activeTabId": [id: string];
}>();

// Local state for active tab
const currentTab = ref(props.activeTabId);

// Tab configuration
const tabs = [
  {
    id: "palette",
    label: "Palette",
    icon: "🎨",
    color: "hsla(280, 70%, 60%, 1)",
  },
  {
    id: "sequencer",
    label: "Sequencer",
    icon: "🎵",
    color: "hsla(200, 70%, 60%, 1)",
  },
];

// Handle tab change
const handleTabChange = (tabId: string) => {
  currentTab.value = tabId;
  emit("update:activeTabId", tabId);
};

// Expose current tab for parent components
defineExpose({
  currentTab: computed(() => currentTab.value),
});
</script>

<template>
  <div class="sticky bottom-0 left-0 right-0 z-50">
    <Tabs
      :value="currentTab"
      @update:value="handleTabChange"
      tabs-position="bottom"
    >
      <!-- Tab Navigation -->
      <div class="p-1">
        <TabsList class="w-full h-auto bg-transparent p-0 gap-1">
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.id"
            :value="tab.id"
            class="flex-1 flex-col py-1 px-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white hover:text-white text-gray-400 bg-transparent border-0 rounded-lg min-h-0"
          >
            <span
              class="text-sm"
              :style="{ color: currentTab === tab.id ? tab.color : undefined }"
            >
              {{ tab.icon }}
            </span>
            <span class="text-center leading-none text-xs">{{
              tab.label
            }}</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <!-- Tab Content Area -->
      <div class="max-h-[70vh] overflow-y-auto bg-gray-800/50 backdrop-blur-sm">
        <TabsContent value="palette" class="mt-0">
          <slot name="palette" />
        </TabsContent>

        <TabsContent value="sequencer" class="mt-0">
          <slot name="sequencer" />
        </TabsContent>
      </div>
    </Tabs>
  </div>
</template>

<style scoped>
/* Smooth scrolling for content area */
.overflow-y-auto {
  scroll-behavior: smooth;
}

/* Hide scrollbar but keep functionality */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: hsla(0, 0%, 50%, 0.3);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: hsla(0, 0%, 50%, 0.5);
}
</style>
