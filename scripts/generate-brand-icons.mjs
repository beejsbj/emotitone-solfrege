#!/usr/bin/env node
// Exports the Brand Logo mark as the static app icons in public/.
//
//   node scripts/generate-brand-icons.mjs
//
// Geometry comes from src/components/uniques/brandMark.ts, loaded through
// Vite's module runner (Node 20 cannot import .ts), so the icons can never
// drift from BrandLogo.vue. The hex values below mirror the design tokens in
// src/emotitone-design-system.css; a static file cannot read CSS variables.
// PNGs are rasterised with headless Chrome over the DevTools protocol on
// --remote-debugging-pipe, which needs no WebSocket client (set
// CHROME=/path/to/chrome if it is not on PATH).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = join(ROOT, "public");

/** Loads the TypeScript geometry sources with Vite, without the app's config or plugins. */
async function loadGeometry() {
  const vite = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: "error",
    appType: "custom",
    resolve: { alias: { "@": join(ROOT, "src") } },
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { disabled: true },
  });
  try {
    return {
      ...(await vite.ssrLoadModule("/src/components/uniques/brandMark.ts")),
      ...(await vite.ssrLoadModule("/src/components/primatives/marks.ts")),
    };
  } finally {
    await vite.close();
  }
}

const {
  BRAND_BEATS,
  BRAND_BEATS_MIN_WIDTH,
  BRAND_BLOBS,
  BRAND_CUT_WIDTH,
  BRAND_MARK_VIEWBOX,
  BRAND_SCRAPS,
  BRAND_SCRAPS_TRANSFORM,
  BRAND_SPRINKLES,
  brandSprinkleTransform,
  MARK_DEFINITIONS,
} = await loadGeometry();

const TOKENS = {
  ink: "#0A0908",
  ivory: "#F4EFE6",
  tomato: "#d8362a",
  pine: "#1f4d3f",
  plum: "#6b3fa0",
  mustard: "#f0b137",
  cobalt: "#2f67b2",
};

/** The mark on a rounded Ink tile, padded so launchers and tabs never crop a circle. */
function iconSvg(size, withDetail) {
  const { x, y, width, height } = BRAND_MARK_VIEWBOX;
  const pad = width * 0.1;
  const side = Math.max(width, height) + pad * 2;
  const ox = x - pad - (side - pad * 2 - width) / 2;
  const oy = y - pad - (side - pad * 2 - height) / 2;
  const scraps = BRAND_SCRAPS.map((scrap) => {
    const paper = scrap.id === "e" ? TOKENS.ivory : TOKENS.ink;
    const glyph = scrap.id === "e" ? TOKENS.ink : TOKENS.ivory;
    return [
      `    <g>`,
      `      <polygon points="${scrap.paper}" fill="${paper}" stroke="${TOKENS.ink}" stroke-width="${BRAND_CUT_WIDTH}" stroke-linejoin="round" paint-order="stroke"/>`,
      ...scrap.glyphs.map((points) => `      <polygon points="${points}" fill="${glyph}"/>`),
      `    </g>`,
    ].join("\n");
  }).join("\n");
  const sprinkles = withDetail
    ? `  <g>\n${BRAND_SPRINKLES.map((sprinkle) => (
      `    <g transform="${brandSprinkleTransform(sprinkle, MARK_DEFINITIONS[sprinkle.name].viewBox)}" fill="${TOKENS[sprinkle.tone]}">${
        MARK_DEFINITIONS[sprinkle.name].paths.map((path) => `<path d="${path.d}"${path.fillRule ? ` fill-rule="${path.fillRule}"` : ""}/>`).join("")
      }</g>`
    )).join("\n")}\n  </g>\n`
    : "";
  const beats = withDetail
    ? BRAND_BEATS.xs.map((bx, index) => (
      `  <circle cx="${bx}" cy="${BRAND_BEATS.y}" r="${index === 0 ? BRAND_BEATS.downbeatR : BRAND_BEATS.r}" fill="${index === 0 ? TOKENS.tomato : TOKENS.ivory}"/>`
    )).join("\n") + "\n"
    : "";

  return `<svg width="${size}" height="${size}" viewBox="${ox} ${oy} ${side} ${side}" xmlns="http://www.w3.org/2000/svg">
  <title>EmotiTone</title>
  <rect x="${ox}" y="${oy}" width="${side}" height="${side}" rx="${side * 0.2}" fill="${TOKENS.ink}"/>
${BRAND_BLOBS.map((blob) => `  <circle cx="${blob.x}" cy="${blob.y}" r="${blob.r}" fill="${TOKENS[blob.tone]}"/>`).join("\n")}
${beats}  <g transform="${BRAND_SCRAPS_TRANSFORM}">
${scraps}
  </g>
${sprinkles}</svg>
`;
}

// icon.svg is the browser-tab favicon, drawn at 16–32px: below BRAND_BEATS_MIN_WIDTH,
// so it drops the beats and sprinkles exactly as BrandLogo does. The PWA icons carry them.
const outputs = [
  { file: "icon.svg", size: 512, renderedAt: 32 },
  { file: "icon-192.svg", size: 192, png: "icon-192.png" },
  { file: "icon-512.svg", size: 512, png: "icon-512.png" },
];

/** Opens headless Chrome and returns a DevTools protocol client over its pipe (fd 3 in, fd 4 out). */
function openChrome(scratch) {
  const browser = spawn(process.env.CHROME || "google-chrome", [
    "--headless=new",
    "--no-sandbox",
    "--hide-scrollbars",
    "--remote-debugging-pipe",
    `--user-data-dir=${join(scratch, "profile")}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
  const [, , , input, output] = browser.stdio;
  let id = 0;
  let buffered = "";
  const pending = new Map();
  output.setEncoding("utf8");
  output.on("data", (chunk) => {
    const frames = (buffered + chunk).split("\0");
    buffered = frames.pop();
    for (const frame of frames) {
      const message = JSON.parse(frame);
      if (!message.id || !pending.has(message.id)) continue;
      const { resolve: done, reject, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else done(message.result);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((done, reject) => {
    id += 1;
    pending.set(id, { resolve: done, reject, method });
    input.write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
  });
  return { send, close: () => browser.kill() };
}

/** Rasterises an SVG string at exactly size × size with a transparent page. */
async function rasterise(chrome, svg, size, out) {
  const { targetId } = await chrome.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await chrome.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => chrome.send(method, params, sessionId);
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  const html = `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`;
  await send("Page.navigate", { url: `data:text/html;base64,${Buffer.from(html).toString("base64")}` });
  await new Promise((done) => setTimeout(done, 500));
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  await chrome.send("Target.closeTarget", { targetId });
}

const scratch = mkdtempSync(join(tmpdir(), "brand-icons-"));
const chrome = openChrome(scratch);
try {
  for (const output of outputs) {
    const svg = iconSvg(output.size, (output.renderedAt ?? output.size) >= BRAND_BEATS_MIN_WIDTH);
    writeFileSync(join(PUBLIC, output.file), svg);
    console.log(`wrote public/${output.file}`);
    if (!output.png) continue;
    await rasterise(chrome, svg, output.size, join(PUBLIC, output.png));
    console.log(`wrote public/${output.png}`);
  }
} finally {
  chrome.close();
  await new Promise((done) => setTimeout(done, 300));
  rmSync(scratch, { recursive: true, force: true });
}
