<script setup lang="ts">
import DrawerShell from "../../components/primatives/DrawerShell.vue";

const stageRows = ["60%", "90%", "75%"];
const topStageRows = ["100%", "75%", "55%", "85%"];
const bottomStageRows = ["100%", "80%", "65%", "90%"];
const heroContentRows = ["80%", "55%", "70%"];
const topContentRows = ["80%", "60%", "70%"];
const bottomContentRows = ["75%", "50%", "65%"];
</script>

<template>
  <section class="preview-port preview-port--unique-drawer">
    <div class="card">
      <div class="label">DRAWER · SLIDING PANEL</div>

      <div class="section-head">Anatomy</div>
      <div class="anatomy-wrap">
        <DrawerShell
          class="drawer-hero"
          default-open
          frame-height="260px"
          handle-label="Tap · ESC"
          aria-label="toggle hero drawer"
        >
          <template #stage>
            <div class="app-stub app-stub--hero">
              <div
                v-for="width in stageRows"
                :key="width"
                class="app-stub__row app-stub__row--hero"
                :style="{ width }"
              />
            </div>
          </template>

          <div
            v-for="width in heroContentRows"
            :key="width"
            class="content-stub content-stub--hero"
            :style="{ width }"
          />
        </DrawerShell>

        <div class="anatomy">
          <div class="row"><b>Panel</b><div>ink-3 bg &middot; slides over stage &middot; z-index 3</div></div>
          <div class="row"><b>Handle</b><div>28px bar &middot; torn SVG edge &middot; 2&times; grip bars</div></div>
          <div class="row"><b>Anchor</b><div>top-edge or bottom-edge &middot; full container width</div></div>
          <div class="row"><b>Slide</b><div>translateY(&minus;100%&rarr;0) &middot; ease-swing &middot; dur-panel</div></div>
          <div class="row"><b>Scrim</b><div>opacity 0&rarr;1 &middot; ease-brush &middot; var(--scrim) overlay</div></div>
          <div class="row"><b>Resize</b><div>optional drag handle &middot; closed / designed (72%) / full snap points</div></div>
        </div>
      </div>

      <div class="section-head">Anchors</div>
      <div class="variants-full">
        <div class="variant-column">
          <DrawerShell
            class="drawer-variant"
            default-open
            resizable
            show-snap-badge
            frame-height="200px"
            aria-label="toggle top drawer"
          >
            <template #stage>
              <span class="var-pin">Top &middot; Open</span>
              <div class="app-stub app-stub--variant">
                <div
                  v-for="width in topStageRows"
                  :key="width"
                  class="app-stub__row app-stub__row--variant"
                  :style="{ width }"
                />
              </div>
            </template>

            <div
              v-for="width in topContentRows"
              :key="width"
              class="content-stub content-stub--variant"
              :style="{ width }"
            />
          </DrawerShell>
          <div class="var-caption">Top anchor &middot; drag handle to resize &middot; tap scrim to close</div>
        </div>

        <div class="variant-column">
          <DrawerShell
            class="drawer-variant"
            default-open
            resizable
            show-snap-badge
            anchor="bottom"
            frame-height="200px"
            aria-label="toggle bottom drawer"
          >
            <template #stage>
              <span class="var-pin">Bottom &middot; Open</span>
              <div class="app-stub app-stub--variant">
                <div
                  v-for="width in bottomStageRows"
                  :key="width"
                  class="app-stub__row app-stub__row--variant"
                  :style="{ width }"
                />
              </div>
            </template>

            <div
              v-for="width in bottomContentRows"
              :key="width"
              class="content-stub content-stub--variant"
              :style="{ width }"
            />
          </DrawerShell>
          <div class="var-caption">Bottom anchor &middot; drag handle to resize &middot; tap scrim to close</div>
        </div>
      </div>

      <div class="caption">
        DrawerShell is the promoted source primitive for bounded drawer behavior. App `TopDrawer.vue` remains a separate integration gate because it owns Teleport, fixed positioning, and production slots.
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

.section-head {
  margin: 24px 0 10px;
  border-bottom: 1px solid var(--ink-5);
  color: var(--ivory-4);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.22em;
  padding-bottom: 6px;
  text-transform: uppercase;
}

.section-head:first-child {
  margin-top: 6px;
}

.anatomy-wrap {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-top: 8px;
}

.anatomy {
  display: grid;
  align-content: start;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.anatomy .row {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 10px;
  border-bottom: 1px solid var(--ink-5);
  padding: 6px 0;
}

.anatomy .row:last-child {
  border-bottom: 0;
}

.anatomy .row b {
  color: var(--ivory);
  font-weight: 700;
}

.variants-full {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.variant-column {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-stub {
  position: absolute;
  inset: 0;
}

.app-stub--hero {
  padding: 14px;
}

.app-stub--variant {
  padding: 22px 10px 10px;
}

.app-stub__row {
  border: 1px solid var(--ink-5);
  background: var(--ink-3);
}

.app-stub__row--hero {
  height: 28px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.app-stub__row--variant {
  height: 12px;
  margin-bottom: 6px;
  opacity: 0.45;
}

.content-stub {
  border: 1px solid var(--ink-5);
  background: var(--ink-4);
}

.content-stub--hero {
  height: 20px;
  margin-bottom: 10px;
  opacity: 0.6;
}

.content-stub--variant {
  height: 8px;
  margin-bottom: 6px;
  opacity: 0.65;
}

.var-pin {
  position: absolute;
  top: 6px;
  left: 8px;
  z-index: 10;
  color: var(--ivory-4);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.2em;
  pointer-events: none;
  text-transform: uppercase;
}

.var-caption {
  color: var(--ivory-4);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  padding-top: 3px;
  text-align: center;
  text-transform: uppercase;
}
</style>
