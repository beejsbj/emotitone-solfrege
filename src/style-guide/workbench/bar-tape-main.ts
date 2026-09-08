import { createApp } from "vue";
import { createPinia } from "pinia";
import BarTapeWorkbench from "./BarTapeWorkbench.vue";
import "../../style.css";
import "../../emotitone-design-system.css";

document.documentElement.classList.add("bar-tape-workbench-route");
document.body.classList.add("bar-tape-workbench-route");

createApp(BarTapeWorkbench).use(createPinia()).mount("#app");
