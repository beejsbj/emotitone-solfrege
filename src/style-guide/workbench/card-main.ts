import { createApp } from "vue";
import { createPinia } from "pinia";
import CardWorkbench from "./CardWorkbench.vue";
import "../../style.css";
import "../../emotitone-design-system.css";

document.documentElement.classList.add("card-workbench-route");
document.body.classList.add("card-workbench-route");

createApp(CardWorkbench).use(createPinia()).mount("#app");
