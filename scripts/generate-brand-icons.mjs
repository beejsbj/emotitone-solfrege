#!/usr/bin/env node
// Exports the Brand Logo mark as the static app icons in public/.
//
//   node scripts/generate-brand-icons.mjs
//
// Geometry comes from src/components/uniques/brandMark.ts (Node strips the
// types natively), so the icons can never drift from BrandLogo.vue. The hex
// values below mirror the design tokens in src/emotitone-design-system.css;
// a static file cannot read CSS variables. PNGs are rasterised with headless
// Chrome over the DevTools protocol (set CHROME=/path/to/chrome if it is not
// on PATH).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRAND_BEATS,
  BRAND_BEATS_MIN_WIDTH,
  BRAND_BLOBS,
  BRAND_CUT_WIDTH,
  BRAND_MARK_VIEWBOX,
  BRAND_SCRAPS,
  BRAND_SCRAPS_TRANSFORM,
} from "../src/components/uniques/brandMark.ts";

const TOKENS = {
  ink: "#0A0908",
  ivory: "#F4EFE6",
  tomato: "#d8362a",
  pine: "#1f4d3f",
  plum: "#6b3fa0",
  mustard: "#f0b137",
  cobalt: "#2f67b2",
};

const PUBLIC = resolve(fileURLToPath(new URL("../public", import.meta.url)));

/** The mark on a rounded Ink tile, padded so launchers and tabs never crop a circle. */
function iconSvg(size, withBeats) {
  const { x, y, width, height } = BRAND_MARK_VIEWBOX;
  const pad = width * 0.1;
  const side = Math.max(width, height) + pad * 2;
  const ox = x - pad - (side - pad * 2 - width) / 2;
  const oy = y - pad - (side - pad * 2 - height) / 2;
  const scraps = BRAND_SCRAPS.map((scrap) => {
    const paper = scrap.id === "e" ? TOKENS.mustard : TOKENS.tomato;
    const glyph = scrap.id === "e" ? TOKENS.ink : TOKENS.ivory;
    return [
      `    <g>`,
      `      <polygon points="${scrap.paper}" fill="${paper}" stroke="${TOKENS.ink}" stroke-width="${BRAND_CUT_WIDTH}" stroke-linejoin="round" paint-order="stroke"/>`,
      ...scrap.glyphs.map((points) => `      <polygon points="${points}" fill="${glyph}"/>`),
      `    </g>`,
    ].join("\n");
  }).join("\n");
  const beats = withBeats
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
</svg>
`;
}

// icon.svg is the browser-tab favicon, drawn at 16–32px: below BRAND_BEATS_MIN_WIDTH,
// so it drops the beats exactly as BrandLogo does. The PWA icons carry them.
const outputs = [
  { file: "icon.svg", size: 512, renderedAt: 32 },
  { file: "icon-192.svg", size: 192, png: "icon-192.png" },
  { file: "icon-512.svg", size: 512, png: "icon-512.png" },
];

/** Rasterises an SVG string at exactly size × size with a transparent page, over CDP. */
async function rasterise(svg, size, out, scratch) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const browser = spawn(process.env.CHROME || "google-chrome", [
    "--headless=new",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(scratch, `profile-${port}`)}`,
    "about:blank",
  ], { stdio: "ignore" });
  try {
    let target;
    for (let attempt = 0; attempt < 60 && !target; attempt += 1) {
      await new Promise((done) => setTimeout(done, 250));
      try {
        const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        target = targets.find((entry) => entry.type === "page");
      } catch { /* Chrome is still starting. */ }
    }
    if (!target) throw new Error("Chrome did not expose a page target");
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((done) => { socket.onopen = done; });
    let id = 0;
    const pending = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) pending.get(message.id)(message);
    };
    const send = (method, params = {}) => new Promise((done) => {
      id += 1;
      pending.set(id, done);
      socket.send(JSON.stringify({ id, method, params }));
    });
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const html = `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`;
    await send("Page.navigate", { url: `data:text/html;base64,${Buffer.from(html).toString("base64")}` });
    await new Promise((done) => setTimeout(done, 500));
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
    writeFileSync(out, Buffer.from(shot.result.data, "base64"));
    socket.close();
  } finally {
    browser.kill();
  }
}

const scratch = mkdtempSync(join(tmpdir(), "brand-icons-"));
try {
  for (const output of outputs) {
    const svg = iconSvg(output.size, (output.renderedAt ?? output.size) >= BRAND_BEATS_MIN_WIDTH);
    writeFileSync(join(PUBLIC, output.file), svg);
    console.log(`wrote public/${output.file}`);
    if (!output.png) continue;
    await rasterise(svg, output.size, join(PUBLIC, output.png), scratch);
    console.log(`wrote public/${output.png}`);
  }
} finally {
  await new Promise((done) => setTimeout(done, 300));
  rmSync(scratch, { recursive: true, force: true });
}
