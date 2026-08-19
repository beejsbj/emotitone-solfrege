<template>
  <AnatomyDisplay
    title="Key &middot; Interactive Compound"
    :features="features"
    caption="Key adds momentary physical interaction around the complete Note face. Physical pressed and musical sounding are separate controlled states: either can appear alone, and neither changes the other."
  >
    <template #hero>
      <div class="key-specimen__live">
        <Key
          aria-label="Live Do key"
          syllable="Do"
          degree="I"
          raw-pitch="C4"
          @press="showEvent('press', $event)"
          @release="showEvent('release', $event)"
        />
        <p>Press with mouse or touch. Tab here to inspect the native focus outline.</p>
        <output aria-live="polite">{{ lastEvent }}</output>
      </div>
    </template>

    <VariantGrid title="Physical press and musical sounding">
      <VariantCell caption="Pressed only · Note at rest" stage="ink3">
        <Key
          aria-label="Controlled pressed key"
          syllable="Re"
          degree="II"
          raw-pitch="D4"
          :scale-index="2"
          pressed
        />
      </VariantCell>
      <VariantCell caption="Sounding only · face not pressed" stage="ink3">
        <Key
          aria-label="Sounding key"
          syllable="Mi"
          degree="III"
          raw-pitch="E4"
          :scale-index="4"
          sounding
        />
      </VariantCell>
      <VariantCell caption="Pressed + sounding · both states" stage="ink3">
        <Key
          aria-label="Pressed and sounding key"
          syllable="Sol"
          degree="V"
          raw-pitch="G4"
          :scale-index="7"
          pressed
          sounding
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Note prop forwarding">
      <VariantCell
        caption="Offcut × wide · raw primary · degree auxiliary"
        stage="ink3"
      >
        <Key
          aria-label="F sharp two, raised fourth"
          syllable="Fi"
          degree="#IV"
          raw-pitch="F#2"
          primary="raw"
          :visible-labels="['degree', 'raw']"
          geometry="offcut"
          proportion="wide"
          :scale-index="6"
          :pitch-class-index="6"
          :octave="2"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Key from "@/components/compounds/Key.vue";
import type { KeyInputEvent } from "@/components/compounds/Key.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const lastEvent = ref("No local input yet");

function showEvent(kind: "press" | "release", payload: KeyInputEvent) {
  lastEvent.value = `${kind} · ${payload.inputId} · ${payload.event.type}`;
}

const features = [
  { label: "Child", value: "one complete Note face; Note keeps all musical presentation" },
  { label: "Hitbox", value: "native button with a minimum 44 × 44px target" },
  { label: "Hover", value: "fine-pointer face lift only; no sticky coarse-touch hover" },
  { label: "Press", value: "2px down, 3% compression, neutral inset depth, 90ms release" },
  { label: "Focus", value: "static 2px neutral outline with a 2px gap" },
  { label: "State", value: "physical pressed is independent from Note sounding" },
  { label: "Events", value: "typed local press/release payloads for mouse and touch ids" },
  { label: "Boundary", value: "no store, audio, haptic, MIDI, QWERTY, routing, or lock state" },
];
</script>

<style scoped>
.key-specimen__live {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 18px;
  text-align: center;
}

.key-specimen__live p {
  max-width: 260px;
  margin: 0;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1.5;
}

.key-specimen__live output {
  min-width: 220px;
  padding: 6px 9px;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
  color: var(--ivory-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

@media (max-width: 620px) {
  :deep(.anatomy-display__card) {
    width: calc(100vw - 32px);
    padding: 18px 14px;
  }

  :deep(.anatomy-display__wrap) {
    grid-template-columns: 1fr;
  }

  :deep(.anatomy-display__row) {
    grid-template-columns: 70px minmax(0, 1fr);
  }

  :deep(.variant-grid__items) {
    grid-template-columns: 1fr;
  }

  .key-specimen__live output {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
}
</style>
