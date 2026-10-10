<template>
  <StyleGuide v-if="isStyleGuideRoute" :page="styleGuidePage" />
  <MainApp v-else />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import MainApp from "./MainApp.vue";
import LazyPanelLoading from "./components/LazyPanelLoading.vue";
import { beginJoystickPageEdition } from "./components/uniques/Joystick/edition";
import {
  STYLE_GUIDE_PAGES,
  currentPathname,
  isStyleGuideRoute as isStyleGuideRouteFor,
} from "./styleGuideRoutes";

const pathname = currentPathname();
const isStyleGuideRoute = isStyleGuideRouteFor(pathname);
const styleGuidePage = isStyleGuideRoute ? STYLE_GUIDE_PAGES[pathname] : undefined;

// The typography element defaults are deliberately loaded only for the guide.
// Keep the route marker on the document so html/body rules can be scoped too.
if (isStyleGuideRoute) {
  document.documentElement.classList.add("style-guide-route");
  document.body?.classList.add("style-guide-route");
  void import("./style-guide/guide-defaults.css");
} else {
  beginJoystickPageEdition();
}

const StyleGuide = defineAsyncComponent({
  loader: () => import("./style-guide/StyleGuide.vue"),
  loadingComponent: LazyPanelLoading,
});
</script>
