<script setup lang="ts">
import LoadingScreen from "../../components/compositions/LoadingScreen.vue";
import Sticker from "../../components/primatives/Sticker";
import type { StickerPaperColor } from "../../components/primatives/Sticker";
import type { MarkName } from "../../components/primatives/marks";

const parts: { label: string; color: StickerPaperColor; mark: MarkName }[] = [
  { label: "Living Brand Logo", color: "plum", mark: "star" },
  { label: "Floating Marks", color: "ink-5", mark: "wave" },
  { label: "Stamped stages", color: "ivory", mark: "staccato" },
  { label: "Equalizer meter", color: "pine", mark: "eighth" },
  { label: "12 solfège lanes", color: "tomato", mark: "sharp" },
  { label: "Brass Play gate", color: "mustard", mark: "triangle" },
];
</script>

<template>
  <section class="loading-specimen">
    <p class="loading-specimen__role">The startup composition · every stage set</p>

    <div class="loading-specimen__well">
      <LoadingScreen
        mode="specimen"
        :progress="100"
        :is-complete="true"
        phase="Ready to play"
        message="Everything is tuned. Your first note is waiting."
        :stages="[
          { label: 'Visual stage', complete: true, active: false },
          { label: 'Instrument samples', complete: true, active: false },
          { label: 'Audio system', complete: true, active: false },
          { label: 'Ready to play', complete: true, active: false },
          { label: 'MIDI input', complete: true, active: false, icon: 'midi' },
        ]"
      />
    </div>

    <h3 class="label loading-specimen__heading">Composed from</h3>
    <ul class="loading-specimen__parts">
      <li v-for="part in parts" :key="part.label">
        <Sticker variant="fill" :color="part.color" :mark="part.mark">{{ part.label }}</Sticker>
      </li>
    </ul>

    <p class="loading-specimen__caption">
      Shown complete, with the Play gate open. Production <code>LoadingSplash.vue</code> owns
      initialization and feeds its live progress and stages into this source composition.
    </p>
  </section>
</template>

<style scoped>
.loading-specimen {
  display: grid;
  gap: var(--s-6);
  min-width: 0;
}

.loading-specimen__role {
  margin: 0;
  font: 700 clamp(20px, 3vw, 26px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--guide-paper-text, var(--ivory-2));
}

.loading-specimen__well {
  min-width: 0;
  background: var(--ink);
  overflow: hidden;
}

.loading-specimen__well :deep(.loading-screen) {
  height: clamp(640px, 62vw, 760px);
}

.loading-specimen__heading {
  margin: var(--s-4) 0 0;
}

.loading-specimen__parts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-4) var(--s-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.loading-specimen__caption {
  max-width: 72ch;
  margin: 0;
  font: var(--t-body-mono);
  color: var(--ivory-2);
}

.loading-specimen__caption code {
  color: var(--guide-paper-text, var(--ivory));
}
</style>
