import { createApp } from "vue";
import { createPinia } from "pinia";
import PatternCardWorkbench from "./PatternCardWorkbench.vue";
import "../../style.css";
import "../../emotitone-design-system.css";

document.documentElement.classList.add("pattern-card-workbench-route");
document.body.classList.add("pattern-card-workbench-route");

createApp(PatternCardWorkbench).use(createPinia()).mount("#app");
