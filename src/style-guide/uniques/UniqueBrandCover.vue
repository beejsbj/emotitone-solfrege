<template>
  <section class="preview-port preview-port--unique-brand-cover">
    <div class="card">
      <div class="label">BRAND COVER · UNIQUE</div>
      <BrandCover />

      <div class="section-head">Anatomy</div>
      <div class="anatomy">
        <div v-for="feature in features" :key="feature.label" class="row">
          <b>{{ feature.label }}</b>
          <span>{{ feature.value }}</span>
        </div>
      </div>

      <div class="caption">
        Singular cover artifact. The specimen imports the source unique and keeps only inspection
        labels; fixed copy, stamp, meta row, and collage composition belong to BrandCover.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BrandCover from "../../components/uniques/BrandCover.vue";

const features = [
  { label: "Role", value: "one-off design-system cover, not a generic hero" },
  { label: "Parts", value: "kicker, headline, body copy, collage, stamp, meta grid" },
  { label: "Palette", value: "brass, tomato, plum, bone, ink, ivory" },
  { label: "Type", value: "display headline, mono kicker/meta, body copy" },
  { label: "Artwork", value: "fixed cut-paper SVG collage" },
  { label: "Rule", value: "preserve as singular brand artifact" },
] as const;
</script>

<style scoped>
.preview-port {
  display: block;
}

.section-head {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin: 24px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
}

.anatomy {
  display: grid;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-3);
}

.row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid var(--ink-5);
}

.row:last-child {
  border-bottom: 0;
}

.row b {
  color: var(--ivory);
}

.caption {
  margin-top: 16px;
}
</style>
