import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { tooltipPlugin } from "./directives/tooltip";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
pinia.use(piniaPluginPersistedstate);
app.use(tooltipPlugin);
app.mount("#app");
