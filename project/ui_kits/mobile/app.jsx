/* global React, ReactDOM, useBeatScale, Knob, CutTab, SoundChip, IconBtn,
          Keyboard, PresetDrawer, PatternBar, HilbertScope, SOLFEGE, MAJOR_INDEXES */
const IOSDevice = window.IOSDevice;
const { useState, useEffect } = React;

const PRESETS = [
  { name: "Soft Glass" },
  { name: "Pulse Lab" },
  { name: "Ambient Bay" },
  { name: "Classroom" },
  { name: "Neon Score" },
  { name: "Hilbert Trace" },
];

const TABS = ["Sound", "Anim", "Freq", "Color", "Popup", "Scope"];

function App() {
  const [bpm] = useState(120);
  const [octave] = useState(4);
  const [rows] = useState(3);
  const [tab, setTab] = useState("Freq");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [litKey, setLitKey] = useState(null);
  const [activeNote, setActiveNote] = useState(SOLFEGE[8]); // Sol
  const [scopeOn, setScopeOn] = useState(true);

  const beatScale = useBeatScale(bpm, 0.025);

  useEffect(() => {
    if (!playing) return;
    const melody = [
      { i: 0, oct: 4 }, { i: 4, oct: 4 }, { i: 8, oct: 4 },
      { i: 10, oct: 4 }, { i: 8, oct: 4 }, { i: 4, oct: 4 },
      { i: 0, oct: 4 }, { i: 12, oct: 3 },
    ];
    let step = 0;
    const id = setInterval(() => {
      const n = melody[step % melody.length];
      const note = SOLFEGE[n.i];
      setLitKey(`${note.alt}${n.oct}`);
      setActiveNote(note);
      step++;
    }, (60000 / bpm) / 2);
    return () => clearInterval(id);
  }, [playing, bpm]);

  return (
    <IOSDevice dark={true} width={390} height={844}>
      <div style={{
        position: "absolute", inset: 0,
        background: "#000",
        color: "var(--fg)",
        font: "var(--t-body)",
        overflow: "hidden",
      }}>
        {/* SCOPE BACKGROUND — always behind, dims when off */}
        <div style={{
          position: "absolute", inset: 0,
          opacity: scopeOn ? 1 : 0,
          transition: "opacity 380ms var(--ease-paper)",
          pointerEvents: "none",
        }}>
          <HilbertScope noteHue={activeNote.hue} height={"100%"} />
        </div>

        {/* MAIN STACK — slim chrome, controls hugged to the keyboard */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          paddingTop: 54, // status bar / dynamic island
        }}>
          {/* BOUNCING CHROME — everything above the keyboard pulses with the beat */}
          <div style={{
            transform: `scale(${beatScale.toFixed(4)})`,
            transformOrigin: "50% 100%",
            display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
          }}>
          {/* TOP CHROME — wordmark + icon row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 10px 6px",
          }}>
            <div style={{ display: "flex", gap: 3, marginRight: 8 }}>
              <div style={{ width: 22, height: 5, background: "var(--paper)", borderRadius: 2 }} />
              <div style={{ width: 14, height: 5, background: "var(--paper)", borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1 }} />
            <IconBtn size={32} onClick={() => setScopeOn(s => !s)}>{scopeOn ? "◉" : "○"}</IconBtn>
            <IconBtn size={32} onClick={() => setDrawerOpen(true)}>↻</IconBtn>
            <IconBtn size={32} onClick={() => setDrawerOpen(true)}>⤓</IconBtn>
            <IconBtn size={32} onClick={() => setDrawerOpen(true)}>▤</IconBtn>
          </div>

          {/* TABS */}
          <div style={{ padding: "4px 8px 0" }}>
            <div style={{
              display: "flex", gap: 0,
              background: "rgba(20,20,20,.55)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              padding: 3,
              borderRadius: 12,
              boxShadow: "var(--ring)",
            }}>
              {TABS.map(t => (
                <CutTab key={t} active={tab === t} onClick={() => setTab(t)}>
                  {t}
                </CutTab>
              ))}
            </div>
          </div>

          {/* SPACER — lets scope breathe */}
          <div style={{ flex: 1, minHeight: 0 }} />

          {/* PATTERN BAR — slim, hugged to knobs */}
          <div style={{ margin: "0 8px 4px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(20,20,20,.7)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              padding: "5px 6px",
              borderRadius: 10,
              boxShadow: "var(--ring)",
            }}>
              <IconBtn size={28} role={playing ? "paper" : "default"} onClick={() => setPlaying(p => !p)}>{playing ? "■" : "▶"}</IconBtn>
              <IconBtn size={28} role="brass" title="Record">●</IconBtn>
              <div style={{
                flex: 1, padding: "5px 8px",
                font: "var(--t-mono)", fontSize: 11, color: "var(--fg-2)",
                background: "rgba(0,0,0,.6)",
                borderRadius: 6,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                <span style={{ color: "var(--fg-3)" }}>`{"<"} {"{ "}</span>
                <span style={{ color: "hsl(18 85% 56%)" }}>Do</span>
                <span style={{ color: "var(--fg-3)" }}>@.282 ~@.041, </span>
                <span style={{ color: "hsl(108 62% 48%)" }}>Ra</span>
                <span style={{ color: "var(--fg-3)" }}>{" } ~@.067 { "}</span>
                <span style={{ color: "hsl(108 62% 48%)" }}>Me</span>
                <span style={{ color: "var(--fg-3)" }}>{"@.122 } >`"}</span>
              </div>
              <IconBtn size={28} role="erase">⌫</IconBtn>
            </div>
          </div>

          {/* SLIM KNOB ROW — pressed close to the keyboard */}
          <div style={{
            display: "flex", justifyContent: "space-around", alignItems: "center",
            padding: "4px 12px 6px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 100%)",
          }}>
            <Knob value="C" label="Key" fillPct={0.1} size={38} />
            <Knob value="MAJ" label="Mode" fillPct={0.18} size={38} />
            <Knob value={bpm} label="BPM" fillPct={0.6} size={38} />
            <Knob value={octave} label="Oct" fillPct={0.5} size={38} />
            <Knob value={rows} label="Rows" fillPct={0.4} size={38} />
            <button style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--ink-3)", boxShadow: "var(--ring)", border: 0,
              color: "var(--fg-2)", marginTop: -10,
            }}>▾</button>
          </div>
          </div>
          {/* /BOUNCING CHROME */}

          {/* KEYBOARD — flush bottom, larger keys, no bounce */}
          <div style={{
            paddingBottom: 28,
          }}>
            <Keyboard litKey={litKey} onPress={(id, n) => { setLitKey(id); setActiveNote(n); }} />
          </div>
        </div>

        {/* DRAWER — top-down */}
        <PresetDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          presets={PRESETS}
          onApply={() => setDrawerOpen(false)}
        />
      </div>
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
