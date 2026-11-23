import { defineStore } from "pinia";
import { useHeadsUpQueue } from "@/composables/useHeadsUpQueue";

/**
 * The app's one Heads-up stack: every source (the Looper, the phrase shelf, a
 * refused press) raises here, and the deck's stack (DeckHeadsUp.vue) shows it.
 */
export const useHeadsUpStore = defineStore("headsUp", () => useHeadsUpQueue());
