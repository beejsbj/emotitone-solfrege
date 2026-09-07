/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MELOGRAPH_ANALYZE_URL?: string;
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
