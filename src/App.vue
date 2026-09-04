<template>
  <StyleGuide v-if="isStyleGuide" />
  <MainApp v-else />
</template>

<script setup lang="ts">
import MainApp from "./MainApp.vue";
import StyleGuide from "./style-guide/StyleGuide.vue";

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const isStyleGuide = pathname === "/style-guide";
</script>
