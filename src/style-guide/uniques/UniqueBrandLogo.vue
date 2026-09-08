<template>
  <AnatomyDisplay
    title="Brand Logo · Centered Cluster"
    :features="features"
    caption="The approved EmotiTone identity is one singular source: five smooth brand-colour circles behind a six-cut Ink/Ivory ET, with nine real Marks scattered across and around it."
  >
    <template #hero>
      <div class="brand-logo-specimen brand-logo-specimen--ink">
        <BrandLogo size="min(280px, 72vw)" />
      </div>
    </template>

    <VariantGrid title="Responsive lockups">
      <VariantCell caption="Canonical stacked lockup · Ink">
        <div class="brand-logo-specimen brand-logo-specimen--ink">
          <BrandLogo size="220px" />
        </div>
      </VariantCell>
      <VariantCell caption="Canonical stacked lockup · Bone">
        <div class="brand-logo-specimen brand-logo-specimen--bone">
          <BrandLogo surface="bone" size="220px" />
        </div>
      </VariantCell>
      <VariantCell caption="Compact horizontal lockup">
        <div class="brand-logo-specimen brand-logo-specimen--ink">
          <BrandLogo layout="compact" size="64px" />
        </div>
      </VariantCell>
      <VariantCell caption="Mark only">
        <div class="brand-logo-specimen brand-logo-specimen--bone">
          <BrandLogo layout="mark" surface="bone" size="128px" />
        </div>
      </VariantCell>
    </VariantGrid>
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
.brand-logo-specimen {
  display: grid;
  min-height: 220px;
  padding: clamp(20px, 4vw, 48px);
  overflow: hidden;
  place-items: center;
}

.brand-logo-specimen--ink { background: var(--ink); }
.brand-logo-specimen--bone { background: var(--bone); }
</style>
