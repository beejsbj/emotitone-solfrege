/* global React, useBeatScale, SOLFEGE, MAJOR_INDEXES */
const { useState, useEffect, useMemo } = React;

// ────────────────────────────────────────────────────────────────────
// HilbertScope — fake organic visualizer (like the play-state shots)
// Draws a smoothly-evolving hilbert-ish curve on canvas tinted by
// the current note color.
// ────────────────────────────────────────────────────────────────────
window.HilbertScope = function HilbertScope({ noteHue = 252, intensity = 1, height = 240 }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    let raf;
    const draw = (t) => {
      const w = cv.width = cv.offsetWidth * devicePixelRatio;
      const h = cv.height = cv.offsetHeight * devicePixelRatio;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      // Glow halo
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w,h)/1.4);
      glow.addColorStop(0, `hsla(${noteHue}, 90%, 60%, ${0.18 * intensity})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      // organic curve
      ctx.lineWidth = 1.2 * devicePixelRatio;
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        const steps = 600;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const a = u * Math.PI * 8 + t * 0.0008 + layer * 0.7;
          const r = Math.min(w, h) * (0.18 + 0.16 * Math.sin(u * 22 + t * 0.0015 + layer));
          const x = cx + Math.cos(a) * r * (1 + 0.2 * Math.sin(u * 6 + t * 0.0006));
          const y = cy + Math.sin(a) * r * (1 + 0.2 * Math.cos(u * 5 + t * 0.0007));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${noteHue + layer * 12}, 90%, ${62 - layer * 8}%, ${0.7 - layer * 0.18})`;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [noteHue, intensity]);
  return (
    <canvas
      ref={ref}
      style={{
        width: "100%", height,
        display: "block",
        background: "radial-gradient(120% 80% at 50% 40%, #0d0d0d, #000 70%)",
      }}
    />
  );
};
