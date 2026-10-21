import { ref } from "vue";

/**
 * One placement rule for the fixed notices at the top of the screen: a notice
 * sits below whatever the humming transport is showing, so the two never cover
 * each other. The transport publishes the viewport y where its feedback ends
 * (0 when it shows none); the save warning reads it.
 */
export const topNoticeClearance = ref(0);

export function setTopNoticeClearance(bottom: number): void {
  topNoticeClearance.value = Number.isFinite(bottom) ? Math.max(0, Math.ceil(bottom)) : 0;
}
