<script setup lang="ts">
import LoadingScreen from "../../components/compositions/LoadingScreen.vue";
import Sticker from "../../components/primatives/Sticker";
import type { StickerPaperColor } from "../../components/primatives/Sticker";
import type { MarkName } from "../../components/primatives/marks";

const parts: { label: string; color: StickerPaperColor; mark: MarkName }[] = [
  { label: "Count-In Cluster logo", color: "plum", mark: "star" },
  { label: "Four beat tiles", color: "tomato", mark: "staccato" },
  { label: "MIDI “and” · optional", color: "ink-5", mark: "wave" },
  { label: "Status + percent", color: "ivory", mark: "eighth" },
  { label: "Brass Play gate", color: "mustard", mark: "triangle" },
  { label: "Cue + retry gates", color: "pine", mark: "sharp" },
];
</script>

<template>
  <section class="loading-specimen">
    <p class="loading-specimen__role">Count-In · the startup composition</p>

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
          { label: 'MIDI input', complete: true, active: false, icon: 'midi', optional: true, stamp: 'SET', detail: 'MIDI ready. Connect a controller anytime.' },
        ]"
      />
    </div>

    <h3 class="label loading-specimen__heading">Recovery states · production only</h3>
    <div class="loading-specimen__states">
      <figure>
        <div class="loading-specimen__well loading-specimen__well--phone">
          <LoadingScreen
            mode="specimen"
            :progress="43"
            :is-complete="false"
            still
            has-error
            can-play-basic-synths
            error-message="Instrument samples timed out after 30 seconds."
          />
        </div>
        <figcaption>Error · the count holds on a STOP stamp; Tomato “From the top” emits retry. When samples failed, a quieter Ink paper action plays on with basic synths.</figcaption>
      </figure>
      <figure>
        <div class="loading-specimen__well loading-specimen__well--phone">
          <LoadingScreen mode="specimen" :progress="72" :is-complete="false" still needs-audio-interaction />
        </div>
        <figcaption>Enable audio · the browser blocked sound; an Ivory cue gate emits enable-audio.</figcaption>
      </figure>
    </div>

    <h3 class="label loading-specimen__heading">Composed from</h3>
    <ul class="loading-specimen__parts">
      <li v-for="part in parts" :key="part.label">
        <Sticker variant="fill" :color="part.color" :mark="part.mark">{{ part.label }}</Sticker>
      </li>
    </ul>

    <p class="loading-specimen__caption">
      The load is the band counting in: four required stages are four beats, pasted up as poster tiles
      when they land; MIDI is the optional “and” and never holds the gate. Brass appears only on the Play
      gate; recovery gates are paper. Reduced Motion renders the composed still frame. Production
      <code>LoadingSplash.vue</code> owns initialization and feeds its live progress and stages into this
      source composition.
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

.loading-specimen__states {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: var(--s-6);
}

.loading-specimen__states figure { display: grid; gap: var(--s-3); margin: 0; min-width: 0; }
.loading-specimen__states figcaption { font: var(--t-caption); color: var(--ivory-2); }

.loading-specimen__well--phone { width: min(100%, 390px); justify-self: center; }
.loading-specimen__well--phone :deep(.loading-screen) { height: auto; aspect-ratio: 390 / 844; }

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
