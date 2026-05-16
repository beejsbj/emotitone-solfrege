/* global React, IconBtn */
const { useState } = React;

// ────────────────────────────────────────────────────────────────────
// PresetDrawer — slide-from-top drawer w/ torn edge
// ────────────────────────────────────────────────────────────────────
window.PresetDrawer = function PresetDrawer({ open, onClose, presets, onApply }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0,
        pointerEvents: open ? "auto" : "none",
        zIndex: 30,
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "var(--scrim)",
          opacity: open ? 1 : 0,
          transition: "opacity 220ms var(--ease-paper)",
        }}
      />
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: 0,
          background: "var(--ink-2)",
          color: "var(--fg)",
          padding: "16px 16px 22px",
          transform: open ? "translateY(0)" : "translateY(-105%)",
          transition: "transform 380ms var(--ease-paper)",
          boxShadow: "0 18px 40px rgba(0,0,0,.6)",
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        {/* Top bar: brand, close, save */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 26, height: 6, background: "var(--paper)", borderRadius: 2 }} />
            <div style={{ width: 16, height: 6, background: "var(--paper)", borderRadius: 2 }} />
          </div>
          <div style={{ flex: 1 }} />
          <IconBtn>⏻</IconBtn>
          <IconBtn>↻</IconBtn>
          <IconBtn>⤓</IconBtn>
          <IconBtn>▤</IconBtn>
          <IconBtn onClick={onClose}>×</IconBtn>
        </div>

        {/* Preset grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {presets.map((p) => (
            <div key={p.name} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "16px 14px",
              background: "var(--ink-3)", boxShadow: "var(--ring)",
              borderRadius: 14,
              borderLeft: "3px solid var(--paper)",
            }}>
              <div style={{
                flex: 1,
                font: "var(--t-h2)",
                letterSpacing: ".02em",
                textTransform: "uppercase",
                color: "var(--fg)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{p.name}</div>
              <button onClick={() => onApply?.(p)} style={{
                padding: "8px 14px",
                font: "var(--t-label)",
                letterSpacing: "var(--tracking-label)",
                textTransform: "uppercase",
                background: "transparent",
                color: "var(--fg-2)",
                boxShadow: "var(--ring)",
                borderRadius: 8,
                border: 0,
                cursor: "pointer",
              }}>APPLY</button>
            </div>
          ))}
        </div>

        {/* Torn-paper bottom edge */}
        <div className="torn-edge-bottom" style={{
          position: "absolute", left: 0, right: 0, bottom: -10, height: 12,
          background: "var(--ink-2)",
          WebkitMaskImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 16' preserveAspectRatio='none'><path d='M0 0 H1200 V6 L1160 8 L1120 4 L1080 9 L1040 5 L1000 10 L960 6 L920 11 L880 4 L840 9 L800 5 L760 10 L720 6 L680 11 L640 4 L600 9 L560 5 L520 10 L480 6 L440 11 L400 4 L360 9 L320 5 L280 10 L240 6 L200 11 L160 4 L120 9 L80 5 L40 10 L0 6 Z' fill='black'/></svg>\")",
          maskImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 16' preserveAspectRatio='none'><path d='M0 0 H1200 V6 L1160 8 L1120 4 L1080 9 L1040 5 L1000 10 L960 6 L920 11 L880 4 L840 9 L800 5 L760 10 L720 6 L680 11 L640 4 L600 9 L560 5 L520 10 L480 6 L440 11 L400 4 L360 9 L320 5 L280 10 L240 6 L200 11 L160 4 L120 9 L80 5 L40 10 L0 6 Z' fill='black'/></svg>\")",
          WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        }} />
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// PatternBar — strudel-style pattern field
// ────────────────────────────────────────────────────────────────────
window.PatternBar = function PatternBar({ playing, onToggle }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--ink-2)",
      padding: "8px 10px",
      borderRadius: 12,
      boxShadow: "var(--ring)",
      margin: "8px 12px",
    }}>
      <IconBtn onClick={onToggle}>{playing ? "■" : "▶"}</IconBtn>
      <div style={{
        flex: 1, padding: "8px 10px",
        font: "var(--t-mono)", color: "var(--fg-2)",
        background: "var(--ink)",
        borderRadius: 8,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        <span style={{ color: "var(--fg-3)" }}>`{"<"} </span>
        <span style={{ color: "var(--fg-3)" }}>{"{ "}</span>
        <span style={{ color: "hsl(18 85% 56%)" }}>Do</span>
        <span style={{ color: "var(--fg-3)" }}>@0.282 </span>
        <span style={{ color: "var(--fg-3)" }}>~@0.0415, </span>
        <span style={{ color: "hsl(108 62% 48%)" }}>Ra</span>
        <span style={{ color: "var(--fg-3)" }}>{" } "}</span>
        <span style={{ color: "var(--fg-3)" }}>~@0.0675 </span>
        <span style={{ color: "var(--fg-3)" }}>{"{ "}</span>
        <span style={{ color: "hsl(108 62% 48%)" }}>Me</span>
        <span style={{ color: "var(--fg-3)" }}>@0.1225 </span>
        <span style={{ color: "var(--fg-3)" }}>{" } >`"}</span>
      </div>
      <IconBtn>⌫</IconBtn>
    </div>
  );
};
