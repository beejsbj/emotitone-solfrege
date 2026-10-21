/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PITCH_ANALYSIS_URL?: string;
  /** Git commit of this build (Vercel: VERCEL_GIT_COMMIT_SHA), injected by vite.config.ts. */
  readonly VITE_COMMIT_SHA?: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}
