import type { PreparedBlobFrame } from "@/types/canvas";
import { LedRaster } from "./led";
import { pairsFor } from "./connections";
import { publishConnections } from "./shared";
import type { ConnectionsPainter, LabFrame } from "./types";

/*
 * Connections · Dot Field. The Dot family's own Merge and Web, on the shared
 * LED grid, so relationships are made of the same lit dots as everything else
 * on the panel (Chord Shape's vector lines clashed with the raster).
 *
 * Merge: one fused body. Each LED lights where the bodies' metaball field
 * reaches, or inside an hourglass neck along the spanning tree, so separated
 * bodies stay one connected shape like production's always-connected Merge.
 * A lit dot takes the colour of the body that owns it most: colours meet at a
 * hard dot boundary, never blend. Web: a dotted run of LEDs per analyzed pair,
 * each half in its own member's colour.
 */

type Pair = [PreparedBlobFrame, PreparedBlobFrame];

/** Distance from p to segment ab, and where along it (0–1). */
function toSegment(px: number, py: number, a: PreparedBlobFrame, b: PreparedBlobFrame) {
  const dx = b.blob.x - a.blob.x;
  const dy = b.blob.y - a.blob.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a.blob.x) * dx + (py - a.blob.y) * dy) / lengthSq));
  return { t, d: Math.hypot(px - (a.blob.x + dx * t), py - (a.blob.y + dy * t)) };
}

export function createDotFieldConnections(): ConnectionsPainter {
  const raster = new LedRaster();
  return {
    paint(frame: LabFrame, bodies, scene, mode) {
      const led = raster.begin(frame, false);
      const visible = bodies.filter((body) => body.opacity > 0.02 && body.scaledRadius > 0.5);
      const pairs: Pair[] = pairsFor(bodies, scene, mode);
      publishConnections(scene, pairs, mode);
      const cell = raster.cell;

      if (mode === "web") {
        pairs.forEach(([a, b]) => {
          const length = Math.hypot(b.blob.x - a.blob.x, b.blob.y - a.blob.y);
          const steps = Math.floor(length / (cell * 2));
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            led.fillStyle = t < 0.5 ? a.primaryColor : b.primaryColor;
            led.fillRect(a.blob.x + (b.blob.x - a.blob.x) * t - cell / 2, a.blob.y + (b.blob.y - a.blob.y) * t - cell / 2, cell, cell);
          }
        });
        raster.present(frame);
        return;
      }

      if (visible.length < 2) { raster.present(frame); return; }
      const reach = Math.max(...visible.map((body) => body.scaledRadius)) * 2;
      const minX = Math.min(...visible.map((body) => body.blob.x)) - reach;
      const maxX = Math.max(...visible.map((body) => body.blob.x)) + reach;
      const minY = Math.min(...visible.map((body) => body.blob.y)) - reach;
      const maxY = Math.max(...visible.map((body) => body.blob.y)) + reach;
      for (let y = Math.floor(minY / cell) * cell + cell / 2; y < maxY; y += cell) {
        for (let x = Math.floor(minX / cell) * cell + cell / 2; x < maxX; x += cell) {
          let field = 0;
          let owner: PreparedBlobFrame | null = null;
          let strongest = 0;
          visible.forEach((body) => {
            const r = body.scaledRadius * 1.15;
            const influence = (r * r) / Math.max(1, (x - body.blob.x) ** 2 + (y - body.blob.y) ** 2);
            field += influence;
            if (influence > strongest) { strongest = influence; owner = body; }
          });
          let lit = field >= 1;
          if (!lit) {
            // The neck: an hourglass along each spanning-tree link, waisted in the middle.
            for (const [a, b] of pairs) {
              const { t, d } = toSegment(x, y, a, b);
              const width = Math.min(a.scaledRadius, b.scaledRadius) * 0.55 * (0.55 + 0.45 * Math.abs(2 * t - 1));
              if (d <= Math.max(cell * 0.6, width)) { lit = true; if (!owner) owner = t < 0.5 ? a : b; break; }
            }
          }
          if (!lit || !owner) continue;
          led.fillStyle = (owner as PreparedBlobFrame).primaryColor;
          led.fillRect(x - cell / 2, y - cell / 2, cell, cell);
        }
      }
      raster.present(frame);
    },
    clear() {},
  };
}
