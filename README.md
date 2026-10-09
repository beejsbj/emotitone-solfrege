# EmotiTone Solfège

An instrument that teaches through its moats and cues. EmotiTone is a phone-first musical instrument for learning solfège by feel. You play it, and it shows and tells you what each note and interval sounds like. It does not give lessons or quizzes.

It is built around four things only this instrument does:

- **Feeling first.** Every interval has an emotional voice: a written description and a colour from Music Color.
- **Sketch speed.** Everything you play is kept. There is no record button and no DAW; humming is a sketch too.
- **Loops as play.** Playing is the loop (the Looper is in progress).
- **A pocket instrument.** It plays one-handed on a phone, with a large sound library behind it and its code one tap away.

It began as a feeling-building app for solfège, then absorbed its author's own tool for sketching melodies quickly. You can play with touch, a computer keyboard, MIDI, or by humming. A canvas behind the keys draws what you play.

## Run it

Requires [Bun](https://bun.sh) and Node 22.

```bash
bun install --frozen-lockfile
bun run dev          # http://localhost:5175
bun run type-check
bun run test:run
bun run build
```

Use the package scripts rather than calling the compilers directly; they share a lock so several worktrees do not exhaust memory.

## For contributors and agents

Start with [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md). The decision record is `docs/retrospective-spec.md` (open PR #143), and the visual direction is `src/style-guide/WIP-bible.md`. The app is moving from Strudel and superdough to its own AudioWorklet engine; the spec explains why.

## Licence

GNU Affero General Public License v3.0 or later ([LICENSE](LICENSE)). The app ships Strudel and superdough, which are AGPL, so the source of every deployed version is offered; the in-app "Source & Credits" link goes to it. [NOTICE](NOTICE) records the reasoning and the third-party licences. Fonts and sample audio are separate from the code licence and are covered there.
