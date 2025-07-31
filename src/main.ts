import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { tooltipPlugin } from "./directives/tooltip";
import { registerSW } from 'virtual:pwa-register';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
pinia.use(piniaPluginPersistedstate);
app.use(tooltipPlugin);

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to user asking to reload the page
    if (confirm('New content is available! Click OK to refresh.')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

app.mount("#app");
