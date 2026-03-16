import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { tooltipPlugin } from "./directives/tooltip";
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
