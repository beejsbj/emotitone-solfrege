import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import "./emotitone-design-system.css";
import { persistedStatePlugin } from "./services/safeStorage";
import { installBackupConsole } from "./services/persistenceCodec";
import { beginEditionShuffle, readEditionReviewPin } from "./composables/useEditionFamily";
import { registerSW } from 'virtual:pwa-register';
import { currentPathname, isStyleGuideRoute } from "./styleGuideRoutes";
import { isLabRoute } from "./labRoutes";

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
// the edition Shuffle: guide specimens hold the first family unless a review
// pin (`?edition=<family>`) asks for another, on any route.
const isDesignRoute = isStyleGuideRoute(pathname);
// A lab page (a measurement harness) is neither the instrument nor the guide.
const isLab = isLabRoute(pathname);
readEditionReviewPin();
if ((!isDesignRoute && !isLab) || pathname === "/style-guide/config-menu") {
  beginEditionShuffle();
}

app.use(pinia);
// The picker specimen drives the real instrument store; keep its knob edits
// out of the app's saved instrument and Shapes. A lab run never saves either.
if (pathname !== "/style-guide/instrument-picker" && !isLab) {
  pinia.use(persistedStatePlugin);
}
// Support path for saved-data backups: `emotitoneBackups.list()` in the
// console (docs/persistence-codec.md).
installBackupConsole(window);

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
