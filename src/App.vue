<template>
  <StyleGuide v-if="isStyleGuideRoute" :page="styleGuidePage" />
  <MainApp v-else />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import MainApp from "./MainApp.vue";
import { beginJoystickPageEdition } from "./components/uniques/Joystick/edition";

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const styleGuidePages = {
  "/style-guide": undefined,
  "/style-guide/tabs": "tabs",
  "/style-guide/instrument-picker": "instrument-picker",
  "/style-guide/config-menu": "config-menu",
  "/style-guide/pattern-reel": "pattern-reel",
} as const;
const isStyleGuideRoute = Object.prototype.hasOwnProperty.call(styleGuidePages, pathname);
const styleGuidePage = isStyleGuideRoute
  ? styleGuidePages[pathname as keyof typeof styleGuidePages]
  : undefined;

// The typography element defaults are deliberately loaded only for the guide.
// Keep the route marker on the document so html/body rules can be scoped too.
if (isStyleGuideRoute) {
  document.documentElement.classList.add("style-guide-route");
  document.body?.classList.add("style-guide-route");
  void import("./style-guide/guide-defaults.css");
} else {
  beginJoystickPageEdition();
}

const StyleGuide = defineAsyncComponent(
  () => import("./style-guide/StyleGuide.vue"),
);
</script>
