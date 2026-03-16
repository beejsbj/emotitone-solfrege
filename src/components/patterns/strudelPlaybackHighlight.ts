import { RangeSetBuilder, StateEffect, StateField, Text } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { isNote } from "@strudel/core";

type NumericLike = number | { valueOf(): number };

type PlaybackHighlightOptions = {
  isNoteColoringEnabled: boolean;
  isProgressiveFillEnabled: boolean;
  isPatternTextColoringEnabled: boolean;
};

type HapLike = {
  context?: {
    locations?: Array<{ start: number; end: number }>;
  };
  whole?: {
    begin: NumericLike;
    duration: NumericLike;
  };
};

type NoteToken = {
  from: number;
  to: number;
  color: string;
};

const defaultOptions: PlaybackHighlightOptions = {
  isNoteColoringEnabled: true,
  isProgressiveFillEnabled: true,
  isPatternTextColoringEnabled: false,
};

const setPlaybackOptions = StateEffect.define<Partial<PlaybackHighlightOptions>>();
const setActivePlayback = StateEffect.define<{
  atTime: NumericLike;
  haps: HapLike[];
}>();

export function updatePlaybackHighlightOptions(
  view: EditorView,
  options: Partial<PlaybackHighlightOptions>
) {
  view.dispatch({ effects: setPlaybackOptions.of(options) });
}

export function highlightPlaybackLocations(
  view: EditorView,
  atTime: NumericLike,
  haps: HapLike[]
) {
  view.dispatch({ effects: setActivePlayback.of({ atTime, haps }) });
}

const playbackOptions = StateField.define<PlaybackHighlightOptions>({
  create() {
    return defaultOptions;
  },
  update(options, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setPlaybackOptions)) {
        return { ...options, ...effect.value };
      }
    }

    return options;
  },
});

const activePlayback = StateField.define<{
  atTime: NumericLike;
  haps: HapLike[];
}>({
  create() {
    return { atTime: 0, haps: [] };
  },
  update(active, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setActivePlayback)) {
        return effect.value;
      }
    }

    return active;
  },
});

const noteTokens = StateField.define<NoteToken[]>({
  create(state) {
    return extractNoteTokens(state.doc);
  },
  update(tokens, tr) {
    return tr.docChanged ? extractNoteTokens(tr.newDoc) : tokens;
  },
});

const passiveNoteDecorations = EditorView.decorations.compute(
  [noteTokens, playbackOptions],
  (state) => {
    const tokens = state.field(noteTokens);
    const options = state.field(playbackOptions);
    const builder = new RangeSetBuilder<Decoration>();

    if (!options.isNoteColoringEnabled) {
      return builder.finish();
    }

    for (const token of tokens) {
      builder.add(
        token.from,
        token.to,
        Decoration.mark({
          attributes: {
            style: `--strudel-note-color: ${token.color}; color: ${token.color};`,
          },
        })
      );
    }

    return builder.finish();
  }
);

const activeNoteDecorations = EditorView.decorations.compute(
  [noteTokens, playbackOptions, activePlayback],
  (state) => {
    const tokens = state.field(noteTokens);
    const options = state.field(playbackOptions);
    const { atTime, haps } = state.field(activePlayback);
    const builder = new RangeSetBuilder<Decoration>();

    for (const token of tokens) {
      const matchingHap = haps.find((hap) => isTokenActive(token, hap));

      if (!matchingHap) {
        continue;
      }

      const color = options.isNoteColoringEnabled ? token.color : "var(--foreground)";
      builder.add(
        token.from,
        token.to,
        Decoration.mark({
          attributes: {
            class: "cm-note-playing",
            style: buildActiveNoteStyle(
              color,
              atTime,
              matchingHap,
              options.isProgressiveFillEnabled,
              options.isPatternTextColoringEnabled
            ),
          },
        })
      );
    }

    return builder.finish();
  }
);

export const strudelPlaybackHighlightExtension = [
  playbackOptions,
  activePlayback,
  noteTokens,
  passiveNoteDecorations,
  activeNoteDecorations,
];

function extractNoteTokens(doc: Text): NoteToken[] {
  const tokens: NoteToken[] = [];
  const content = doc.toString();
  const noteRegex = /\b[a-gA-G](?:[#bsf]+)?\d\b/g;

  for (const match of content.matchAll(noteRegex)) {
    const note = match[0];
    const from = match.index;

    if (from == null || !isNote(note)) {
      continue;
    }

    const color = noteToHslColor(note);
    if (!color) {
      continue;
    }

    tokens.push({
      from,
      to: from + note.length,
      color,
    });
  }

  return tokens;
}

function isTokenActive(token: NoteToken, hap: HapLike) {
  if (!hap.context?.locations?.length) {
    return false;
  }

  return hap.context.locations.some(
    ({ start, end }) => start < token.to && end > token.from
  );
}

function buildActiveNoteStyle(
  color: string,
  atTime: NumericLike,
  hap: HapLike,
  isProgressiveFillEnabled: boolean,
  isPatternTextColoringEnabled: boolean
) {
  const progressDegrees = isProgressiveFillEnabled ? getProgressDegrees(atTime, hap) : 360;
  const fillStyle = isProgressiveFillEnabled
    ? `background-image: conic-gradient(from 0deg at 50% 50%, ${toTransparentColor(
        color
      )} 0deg ${progressDegrees}deg, transparent ${progressDegrees}deg 360deg);`
    : `background-color: ${toTransparentColor(color)};`;

  const textColorStyle = isPatternTextColoringEnabled ? buildContrastTextStyle(color) : "";

  return [
    `--strudel-note-color: ${color}`,
    fillStyle,
    `box-shadow: inset 0 0 0 1px ${toOutlineColor(color)}`,
    "background-repeat: no-repeat",
    "background-position: center",
    textColorStyle,
  ]
    .filter(Boolean)
    .join("; ");
}

function getProgressDegrees(atTime: NumericLike, hap: HapLike) {
  const begin = hap.whole?.begin?.valueOf?.() ?? 0;
  const duration = hap.whole?.duration?.valueOf?.() ?? 0;

  if (!duration) {
    return 360;
  }

  const progress = Math.max(0, Math.min(1, (atTime.valueOf() - begin) / duration));
  return progress * 360;
}

function noteToHslColor(note: string) {
  const chromaMap: Record<string, number> = {
    C: 0,
    "C#": 30,
    Db: 30,
    D: 60,
    "D#": 90,
    Eb: 90,
    E: 120,
    F: 150,
    "F#": 180,
    Gb: 180,
    G: 210,
    "G#": 240,
    Ab: 240,
    A: 270,
    "A#": 300,
    Bb: 300,
    B: 330,
  };

  const match = note.match(/^([A-G](?:#|b)?)/);
  if (!match) {
    return null;
  }

  const hue = chromaMap[match[1]];
  if (hue == null) {
    return null;
  }

  return `hsl(${hue} 92% 70%)`;
}

function toTransparentColor(color: string) {
  return color.replace("hsl(", "hsla(").replace(")", " / 0.32)");
}

function toOutlineColor(color: string) {
  return color.replace("hsl(", "hsla(").replace(")", " / 0.56)");
}

function buildContrastTextStyle(color: string) {
  return `color: ${color}; text-shadow: 0 0 12px ${toTransparentColor(color)}`;
}
