<template>
  <AnatomyDisplay
    title="Brand Logo · Centered Cluster"
    :features="features"
    caption="One singular identity source: five smooth brand-colour circles behind a six-cut Ink/Ivory ET, with nine real Marks scattered across and around it."
  >
    <template #hero>
      <div class="brand-logo-specimen">
        <BrandLogo size="min(280px, 64vw)" />
      </div>
    </template>

    <div class="brand-logo-lockups">
      <VariantGrid title="Responsive lockups">
        <VariantCell caption="Stacked · Ink · the canonical lockup">
          <div class="brand-logo-specimen">
            <BrandLogo size="min(220px, 58vw)" />
          </div>
        </VariantCell>
        <VariantCell caption="Stacked · Bone · wordmark turns Ink" stage="bone">
          <div class="brand-logo-specimen">
            <BrandLogo surface="bone" size="min(220px, 58vw)" />
          </div>
        </VariantCell>
        <VariantCell caption="Compact · horizontal · 64px mark">
          <div class="brand-logo-specimen">
            <BrandLogo layout="compact" size="clamp(40px, 12vw, 64px)" />
          </div>
        </VariantCell>
        <VariantCell caption="Mark only · Bone" stage="bone">
          <div class="brand-logo-specimen">
            <BrandLogo layout="mark" surface="bone" size="128px" />
          </div>
        </VariantCell>
      </VariantGrid>
    </div>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import BrandLogo from "../../components/uniques/BrandLogo.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Role", value: "singular EmotiTone identity artifact" },
  { label: "Structure", value: "five circles → six ET paper cuts → nine Marks" },
  { label: "Monogram", value: "E = four Ink cuts · T = two Ivory cuts" },
  { label: "Scatter", value: "accepted Mark primitives on an expanded 180 × 160 field" },
  { label: "Lockups", value: "stacked · compact · mark-only" },
  { label: "Boundary", value: "circles and placement stay local to BrandLogo" },
];
</script>

<style scoped>
/* The circles bleed past the mark box by design; leave them room, never clip. */
.brand-logo-specimen {
  display: grid;
  width: 100%;
  min-width: 0;
  padding-block: clamp(20px, 5vw, 40px) var(--s-4);
  place-items: center;
}

/* Lockups are wide artifacts: give each one a full-width well on a phone. */
.brand-logo-lockups :deep(.variant-grid__items) {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
}

.brand-logo-lockups :deep(.variant-cell__stage) {
  min-height: 200px;
  overflow: hidden;
}
</style>
