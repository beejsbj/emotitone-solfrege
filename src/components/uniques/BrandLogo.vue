<template>
  <div :class="logoClasses">
    <template v-if="variant === 'monogram'">
      <div v-if="showLabel" class="brand-logo__label">Monogram</div>
      <div class="brand-logo__glyph">ET</div>
      <div class="brand-logo__sub">initial mark · tight pair</div>
    </template>

    <template v-else-if="variant === 'tagline'">
      <div v-if="showLabel" class="brand-logo__label">Logo + Tagline</div>
      <div class="brand-logo__tagline-text">
        <div class="brand-logo__tagline-headline">JAZZ IS<br />FEELING<br />MADE VISIBLE.</div>
        <div class="brand-logo__sub">play · learn · emote · repeat</div>
      </div>
      <div v-if="imageSrc" class="brand-logo__image">
        <img :src="imageSrc" alt="" />
      </div>
    </template>

    <template v-else>
      <div v-if="showLabel" class="brand-logo__label">{{ label }}</div>
      <div class="brand-logo__wordmark">EMOTITONE</div>
      <div class="brand-logo__sub">{{ subline }}</div>
      <div v-if="variant === 'notes'" class="brand-logo__notes" aria-label="note mark row">
        <span v-for="note in notes" :key="note.symbol" :class="note.className">
          {{ note.symbol }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type BrandLogoVariant =
  | "wordmark"
  | "monogram"
  | "tagline"
  | "brass"
  | "inverted"
  | "notes";

const props = withDefaults(
  defineProps<{
    variant?: BrandLogoVariant;
    showLabel?: boolean;
    imageSrc?: string;
  }>(),
  {
    variant: "wordmark",
    showLabel: false,
    imageSrc: undefined,
  },
);

const labels: Record<BrandLogoVariant, string> = {
  wordmark: "Wordmark only",
  monogram: "Monogram",
  tagline: "Logo + Tagline",
  brass: "Brass signal",
  inverted: "Inverted",
  notes: "With note marks",
};

const sublines: Record<BrandLogoVariant, string> = {
  wordmark: "solfege learning · melody sketchpad",
  monogram: "initial mark · tight pair",
  tagline: "play · learn · emote · repeat",
  brass: "one lit accent · loading · hero moment",
  inverted: "sticker · print · bone surface",
  notes: "solfege learning · melody sketchpad",
};

const notes = [
  { symbol: "♩", className: "brand-logo__note brand-logo__note--do" },
  { symbol: "♪", className: "brand-logo__note brand-logo__note--mi" },
  { symbol: "♫", className: "brand-logo__note brand-logo__note--sol" },
  { symbol: "♬", className: "brand-logo__note brand-logo__note--la" },
  { symbol: "♭", className: "brand-logo__note brand-logo__note--ti" },
] as const;

const logoClasses = computed(() => [
  "brand-logo",
  `brand-logo--${props.variant}`,
  props.showLabel ? "brand-logo--labeled" : null,
]);

const label = computed(() => labels[props.variant]);
const subline = computed(() => sublines[props.variant]);
</script>

<style scoped>
.brand-logo {
  background: var(--ink-2);
  border: 1px solid var(--ink-5);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 18px 14px;
  position: relative;
}

.brand-logo--wordmark:not(.brand-logo--labeled) {
  align-items: flex-start;
  justify-content: center;
  padding: 28px 24px;
  min-height: 140px;
}

.brand-logo__label {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin-bottom: 4px;
}

.brand-logo__wordmark {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--ivory);
}

.brand-logo--wordmark:not(.brand-logo--labeled) .brand-logo__wordmark {
  font-size: 52px;
}

.brand-logo__sub {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ivory-3);
}

.brand-logo--wordmark:not(.brand-logo--labeled) .brand-logo__sub {
  font-size: 9px;
  margin-top: 8px;
}

.brand-logo--monogram {
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

.brand-logo--monogram .brand-logo__label {
  position: absolute;
  top: 8px;
  left: 18px;
}

.brand-logo__glyph {
  font-family: var(--font-display);
  font-size: 68px;
  font-weight: 400;
  text-transform: uppercase;
  line-height: 1;
  color: var(--ivory);
}

.brand-logo--tagline {
  flex-direction: row;
  gap: 18px;
  align-items: center;
}

.brand-logo--tagline .brand-logo__label {
  position: absolute;
  top: 8px;
  left: 18px;
}

.brand-logo__tagline-text {
  flex: 1;
  padding-top: 14px;
}

.brand-logo__tagline-headline {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  line-height: 0.95;
  color: var(--ivory);
}

.brand-logo__image {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.brand-logo__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-logo--brass .brand-logo__wordmark {
  background: var(--brass-fill);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-logo--inverted {
  background: var(--bone);
  border-color: transparent;
}

.brand-logo--inverted .brand-logo__wordmark {
  color: var(--ink);
}

.brand-logo--inverted .brand-logo__sub {
  color: var(--ink-5);
}

.brand-logo--inverted .brand-logo__label {
  color: var(--ink-4);
}

.brand-logo__notes {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.brand-logo__note {
  font: var(--t-h3);
}

.brand-logo__note--do {
  color: var(--note-do);
}

.brand-logo__note--mi {
  color: var(--note-mi);
}

.brand-logo__note--sol {
  color: var(--note-sol);
}

.brand-logo__note--la {
  color: var(--note-la);
}

.brand-logo__note--ti {
  color: var(--note-ti);
}
</style>
