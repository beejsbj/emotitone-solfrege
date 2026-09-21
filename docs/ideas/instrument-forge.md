# Instrument Forge — future possibility

User idea, 2026-09-21. Exploratory; not approved for implementation in the current Shape work.

A Forge tab inside the instrument panel could create a named custom instrument from a synth source and sound-shaping settings, save it locally, and make it selectable for live playing and generated Strudel patterns.

The useful distinction: Shape adjusts the current playing sound; Forge authors a reusable instrument recipe. A saved recipe would contain a source, supported synthesis parameters, envelope, and effects—not a recording of one note.

Potential later controls include waveform, vibrato, noise, FM, and individual harmonics, drawn from Strudel's synth and audio-effect capabilities. Controls should depend on what the selected engine actually supports.

Questions to settle before implementation:

- How global Shape settings combine with a saved instrument's own settings.
- How patterns retain a stable instrument identity if its recipe is edited or deleted.
- Versioned local storage, export/import, and recovery when browser data is cleared.
- Live/generated-code parity and effects routing.

Start with structured, validated recipes rather than arbitrary saved executable code. Local browser storage is device/browser-specific; it is not a backup or cross-device sync.
