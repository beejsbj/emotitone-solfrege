<template>
  <Sticker variant="badge" color="ivory">Accepted</Sticker>
  <!-- @vue-expect-error Badge intentionally excludes ordinary Sticker paper colors. -->
  <Sticker variant="badge" color="tomato">Rejected</Sticker>
</template>

<script setup lang="ts">
import Sticker from "@/components/primatives/Sticker";
</script>
