<template>
  <section class="anatomy-display">
    <div class="card anatomy-display__card">
      <div class="label">{{ title }}</div>

      <div class="anatomy-display__section-head">Anatomy</div>
      <div class="anatomy-display__wrap">
        <div class="anatomy-display__hero-stage">
          <slot name="hero" />
        </div>
        <div class="anatomy-display__list">
          <div
            v-for="feature in features"
            :key="feature.label"
            class="anatomy-display__row"
          >
            <b>{{ feature.label }}</b>
            <span>{{ feature.value }}</span>
          </div>
        </div>
      </div>

      <slot />

      <div v-if="caption || $slots.caption" class="caption anatomy-display__caption">
        <slot name="caption">{{ caption }}</slot>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
export interface AnatomyFeature {
  label: string;
  value: string;
}

defineProps<{
  title: string;
  features: AnatomyFeature[];
  caption?: string;
}>();
</script>

<style scoped>
.anatomy-display {
  display: block;
}

.anatomy-display__section-head {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin: 24px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
}

.anatomy-display__section-head:first-child {
  margin-top: 6px;
}

.anatomy-display__wrap {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-top: 8px;
}

.anatomy-display__hero-stage {
  background: var(--ink);
  border: 1px solid var(--hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 130px;
}

.anatomy-display__list {
  display: grid;
  align-content: start;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ivory-3);
}

.anatomy-display__row {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--ink-5);
}

.anatomy-display__row:last-child {
  border-bottom: 0;
}

.anatomy-display__row b {
  color: var(--ivory);
  font-weight: 700;
}

.anatomy-display__caption {
  margin-top: 16px;
}
</style>
