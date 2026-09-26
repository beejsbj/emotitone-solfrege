<script setup lang="ts">
const steps = [
  { token: "--s-1", value: "2px", hint: "Hairline gap" },
  { token: "--s-2", value: "4px", hint: "Icon nudge" },
  { token: "--s-3", value: "6px", hint: "Tight inline gap" },
  { token: "--s-4", value: "8px", hint: "Chip padding" },
  { token: "--s-5", value: "12px", hint: "Row gap" },
  { token: "--s-6", value: "16px", hint: "Panel inset" },
  { token: "--s-7", value: "20px", hint: "Section gap" },
  { token: "--s-8", value: "24px", hint: "Card padding" },
  { token: "--s-9", value: "32px", hint: "Block spacing" },
  { token: "--s-10", value: "48px", hint: "Large margin" },
  { token: "--s-11", value: "64px", hint: "Page gutter" },
];
</script>

<template>
  <section class="preview-port preview-port--token-spacing-scale">
    <div class="card">
      <div class="label">Spacing</div>
      <p class="caption lede">Eleven-step scale from 2 to 64px, measured against a 4px tape.</p>

      <ol class="tape">
        <li v-for="(step, i) in steps" :key="step.token" class="step">
          <span class="step__num">{{ i + 1 }}</span>
          <span class="step__id">
            <code>{{ step.token }}</code>
            <span class="step__hint">{{ step.hint }}</span>
          </span>
          <span class="step__rule">
            <span class="step__bar" :style="{ width: `var(${step.token})` }"></span>
          </span>
          <span class="step__val">{{ step.value }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

.lede {
  max-width: 64ch;
  margin: var(--s-5) 0 0;
}

/* A tape measure on the Ink: each step laid against 4px ticks with a
   major tick every 16px. Ticks are the thing measured, so they stay. */
.tape {
  list-style: none;
  margin: var(--s-8) 0 0;
  padding: var(--s-7) var(--s-6);
  background: var(--ink);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: var(--s-5) var(--s-9);
}

.step {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 72px 40px;
  align-items: center;
  gap: var(--s-4);
  min-height: 40px;
}

.step__num {
  font: 700 22px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  color: var(--guide-paper-text, var(--bone));
  text-align: right;
}

.step__id {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.step__id code {
  font: var(--t-body-s-mono);
  color: var(--ivory);
  white-space: nowrap;
}

.step__hint {
  font: var(--t-caption);
  color: var(--ivory-3);
}

.step__rule {
  position: relative;
  height: 22px;
  background:
    repeating-linear-gradient(90deg, var(--ivory-3) 0 1px, transparent 1px 16px) 0 100% / 100% 10px no-repeat,
    repeating-linear-gradient(90deg, var(--ink-5) 0 1px, transparent 1px 4px) 0 100% / 100% 5px no-repeat;
}

.step__bar {
  position: absolute;
  left: 0;
  top: 2px;
  height: 12px;
  min-width: 2px;
  background: var(--guide-paper, var(--bone));
  transform-origin: left center;
  transition: transform var(--dur-ui) var(--ease-stab);
}

.step:hover .step__bar {
  transform: scaleY(1.4);
}

.step__val {
  font: var(--t-body-s-mono);
  color: var(--ivory-2);
  text-align: right;
}

@media (prefers-reduced-motion: reduce) {
  .step__bar { transition: none; }
  .step:hover .step__bar { transform: none; }
}
</style>
