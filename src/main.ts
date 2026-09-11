import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import "./emotitone-design-system.css";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { tooltipPlugin } from "./directives/tooltip";
import { beginKnobPageEdition } from "./components/primatives/Knob/edition";
import { beginTabsPageEdition } from "./components/primatives/TabsEdition";
import { registerSW } from 'virtual:pwa-register';

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

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const isDesignRoute = [
  "/style-guide",
  "/style-guide/tabs",
  "/style-guide/instrument-picker",
  "/style-guide/config-menu",
  "/style-guide/pattern-reel",
  "/style-guide/stage",
].includes(pathname);
beginTabsPageEdition();
if (!isDesignRoute || pathname === "/style-guide/config-menu") {
  beginKnobPageEdition();
}

app.use(pinia);
pinia.use(piniaPluginPersistedstate);
app.use(tooltipPlugin);

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
