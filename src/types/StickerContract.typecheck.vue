<template>
  <Sticker variant="badge" color="ivory">Accepted</Sticker>
  <!-- @vue-expect-error Badge intentionally excludes ordinary Sticker paper colors. -->
  <Sticker variant="badge" color="tomato">Rejected</Sticker>
  <Sticker variant="outline" color="ivory" paper="tape">Pinned</Sticker>
  <!-- @vue-expect-error Badge is brass hardware and never takes a paper treatment. -->
  <Sticker variant="badge" paper="stamp">Rejected</Sticker>
</template>

<script setup lang="ts">
import Sticker from "@/components/primatives/Sticker";
</script>
