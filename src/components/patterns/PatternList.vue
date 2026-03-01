<script setup lang="ts">
import { computed, watch, nextTick, ref } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import PatternCard from "./PatternCard.vue";

const patternsStore = usePatternsStore();
const listRef = ref<HTMLElement | null>(null);

const completedPatterns = computed(() => patternsStore.patterns);

// Only one card expanded at a time — null means all collapsed
const expandedId = ref<string | null>(null);

function handleToggleExpand(patternId: string) {
  expandedId.value = expandedId.value === patternId ? null : patternId;
}

// Auto-scroll to bottom when a new pattern is added
watch(
  () => completedPatterns.value.length,
  async () => {
    await nextTick();
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
  }
);
</script>

<template>
  <div ref="listRef" class="pattern-list">
    <PatternCard
      v-for="pattern in completedPatterns"
      :key="pattern.id"
      :pattern="pattern"
      :is-expanded="pattern.id === expandedId"
      @toggle-expand="handleToggleExpand(pattern.id)"
    />

    <p v-if="completedPatterns.length === 0" class="empty-hint">
      play some notes, then press send ↵
    </p>
  </div>
</template>

<style scoped>
.pattern-list {
  max-height: 40vh;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.375rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.pattern-list::-webkit-scrollbar {
  display: none;
}

.empty-hint {
  font-size: 0.58rem;
  color: hsla(0, 0%, 100%, 0.18);
  font-style: italic;
  text-align: center;
  padding: 0.75rem 0.5rem;
  letter-spacing: 0.03em;
}
</style>
