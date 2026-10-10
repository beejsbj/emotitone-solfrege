import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

// The PWA must not undo code splitting by downloading every lazy chunk at install.
const deferredCode = new Set<string>();
const captureDeferredCode: Plugin = {
  name: "deferred-code-precache",
  generateBundle(_options, bundle) {
    deferredCode.clear();
    const initial = new Set<string>();
    const visit = (file: string) => {
      if (initial.has(file)) return;
      initial.add(file);
      const chunk = bundle[file];
      if (chunk?.type === "chunk") {
        for (const imported of chunk.imports) visit(imported);
      }
    };
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === "chunk" && (chunk.isEntry
        // These dynamic modules prepare the default synth during boot; keep
        // their existing offline availability with the startup graph.
        || /\/src\/(services\/preparedLiveInstrument|audio\/live\/bridge)\.ts$/.test(chunk.facadeModuleId ?? "")
        || (chunk.facadeModuleId ?? "").includes("workbox-window"))) visit(chunk.fileName);
    }
    const initialStyles = new Set<string>();
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== "chunk") continue;
      if (!initial.has(chunk.fileName)) deferredCode.add(chunk.fileName);
      else {
        // Vite attaches each chunk's extracted styles to this metadata.
        const metadata = (chunk as typeof chunk & { viteMetadata?: { importedCss: Set<string> } }).viteMetadata;
        for (const css of metadata?.importedCss ?? []) initialStyles.add(css);
      }
    }
    // Include CSS-only dynamic imports (the guide's document defaults), too.
    for (const asset of Object.values(bundle)) {
      if (asset.fileName.endsWith(".css") && !initialStyles.has(asset.fileName)) {
        deferredCode.add(asset.fileName);
      }
    }
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    captureDeferredCode,
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "EmotiTone Solfège",
        short_name: "EmotiTone",
        description:
          "An interactive music theory web app that teaches solfège through emotional experiences",
        theme_color: "#0A0908",
        background_color: "#0A0908",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
        categories: ["music", "education", "entertainment"],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        manifestTransforms: [async entries => ({
          manifest: entries.filter(entry => !deferredCode.has(entry.url)),
          warnings: [],
        })],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => url.origin === self.location.origin
              && ["script", "style"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "deferred-code",
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "audio-samples-cache",
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "audio-samples-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: {
    // Source & Credits links to the deployed commit; empty on local builds.
    "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    ),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5175,
    host: true,
    proxy: {
      "/api/pitch-analysis": {
        target: "https://melograph-swart.vercel.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pitch-analysis/, "/api"),
      },
    },
  },
  build: {
    target: "esnext",
    manifest: true,
  },
});
