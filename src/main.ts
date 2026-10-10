import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import "./emotitone-design-system.css";
import { persistedStatePlugin } from "./services/safeStorage";
import { beginKnobPageEdition } from "./components/primatives/Knob/edition";
import { beginTabsPageEdition } from "./components/primatives/TabsEdition";
import { registerSW } from 'virtual:pwa-register';
import { currentPathname, isStyleGuideRoute } from "./styleGuideRoutes";

async function clearDevServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
}

const app = createApp(App);
const pinia = createPinia();

const pathname = currentPathname();
// Every guide URL App.vue routes to the style guide comes from the same
// module, so browsing the guide never runs production-only bootstrap such as
// the knob edition.
const isDesignRoute = isStyleGuideRoute(pathname);
const isPersistenceFreeDesignRoute = [
  "/style-guide/performance-deck",
  "/style-guide/stage",
].includes(pathname);
if (!isPersistenceFreeDesignRoute) {
  beginTabsPageEdition();
}
if (!isDesignRoute || pathname === "/style-guide/config-menu") {
  beginKnobPageEdition();
}

app.use(pinia);
// The picker specimen drives the real instrument store; keep its knob edits
// out of the app's saved instrument and Shapes.
if (pathname !== "/style-guide/instrument-picker") {
  pinia.use(persistedStatePlugin);
}

if (import.meta.env.DEV) {
  void clearDevServiceWorkers();
} else {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('New content is available! Click OK to refresh.')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
    },
  });
}

app.mount("#app");
