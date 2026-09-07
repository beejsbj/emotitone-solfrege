<template>
  <LogoLab v-if="isLogoLab" />
  <StyleGuide v-else-if="isStyleGuide" />
  <MainApp v-else />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import MainApp from "./MainApp.vue";

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const isStyleGuide = pathname === "/style-guide";
const isLogoLab = pathname === "/logo-lab";

// The typography element defaults are deliberately loaded only for the guide.
// Keep the route marker on the document so html/body rules can be scoped too.
if (isStyleGuide) {
  document.documentElement.classList.add("style-guide-route");
  document.body?.classList.add("style-guide-route");
  void import("./style-guide/guide-defaults.css");
}

if (isLogoLab) {
  document.documentElement.classList.add("logo-lab-route");
  document.body?.classList.add("logo-lab-route");
}

const StyleGuide = defineAsyncComponent(
  () => import("./style-guide/StyleGuide.vue"),
);

const LogoLab = defineAsyncComponent(
  () => import("./style-guide/logo-lab/LogoLab.vue"),
);
</script>
