<script setup lang="ts">
import { sourceUrl } from "@/utils/sourceLink";

/**
 * Source & Credits: the AGPL asks that the source of a deployed version be
 * offered to the people using it. A quiet link in the brand zone, pointing at
 * the exact deployed commit. The repository's NOTICE lists the credits.
 */
const props = defineProps<{ commit?: string }>();
const href = sourceUrl(props.commit ?? import.meta.env.VITE_COMMIT_SHA);
</script>

<template>
  <a
    class="source-credits"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
  >Source &amp; Credits</a>
</template>

<style scoped>
.source-credits {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: 44px;
  color: var(--ivory-3);
  font: 700 10px/1.2 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-decoration: underline;
  text-decoration-color: var(--ivory-4);
  text-underline-offset: 3px;
  text-transform: uppercase;
  -webkit-tap-highlight-color: transparent;
}

.source-credits:hover { color: var(--ivory); text-decoration-color: currentcolor; }
.source-credits:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }
</style>
