import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import { initializeFontWeightOscillation } from "./composables/useOscillatingFontWeight";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");

// Initialize font weight oscillation after app is mounted
app.config.globalProperties.$nextTick(() => {
  initializeFontWeightOscillation();
});
