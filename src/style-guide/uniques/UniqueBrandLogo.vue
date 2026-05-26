<template>
  <AnatomyDisplay
    title="Brand Logo · Unique Identity System"
    :features="features"
    caption="BrandLogo is a singular identity artifact, not a generic logo primitive. The source component owns the wordmark, monogram, tagline, brass, inverted, and note-mark lockups; the specimen only arranges and explains them."
  >
    <template #hero>
      <BrandLogo />
    </template>

    <VariantGrid title="Variants">
      <VariantCell
        v-for="variant in variants"
        :key="variant.value"
        :caption="variant.caption"
      >
        <BrandLogo
          :variant="variant.value"
          :image-src="variant.value === 'tagline' ? jazzCollage : undefined"
          show-label
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import type { BrandLogoVariant } from "../../components/uniques/BrandLogo.vue";
import BrandLogo from "../../components/uniques/BrandLogo.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";
import jazzCollage from "../assets/jazz-collage.png";

const features = [
  { label: "Role", value: "singular Emotitone identity system" },
  { label: "Wordmark", value: "Lets Jazz · uppercase · ivory · no descenders" },
  { label: "Subline", value: "mono tracked label below lockup" },
  { label: "Variants", value: "wordmark · monogram · tagline · brass · inverted · notes" },
  { label: "Palette", value: "brand palette plus ivory/ink; one brass signal max" },
  { label: "Boundary", value: "preserved unique, not primitive or compound" },
];

const variants: Array<{ value: BrandLogoVariant; caption: string }> = [
  { value: "wordmark", caption: "Canonical wordmark" },
  { value: "monogram", caption: "Initial mark" },
  { value: "tagline", caption: "Logo plus tagline art" },
  { value: "brass", caption: "One lit signal" },
  { value: "inverted", caption: "Bone surface" },
  { value: "notes", caption: "With note marks" },
];
</script>
