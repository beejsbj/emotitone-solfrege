<template>
  <main class="style-guide-sink-port">
    <header class="sink-header">
      <div class="label">Emotitone Design System Sink Port</div>
      <h1>Preview Components</h1>
      <p>One Vue component per source preview file. Token collections, primatives, uniques, compounds, then compositions.</p>
    </header>

    <section class="sink-section" aria-labelledby="tokens-heading">
      <h2 id="tokens-heading">Token Collections</h2>
      <div class="sink-stack">
        <article class="sink-frame">
          <div class="sink-frame__source">token-ui-colors.html</div>
          <TokenUiColors />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">token-brand-colors.html</div>
          <TokenBrandColors />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">token-music-colors.html</div>
          <TokenMusicColors />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">token-spacing-radius.html</div>
          <TokenSpacingRadius />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">token-spacing-scale.html</div>
          <TokenSpacingScale />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">token-typography.html</div>
          <TokenTypography />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">token-motion.html</div>
          <TokenMotion />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">token-geometry.html</div>
          <TokenGeometry />
        </article>
      </div>
    </section>

    <section class="sink-section" aria-labelledby="primitives-heading">
      <h2 id="primitives-heading">Primitives</h2>
      <div class="sink-stack">
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-sticker</div>
          <PrimitiveSticker />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-bar-tape.html</div>
          <PrimitiveBarTape />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-beat-indicator.html</div>
          <PrimitiveBeatIndicator />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-buttons.html</div>
          <PrimitiveButtons />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-card.html</div>
          <PrimitiveCard />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-note.html</div>
          <PrimitiveNote />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-kicker.html</div>
          <PrimitiveKicker />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-knobs-analog.html</div>
          <PrimitiveKnobsAnalog />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-knobs-digital.html</div>
          <PrimitiveKnobsDigital />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-marks.html</div>
          <PrimitiveMarks />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-spine-card.html</div>
          <PrimitiveSpineCard />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">primitive-tabs.html</div>
          <PrimitiveTabs />
        </article>
      </div>
    </section>

    <section class="sink-section" aria-labelledby="uniques-heading">
      <h2 id="uniques-heading">Uniques</h2>
      <div class="sink-stack">
        <article class="sink-frame">
          <div class="sink-frame__source">unique-brand-cover.html</div>
          <UniqueBrandCover />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">unique-brand-logo.html</div>
          <UniqueBrandLogo />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">unique-code-strip.html</div>
          <UniqueCodeStrip />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">unique-drawer.html</div>
          <UniqueDrawer />
        </article>
      </div>
    </section>

    <section class="sink-section" aria-labelledby="compounds-heading">
      <h2 id="compounds-heading">Compounds</h2>
      <div class="sink-stack">
        <article class="sink-frame">
          <div class="sink-frame__source">compound-pattern-card.html</div>
          <CompoundPatternCard />
        </article>
        <article class="sink-frame">
          <div class="sink-frame__source">compound-pattern-reel.html</div>
          <CompoundPatternReel />
        </article>
      </div>
    </section>

    <section class="sink-section" aria-labelledby="compositions-heading">
      <h2 id="compositions-heading">Compositions</h2>
      <div class="sink-stack">
        <article class="sink-frame">
          <div class="sink-frame__source">composition-loading-screen.html</div>
          <CompositionLoadingScreen />
        </article>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import "./preview-card.css";
import TokenUiColors from "./tokens/TokenUiColors.vue";
import TokenBrandColors from "./tokens/TokenBrandColors.vue";
import TokenMusicColors from "./tokens/TokenMusicColors.vue";
import TokenSpacingRadius from "./tokens/TokenSpacingRadius.vue";
import TokenSpacingScale from "./tokens/TokenSpacingScale.vue";
import TokenTypography from "./tokens/TokenTypography.vue";
import TokenMotion from "./tokens/TokenMotion.vue";
import TokenGeometry from "./tokens/TokenGeometry.vue";
import PrimitiveSticker from "./primatives/PrimitiveSticker.vue";
import PrimitiveBarTape from "./primatives/PrimitiveBarTape.vue";
import PrimitiveBeatIndicator from "./primatives/PrimitiveBeatIndicator.vue";
import PrimitiveButtons from "./primatives/PrimitiveButtons.vue";
import PrimitiveCard from "./primatives/PrimitiveCard.vue";
import PrimitiveNote from "./primatives/PrimitiveNote.vue";
import PrimitiveKicker from "./primatives/PrimitiveKicker.vue";
import PrimitiveKnobsAnalog from "./primatives/PrimitiveKnobsAnalog.vue";
import PrimitiveKnobsDigital from "./primatives/PrimitiveKnobsDigital.vue";
import PrimitiveMarks from "./primatives/PrimitiveMarks.vue";
import PrimitiveSpineCard from "./primatives/PrimitiveSpineCard.vue";
import PrimitiveTabs from "./primatives/PrimitiveTabs.vue";
import CompoundPatternCard from "./compounds/CompoundPatternCard.vue";
import CompoundPatternReel from "./compounds/CompoundPatternReel.vue";
import CompositionLoadingScreen from "./compositions/CompositionLoadingScreen.vue";
import UniqueBrandCover from "./uniques/UniqueBrandCover.vue";
import UniqueBrandLogo from "./uniques/UniqueBrandLogo.vue";
import UniqueCodeStrip from "./uniques/UniqueCodeStrip.vue";
import UniqueDrawer from "./uniques/UniqueDrawer.vue";
</script>

<style scoped>
.style-guide-sink-port {
  min-height: 100vh;
  padding: 32px;
  background: var(--ink);
  color: var(--fg);
}

.sink-header,
.sink-section {
  width: min-content;
  max-width: calc(100vw - 64px);
}

.sink-header {
  margin-bottom: 28px;
}

.sink-header h1,
.sink-section h2 {
  margin: 0;
  color: var(--ivory);
  font: var(--t-display-l);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.sink-header p {
  margin: 8px 0 0;
  color: var(--ivory-3);
  font: var(--t-mono);
}

.sink-section {
  display: grid;
  gap: 16px;
  margin-top: 32px;
}

.sink-section h2 {
  font: var(--t-display-m);
}

.sink-stack {
  display: grid;
  gap: 22px;
}

.sink-frame {
  display: grid;
  gap: 8px;
}

.sink-frame__source {
  color: var(--ivory-4);
  font: var(--t-caption);
}

@media (max-width: 760px) {
  .style-guide-sink-port {
    padding: 16px;
    overflow-x: auto;
  }

  .sink-header,
  .sink-section {
    max-width: none;
  }
}
</style>
