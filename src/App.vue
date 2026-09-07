<template>
  <TabsLab v-if="isTabsLab" />
  <InstrumentPickerLab v-else-if="isInstrumentPickerLab" />
  <StyleGuide v-else-if="isStyleGuide" />
  <MainApp v-else />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import MainApp from "./MainApp.vue";

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const isStyleGuide = pathname === "/style-guide";
const isTabsLab = pathname === "/style-guide/tabs";
const isInstrumentPickerLab = pathname === "/style-guide/instrument-picker";
const isDesignRoute = isStyleGuide || isTabsLab || isInstrumentPickerLab;

// The typography element defaults are deliberately loaded only for the guide.
// Keep the route marker on the document so html/body rules can be scoped too.
if (isDesignRoute) {
  document.documentElement.classList.add("style-guide-route");
  document.body?.classList.add("style-guide-route");
  void import("./style-guide/guide-defaults.css");
}

const StyleGuide = defineAsyncComponent(
  () => import("./style-guide/StyleGuide.vue"),
);

const TabsLab = defineAsyncComponent(
  () => import("./style-guide/TabsLab.vue"),
);

const InstrumentPickerLab = defineAsyncComponent(
  () => import("./style-guide/InstrumentPickerLab.vue"),
);
</script>
