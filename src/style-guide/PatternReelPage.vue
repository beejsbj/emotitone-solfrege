<template>
  <main class="pattern-reel-page">
    <header>
      <span>Focused real specimen</span>
      <h1>PatternReel</h1>
      <p>The approved Wheel Deck and PatternStrip sources used by production.</p>
    </header>
    <CompoundPatternReel />
  </main>
</template>

<script setup lang="ts">
import CompoundPatternReel from "./compounds/CompoundPatternReel.vue";
</script>

<style scoped>
.pattern-reel-page {
  min-height: 100vh;
  padding: clamp(16px, 4vw, 48px);
  background: var(--ink);
  color: var(--ivory);
}

.pattern-reel-page > header,
.pattern-reel-page > :deep(*) {
  width: min(720px, 100%);
  margin-inline: auto;
}

.pattern-reel-page > header {
  margin-bottom: var(--s-7);
}

.pattern-reel-page span {
  color: var(--brass);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.pattern-reel-page h1 {
  margin: var(--s-3) 0;
  font: var(--t-display-l);
  letter-spacing: var(--tracking-display);
  line-height: .9;
  text-transform: uppercase;
}

.pattern-reel-page p {
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}
</style>
