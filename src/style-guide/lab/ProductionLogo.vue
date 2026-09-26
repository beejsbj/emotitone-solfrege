<script setup lang="ts">
import BrandLogo from "@/components/uniques/BrandLogo.vue";
import type { LabLogoProps } from "@/types/styleGuide";

/** The accepted Centered Cluster, mounted from BrandLogo.vue through the lab logo contract. */
const props = withDefaults(defineProps<LabLogoProps>(), {
  surface: "ink",
  variant: "full",
  lockup: false,
  size: "160px",
  live: false,
});
</script>

<template>
  <BrandLogo :layout="props.lockup ? 'compact' : 'mark'" :surface="props.surface" :size="props.size" />
</template>
