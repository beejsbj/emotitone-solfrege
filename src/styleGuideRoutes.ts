// The one list of style-guide URLs. App.vue routes these to the guide, and
// main.ts keeps production-only bootstrap (the page editions, persistence)
// off them. Both read this module, so a new guide page cannot be routed to the
// guide while still running production bootstrap. Kept tiny and dependency-free
// because it sits in the production entry graph.
export const STYLE_GUIDE_PAGES = {
  "/style-guide": undefined,
  "/style-guide/tokens": "tokens",
  "/style-guide/primitives": "primitives",
  "/style-guide/compounds": "compounds",
  "/style-guide/uniques": "uniques",
  "/style-guide/compositions": "compositions",
  "/style-guide/systems": "systems",
  "/style-guide/tabs": "tabs",
  "/style-guide/instrument-picker": "instrument-picker",
  "/style-guide/config-menu": "config-menu",
  "/style-guide/pattern-reel": "pattern-reel",
  "/style-guide/stage": "stage",
  "/style-guide/performance-deck": "performance-deck",
  "/style-guide/lab/stage": "lab-stage",
  "/style-guide/lab/stage/frame": "lab-stage-frame",
} as const;

export type StyleGuideRoute = keyof typeof STYLE_GUIDE_PAGES;
export type StyleGuidePage = NonNullable<(typeof STYLE_GUIDE_PAGES)[StyleGuideRoute]>;

/** The current pathname without trailing slashes; the root stays "/". */
export function currentPathname(): string {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export function isStyleGuideRoute(pathname: string): pathname is StyleGuideRoute {
  return Object.prototype.hasOwnProperty.call(STYLE_GUIDE_PAGES, pathname);
}
