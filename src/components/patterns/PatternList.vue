<script setup lang="ts">
import { computed, ref } from "vue";
import { usePatternsStore } from "@/stores/patterns";
import PatternCard from "./PatternCard.vue";

const patternsStore = usePatternsStore();

const completedPatterns = computed(() => patternsStore.patterns);
const isOpen = ref(false);

// How many ghost cards to show behind the front card (max 2)
const ghostCount = computed(() =>
  Math.min(completedPatterns.value.length - 1, 2)
);

// List sorted newest-first
const listPatterns = computed(() => [...completedPatterns.value].reverse());

function selectPattern(id: string) {
  patternsStore.setFocusedPattern(id);
  isOpen.value = false;
}

function openDeck() {
  if (completedPatterns.value.length > 1) isOpen.value = true;
}
</script>

<template>
  <div class="deck">
    <!-- ── Empty state ── -->
    <p v-if="!completedPatterns.length" class="empty-hint">
      play some notes, then press send ↵
    </p>

    <!-- ── Collapsed: card stack ── -->
    <Transition name="stack">
      <div
        v-if="!isOpen && completedPatterns.length"
        class="stack"
        :class="{ 'stack--multi': completedPatterns.length > 1 }"
        @click="openDeck"
      >
        <!-- Ghost cards peeking below the front card -->
        <div v-if="ghostCount >= 2" class="ghost ghost--2" />
        <div v-if="ghostCount >= 1" class="ghost ghost--1" />

        <!-- Front focused card -->
        <div class="front-card" @click.stop>
          <PatternCard
            v-if="patternsStore.focusedPattern"
            :pattern="patternsStore.focusedPattern"
          />
        </div>

        <!-- Count chip floating in the ghost peek zone -->
        <button
          v-if="completedPatterns.length > 1"
          class="deck-count"
          @click.stop="isOpen = true"
          :aria-label="`Show all ${completedPatterns.length} patterns`"
        >
          {{ completedPatterns.length }} ≡
        </button>
      </div>
    </Transition>

    <!-- ── Expanded: pattern list drawer ── -->
    <Transition name="drawer">
      <div v-if="isOpen" class="drawer">
        <!-- Header -->
        <div class="drawer-head">
          <span class="drawer-label">{{ completedPatterns.length }} patterns</span>
          <button class="drawer-close" @click="isOpen = false" aria-label="Close">✕</button>
        </div>

        <!-- Scrollable rows — each row is a PatternCard -->
        <div class="drawer-body">
          <div
            v-for="pattern in listPatterns"
            :key="pattern.id"
            class="drawer-row"
            @click="selectPattern(pattern.id)"
          >
            <PatternCard :pattern="pattern" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ─── Deck shell ─── */
.deck {
  padding: 0.375rem;
}

/* ─── Stack (collapsed) ─── */
.stack {
  position: relative;
  padding-bottom: 10px;
}

.stack--multi {
  cursor: pointer;
}

/* Ghost cards — peeking below the front card */
.ghost {
  position: absolute;
  border-radius: 4px;
  height: 2.75rem;
  pointer-events: none;
}

.ghost--1 {
  bottom: 5px;
  left: 4px;
  right: 4px;
  background: hsla(0, 0%, 8%, 1);
  border: 1px solid hsla(0, 0%, 100%, 0.05);
  z-index: 1;
}

.ghost--2 {
  bottom: 0;
  left: 8px;
  right: 8px;
  background: hsla(0, 0%, 7%, 1);
  border: 1px solid hsla(0, 0%, 100%, 0.03);
  z-index: 0;
}

/* Front card sits above the ghosts */
.front-card {
  position: relative;
  z-index: 2;
}

/* Count chip in the ghost zone, bottom-right */
.deck-count {
  position: absolute;
  bottom: 2px;
  right: 6px;
  z-index: 3;
  height: 0.95rem;
  padding: 0 0.32rem;
  background: hsla(0, 0%, 13%, 1);
  border: 1px solid hsla(0, 0%, 100%, 0.1);
  border-radius: 3px;
  color: hsla(0, 0%, 100%, 0.3);
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.deck-count:active {
  color: hsla(0, 0%, 100%, 0.7);
  background: hsla(0, 0%, 18%, 1);
}

/* ─── Drawer (expanded) ─── */
.drawer {
  background: hsla(0, 0%, 8%, 1);
  border: 1px solid hsla(0, 0%, 100%, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.28rem 0.45rem 0.28rem 0.55rem;
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.06);
  background: hsla(0, 0%, 10%, 1);
}

.drawer-label {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: hsla(0, 0%, 100%, 0.25);
}

.drawer-close {
  width: 1.15rem;
  height: 1.15rem;
  border: none;
  background: hsla(0, 0%, 100%, 0.06);
  border-radius: 2px;
  color: hsla(0, 0%, 100%, 0.28);
  font-size: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background 0.12s ease, color 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.drawer-close:active {
  background: hsla(0, 0%, 100%, 0.12);
  color: hsla(0, 0%, 100%, 0.65);
}

.drawer-body {
  overflow-y: auto;
  max-height: 38vh;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.drawer-body::-webkit-scrollbar {
  display: none;
}

/* ─── Drawer rows ─── */
.drawer-row {
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.04);
}

.drawer-row:last-child {
  border-bottom: none;
}

/* ─── Empty hint ─── */
.empty-hint {
  font-size: 0.58rem;
  color: hsla(0, 0%, 100%, 0.18);
  font-style: italic;
  text-align: center;
  padding: 0.75rem 0.5rem;
  letter-spacing: 0.03em;
}

/* ─── Stack ↔ Drawer transitions ─── */
.stack-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.stack-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.stack-enter-to,
.stack-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.stack-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.18s ease;
}

.stack-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.99);
}

.drawer-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.99);
}

.drawer-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.23s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.drawer-enter-to,
.drawer-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.drawer-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.18s ease;
}

.drawer-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.99);
}
</style>
