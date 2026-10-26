// Lab pages: measurement harnesses reached from a preview link, outside the
// instrument and the style guide. App.vue routes these to their page, and
// main.ts keeps production-only bootstrap (the page editions, persistence) off
// them, so a lab run never writes the player's saved data. Kept tiny and
// dependency-free because it sits in the production entry graph.
export const LAB_PAGES = {
  // The worklet engine's receipts on a phone (BJS-494).
  "/lab/phone-gate": "phone-gate",
} as const;

export type LabRoute = keyof typeof LAB_PAGES;
export type LabPage = (typeof LAB_PAGES)[LabRoute];

export function isLabRoute(pathname: string): pathname is LabRoute {
  return Object.prototype.hasOwnProperty.call(LAB_PAGES, pathname);
}
