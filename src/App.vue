<template>
  <StyleGuide v-if="isStyleGuideRoute" :page="styleGuidePage" />
  <PhoneGatePage v-else-if="labPage === 'phone-gate'" />
  <MainApp v-else />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import MainApp from "./MainApp.vue";
import LazyPanelLoading from "./components/LazyPanelLoading.vue";
import {
  STYLE_GUIDE_PAGES,
  currentPathname,
  isStyleGuideRoute as isStyleGuideRouteFor,
} from "./styleGuideRoutes";
import { LAB_PAGES, isLabRoute } from "./labRoutes";

const pathname = currentPathname();
const isStyleGuideRoute = isStyleGuideRouteFor(pathname);
const styleGuidePage = isStyleGuideRoute ? STYLE_GUIDE_PAGES[pathname] : undefined;
const labPage = isLabRoute(pathname) ? LAB_PAGES[pathname] : undefined;

// The typography element defaults are deliberately loaded only for the guide.
// Keep the route marker on the document so html/body rules can be scoped too.
if (isStyleGuideRoute) {
  document.documentElement.classList.add("style-guide-route");
  document.body?.classList.add("style-guide-route");
  void import("./style-guide/guide-defaults.css");
}

const StyleGuide = defineAsyncComponent({
  loader: () => import("./style-guide/StyleGuide.vue"),
  loadingComponent: LazyPanelLoading,
});

// Lab pages load on demand: the instrument's entry graph never carries them.
const PhoneGatePage = defineAsyncComponent({
  loader: () => import("./lab/PhoneGatePage.vue"),
  loadingComponent: LazyPanelLoading,
});
</script>
