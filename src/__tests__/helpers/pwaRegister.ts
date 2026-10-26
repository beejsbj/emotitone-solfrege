// Stands in for vite-plugin-pwa's `virtual:pwa-register` under Vitest, which
// does not run that plugin, so tests can boot the production entry (main.ts).
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}
