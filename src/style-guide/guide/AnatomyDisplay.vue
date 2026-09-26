<template>
  <section class="anatomy-display" :class="`anatomy-display--${density}`">
    <p class="anatomy-display__role">{{ role }}</p>

    <div class="anatomy-display__wrap">
      <div class="anatomy-display__hero-stage">
        <slot name="hero" />
      </div>

      <dl class="anatomy-display__list">
        <div
          v-for="feature in leadFeatures"
          :key="feature.label"
          class="anatomy-display__row"
        >
          <dt>{{ feature.label }}</dt>
          <dd>{{ feature.value }}</dd>
        </div>
      </dl>
    </div>

    <details v-if="restFeatures.length" class="anatomy-display__more">
      <summary>Full anatomy · {{ restFeatures.length }} more</summary>
      <dl class="anatomy-display__list anatomy-display__list--more">
        <div
          v-for="feature in restFeatures"
          :key="feature.label"
          class="anatomy-display__row"
        >
          <dt>{{ feature.label }}</dt>
          <dd>{{ feature.value }}</dd>
        </div>
      </dl>
    </details>

    <div v-if="caption || $slots.caption" class="anatomy-display__caption">
      <slot name="caption">{{ caption }}</slot>
    </div>

    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useGuideUnitDensity } from "../shell/guideContext";

export interface AnatomyFeature {
  label: string;
  value: string;
}

const props = defineProps<{
  title: string;
  features: AnatomyFeature[];
  caption?: string;
}>();

const SHORT_FEATURE_COUNT = 4;

const density = useGuideUnitDensity();

// The unit header already names the piece; the frame keeps only its role.
const role = computed(() => {
  const [, ...rest] = props.title.split(/\s+·\s+/);
  return rest.length ? rest.join(" · ") : props.title;
});

const leadFeatures = computed(() =>
  density === "short" ? props.features.slice(0, SHORT_FEATURE_COUNT) : props.features,
);
const restFeatures = computed(() =>
  density === "short" ? props.features.slice(SHORT_FEATURE_COUNT) : [],
);
</script>

<style scoped>
.anatomy-display {
  display: block;
  min-width: 0;
}

.anatomy-display__role {
  margin: 0 0 var(--s-6);
  font: 700 clamp(20px, 3vw, 26px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--guide-paper-text, var(--ivory-2));
}

.anatomy-display__wrap {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: var(--s-8);
  align-items: start;
}

.anatomy-display__hero-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: var(--s-8);
  background: var(--ink);
  overflow: hidden;
}

.anatomy-display__list {
  display: grid;
  gap: var(--s-4);
  margin: 0;
}

.anatomy-display__row {
  display: grid;
  gap: var(--s-1);
}

.anatomy-display__row dt {
  font: 700 15px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

.anatomy-display__row dd {
  margin: 0;
  font: var(--t-body-s-mono);
  color: var(--ivory-2);
}

.anatomy-display--detailed .anatomy-display__list {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  gap: var(--s-6) var(--s-7);
}

.anatomy-display--detailed .anatomy-display__wrap {
  grid-template-columns: minmax(0, 1fr);
}

.anatomy-display--detailed .anatomy-display__hero-stage {
  min-height: 300px;
}

.anatomy-display__more {
  margin-top: var(--s-6);
}

.anatomy-display__more summary {
  width: max-content;
  cursor: pointer;
  color: var(--guide-paper-text, var(--ivory-2));
  font: var(--t-mono);
}

.anatomy-display__list--more {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  margin-top: var(--s-5);
}

.anatomy-display__caption {
  max-width: 72ch;
  margin-top: var(--s-7);
  font: var(--t-body-mono);
  color: var(--ivory-2);
}

@media (max-width: 760px) {
  .anatomy-display__wrap { grid-template-columns: minmax(0, 1fr); gap: var(--s-6); }
  .anatomy-display__hero-stage { min-height: 180px; padding: var(--s-6) var(--s-4); }
}
</style>
