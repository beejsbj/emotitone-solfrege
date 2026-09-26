<script setup lang="ts">
import BrandLogo from "../../components/uniques/BrandLogo.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Role", value: "singular EmotiTone identity artifact" },
  { label: "Structure", value: "five circles → four beats → two paste-up scraps" },
  { label: "Silhouette", value: "the OG five-circle cluster: big Plum behind, Cobalt left, Mustard right, Tomato and Pine low" },
  { label: "Monogram", value: "Ink E on a Mustard scrap · Ivory T on a Tomato scrap · Ink cut-edges" },
  { label: "Contrast", value: "each scrap sits on a colour other than its own paper" },
  { label: "Small sizes", value: "beats drop out below 72px; cluster + ET carry the favicon" },
  { label: "Lockups", value: "stacked · compact · mark-only · EMOTI + Tomato TONE tab" },
  { label: "Source", value: "geometry in brandMark.ts, shared with the exported app icons" },
];
</script>

<template>
  <AnatomyDisplay
    title="Brand Logo · Count-In Cluster"
    :features="features"
    caption="The Count-In paste-up ET pasted onto the brand's original five-circle cluster. Static by design: motion belongs to the Loading Screen."
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
        <VariantCell caption="Mark · 48 · 32 · 16 · the favicon silhouette">
          <div class="brand-logo-specimen brand-logo-specimen--small">
            <BrandLogo layout="mark" :size="48" />
            <BrandLogo layout="mark" :size="32" />
            <BrandLogo layout="mark" :size="16" />
          </div>
        </VariantCell>
      </VariantGrid>
    </div>
  </AnatomyDisplay>
</template>

<style scoped>
.brand-logo-specimen {
  display: grid;
  width: 100%;
  min-width: 0;
  padding-block: clamp(20px, 5vw, 40px) var(--s-4);
  place-items: center;
}

.brand-logo-specimen--small {
  display: flex;
  align-items: end;
  justify-content: center;
  gap: var(--s-6);
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
