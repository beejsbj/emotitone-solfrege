/* global React */
const { useState, useEffect } = React;

// ────────────────────────────────────────────────────────────────────
// EMOTITONE — Solfège chromatic palette (C-major rotation)
// ────────────────────────────────────────────────────────────────────
window.SOLFEGE = [
  { name: "Do",  alt: "C",  hue:  18, deg: "1P"  },
  { name: "Ra",  alt: "C#", hue:  48, deg: "2m"  },
  { name: "Re",  alt: "D",  hue:  78, deg: "2M"  },
  { name: "Me",  alt: "D#", hue: 108, deg: "3m"  },
  { name: "Mi",  alt: "E",  hue: 138, deg: "3M"  },
  { name: "Fa",  alt: "F",  hue: 178, deg: "4P"  },
  { name: "Fi",  alt: "F#", hue: 202, deg: "4A"  },
  { name: "Se",  alt: "G♭", hue: 228, deg: "5d"  },
  { name: "Sol", alt: "G",  hue: 252, deg: "5P"  },
  { name: "Le",  alt: "G#", hue: 282, deg: "6m"  },
  { name: "La",  alt: "A",  hue: 312, deg: "6M"  },
  { name: "Te",  alt: "A#", hue: 342, deg: "7m"  },
  { name: "Ti",  alt: "B",  hue:   2, deg: "7M"  },
];

// 7 diatonic degrees of C major (Do Re Mi Fa Sol La Ti)
window.MAJOR_INDEXES = [0, 2, 4, 5, 8, 10, 12];

// ────────────────────────────────────────────────────────────────────
// Beating UI hook — returns a 0-1 phase synced to BPM
// ────────────────────────────────────────────────────────────────────
window.useBeat = function useBeat(bpm = 120) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const period = 60000 / bpm;
    let raf;
    const tick = (t) => {
      setPhase(((t - start) % period) / period);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bpm]);
  return phase;
};

// scale value triggered on the kick of each beat
window.useBeatScale = function useBeatScale(bpm = 120, amt = 0.04) {
  const phase = window.useBeat(bpm);
  // bell curve at start of beat
  const k = Math.exp(-Math.pow(phase * 12, 2));
  return 1 + k * amt;
};

// ────────────────────────────────────────────────────────────────────
// CutTab — the off-cut Persona-5 tab
// ────────────────────────────────────────────────────────────────────
window.CutTab = function CutTab({ active, children, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 6px",
        textAlign: "center",
        font: "var(--t-label)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        cursor: "pointer",
        color: active ? "var(--ink)" : "var(--fg-3)",
        background: active ? "var(--paper)" : "transparent",
        clipPath: active ? "polygon(4% 0%, 98% 6%, 100% 90%, 96% 100%, 2% 94%, 0% 8%)" : "none",
        transform: active ? "skewX(-2deg) translateY(-2px)" : "none",
        boxShadow: active ? "var(--shadow-cut)" : "none",
        transition: "color 120ms",
      }}
    >
      {children}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// IconBtn — square dark button with hairline ring
// ────────────────────────────────────────────────────────────────────
window.IconBtn = function IconBtn({ children, onClick, size = 40, role = "default" }) {
  // role: default | paper | wire | brass | erase
  const styles = {
    default: { background: "var(--ink-3)", color: "var(--fg)", boxShadow: "var(--ring)" },
    paper:   { background: "var(--paper)",  color: "var(--ink)", boxShadow: "none" },
    wire:    { background: "transparent",   color: "var(--fg-2)", boxShadow: "inset 0 0 0 1.5px var(--ink-5)" },
    brass:   { color: "var(--brass-edge)" }, // .brass class supplies fill + sheen
    erase:   { background: "transparent",   color: "var(--ivory-2)", boxShadow: "inset 0 0 0 1.5px var(--ivory-3)" },
  };
  const s = styles[role] || styles.default;
  return (
    <button
      onClick={onClick}
      className={role === "brass" ? "brass" : undefined}
      style={{
        width: size, height: size,
        ...s,
        borderRadius: 10,
        border: 0,
        display: "grid", placeItems: "center",
        cursor: "pointer",
        font: "var(--t-h2)",
      }}
    >
      {children}
    </button>
  );
};

// ────────────────────────────────────────────────────────────────────
// Knob — half-ring with center label
// ────────────────────────────────────────────────────────────────────
window.Knob = function Knob({ value, label, fillPct = 0.7, size = 38 }) {
  const stop = Math.max(0, Math.min(1, fillPct)) * 0.75; // 270° sweep
  const deg = stop * 360;
  const innerR = size / 2 - 3;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          background: `conic-gradient(from -135deg,
            var(--paper) 0 ${deg}deg,
            var(--ink-4) ${deg}deg 270deg,
            transparent 270deg 360deg)`,
          WebkitMask: `radial-gradient(circle, transparent ${innerR - 1}px, #000 ${innerR}px)`,
          mask: `radial-gradient(circle, transparent ${innerR - 1}px, #000 ${innerR}px)`,
          position: "relative",
          display: "grid", placeItems: "center",
        }}
      >
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: size < 42 ? 13 : 15, lineHeight: 1,
          letterSpacing: ".01em", color: "var(--fg)", textTransform: "uppercase",
        }}>
          {value}
        </span>
      </div>
      <span style={{
        fontFamily: "var(--font-text)", fontWeight: 600, fontSize: 9,
        letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--fg-3)",
      }}>
        {label}
      </span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// SoundChip — instrument selector pill
// ────────────────────────────────────────────────────────────────────
window.SoundChip = function SoundChip({ name = "Piano", swatch = "#000", onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: "8px 14px 8px 8px",
      background: "var(--ink-3)", boxShadow: "var(--ring)",
      borderRadius: 10, border: 0, color: "var(--fg)",
      font: "var(--t-label)", letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase", cursor: "pointer",
    }}>
      <div style={{ width: 26, height: 26, background: swatch, borderRadius: 6 }} />
      <span>{name}</span>
      <span style={{ opacity: .5, marginLeft: 2 }}>▾</span>
    </button>
  );
};

Object.assign(window, {});
