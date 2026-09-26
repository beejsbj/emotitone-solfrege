<template>
  <main class="pattern-reel-page focused-page guide-paper--mustard">
    <FocusedPoster layer="compounds" unit-id="pattern-reel" kicker="Focused page · real specimen" title="Pattern Reel">
      <p>The approved Wheel Deck and PatternStrip sources, exactly as production uses them.</p>
    </FocusedPoster>

    <div class="focused-page__body">
      <section class="focused-sheet pattern-reel-page__sheet" aria-label="PatternReel specimen">
        <CompoundPatternReel />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import CompoundPatternReel from "./compounds/CompoundPatternReel.vue";
import FocusedPoster from "./focused/FocusedPoster.vue";
import "./focused/focused-page.css";
</script>

<style scoped>
.pattern-reel-page__sheet > :deep(*) {
  min-width: 0;
  max-width: 100%;
}
</style>
