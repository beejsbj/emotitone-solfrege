/* global React, SOLFEGE, MAJOR_INDEXES, useBeatScale */
const { useState } = React;

// ────────────────────────────────────────────────────────────────────
// SolfegeKey — a single cut-paper key
// ────────────────────────────────────────────────────────────────────
window.SolfegeKey = function SolfegeKey({ note, octave, big, lit, onPress }) {
  const bg = `hsl(${note.hue} 78% 54%)`;
  return (
    <button
      onMouseDown={onPress}
      style={{
        position: "relative",
        background: bg,
        border: 0,
        borderRadius: 14,
        height: big ? 110 : 70,
        color: "#fff",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: big ? 30 : 22,
        textTransform: "uppercase",
        letterSpacing: ".01em",
        boxShadow: lit
          ? `inset 0 -3px 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.25), 0 0 32px hsl(${note.hue} 90% 60% / .9), 0 0 8px #fff`
          : "inset 0 -3px 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.18)",
        clipPath: "polygon(3% 1%, 98% 2%, 100% 98%, 1% 99%)",
        cursor: "pointer",
        transition: "box-shadow 80ms, transform 80ms",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 0,
      }}
    >
      <span>{big ? note.name : note.alt}</span>
      <span style={{
        font: "var(--t-caption)",
        opacity: .85,
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-label)",
      }}>
        {big ? `${note.alt}${octave}` : `${note.alt}${octave}`}
      </span>
    </button>
  );
};

// ────────────────────────────────────────────────────────────────────
// Keyboard — three octave rows of solfège tiles
// ────────────────────────────────────────────────────────────────────
window.Keyboard = function Keyboard({ litKey, onPress }) {
  const rowOctaves = [5, 4, 3];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 8px" }}>
      {rowOctaves.map((oct, rowIdx) => (
        <div key={oct} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {MAJOR_INDEXES.slice(0, 7).map((i, col) => {
            const note = SOLFEGE[i];
            const id = `${note.alt}${oct}`;
            return (
              <window.SolfegeKey
                key={id}
                note={note}
                octave={oct}
                big={rowIdx === 1}
                lit={litKey === id}
                onPress={() => onPress?.(id, note)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
