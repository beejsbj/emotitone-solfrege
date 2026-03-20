import type { SelectionRange } from "@codemirror/state";
import {
  RangeSetBuilder,
  StateEffect,
  StateField,
  Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { isNote } from "@strudel/core";

type NumericLike = number | { valueOf(): number };
type NotationMode = "solfege" | "note" | "degree";
type NoteSkin = {
  label: string;
  color: string;
  activeTextColor: string;
  fillBackground: string;
  fillColor: string;
  shapeRadius: string;
  clipPath?: string;
};

type PlaybackHighlightOptions = {
  isNoteColoringEnabled: boolean;
  isProgressiveFillEnabled: boolean;
  isPatternTextColoringEnabled: boolean;
  notationMode: NotationMode;
  scaleMode: string;
  noteSkins: NoteSkin[];
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
  text: string;
  isRelative: boolean;
};

type StripToken = {
  from: number;
  to: number;
  kind: "note" | "rest";
  noteIndex?: number;
  color?: string;
  label?: string;
  duration?: string;
  isActive?: boolean;
  style?: string;
};

type InlineMetaToken = {
  from: number;
  to: number;
};

const INLINE_META_REGEX = /(?:@(?:\d+(?:\.\d+)?)|:(?:\d+(?:\.\d+)?))/g;
const RELATIVE_NOTE_REGEX = /(?<![@.\w])[0-6](?=@|\b)/g;
const ABSOLUTE_NOTE_REGEX = /\b[a-gA-G](?:[#bsf]+)?\d\b/g;
const REST_TOKEN_REGEX = /~(?=@|\b)/g;
const SOLFEGE_LABELS = {
  major: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"],
  minor: ["Do", "Re", "Me", "Fa", "Sol", "Le", "Te"],
} as const;

const defaultOptions: PlaybackHighlightOptions = {
  isNoteColoringEnabled: true,
  isProgressiveFillEnabled: true,
  isPatternTextColoringEnabled: false,
  notationMode: "solfege",
  scaleMode: "major",
  noteSkins: [],
};

const setPlaybackOptions = StateEffect.define<Partial<PlaybackHighlightOptions>>();
const setEditorFocus = StateEffect.define<boolean>();
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

function extractInlineMetaTokens(doc: Text): InlineMetaToken[] {
  const tokens: InlineMetaToken[] = [];
  const content = doc.toString();

  for (const match of content.matchAll(INLINE_META_REGEX)) {
    const from = match.index;
    if (from == null) {
      continue;
    }

    tokens.push({
      from,
      to: from + match[0].length,
    });
  }

  return tokens;
}

function buildInlineMetaDecorations(
  tokens: InlineMetaToken[],
  selection: SelectionRange
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const token of tokens) {
    const isActive = selection.empty
      ? selection.head >= token.from && selection.head <= token.to
      : selection.from < token.to && selection.to > token.from;

    builder.add(
      token.from,
      token.to,
      Decoration.mark({
        class: isActive ? "cm-inline-meta cm-inline-meta-active" : "cm-inline-meta",
      })
    );
  }

  return builder.finish();
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

const editorFocus = StateField.define<boolean>({
  create() {
    return false;
  },
  update(isFocused, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setEditorFocus)) {
        return effect.value;
      }
    }

    return isFocused;
  },
});

const focusTrackerPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      if (view.hasFocus) {
        view.dispatch({ effects: setEditorFocus.of(true) });
      }
    }

    update(update: ViewUpdate) {
      if (update.focusChanged) {
        update.view.dispatch({ effects: setEditorFocus.of(update.view.hasFocus) });
      }
    }
  }
);

const inlineMetaPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    tokens: InlineMetaToken[];

    constructor(view: EditorView) {
      this.tokens = extractInlineMetaTokens(view.state.doc);
      this.decorations = buildInlineMetaDecorations(this.tokens, view.state.selection.main);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.tokens = extractInlineMetaTokens(update.state.doc);
      }

      if (update.docChanged || update.selectionSet) {
        this.decorations = buildInlineMetaDecorations(
          this.tokens,
          update.state.selection.main
        );
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
);

const noteTokens = StateField.define<NoteToken[]>({
  create(state) {
    return extractNoteTokens(state.doc);
  },
  update(tokens, tr) {
    return tr.docChanged ? extractNoteTokens(tr.newDoc) : tokens;
  },
});

type PlayedTokenState = {
  filledNoteIndices: number[];
  lastActiveIndex: number;
  lastPlaybackTime: number;
};

const emptyPlayedTokenState = (): PlayedTokenState => ({
  filledNoteIndices: [],
  lastActiveIndex: -1,
  lastPlaybackTime: 0,
});

const playedTokens = StateField.define<PlayedTokenState>({
  create() {
    return emptyPlayedTokenState();
  },
  update(current, tr) {
    if (tr.docChanged) {
      return emptyPlayedTokenState();
    }

    for (const effect of tr.effects) {
      if (!effect.is(setActivePlayback)) {
        continue;
      }

      const atTime = effect.value.atTime.valueOf();
      if (!effect.value.haps.length) {
        return atTime === 0
          ? emptyPlayedTokenState()
          : {
              ...current,
              lastPlaybackTime: atTime,
            };
      }

      const notes = tr.state.field(noteTokens);
      const activeIndices = notes.flatMap((note, index) =>
        effect.value.haps.some((hap) => isTokenActive(note, hap)) ? [index] : []
      );

      if (!activeIndices.length) {
        return {
          ...current,
          lastPlaybackTime: atTime,
        };
      }

      const firstActiveIndex = activeIndices[0];
      const didLoopBack =
        current.lastActiveIndex >= 0 &&
        firstActiveIndex < current.lastActiveIndex &&
        atTime > current.lastPlaybackTime;
      const filledNoteIndices = didLoopBack ? [] : [...current.filledNoteIndices];

      for (const index of activeIndices) {
        if (!filledNoteIndices.includes(index)) {
          filledNoteIndices.push(index);
        }
      }

      return {
        filledNoteIndices,
        lastActiveIndex: Math.max(...activeIndices),
        lastPlaybackTime: atTime,
      };
    }

    return current;
  },
});

const stripTokenDecorations = EditorView.decorations.compute(
  [noteTokens, playbackOptions, activePlayback, playedTokens, editorFocus],
  (state) => {
    if (state.field(editorFocus)) {
      return Decoration.none;
    }

    const tokens = state.field(noteTokens);
    const options = state.field(playbackOptions);
    const { atTime, haps } = state.field(activePlayback);
    const played = state.field(playedTokens);
    const builder = new RangeSetBuilder<Decoration>();
    const stripTokens = buildStripTokens(tokens, state.doc, options, atTime, haps, played);

    for (const token of stripTokens) {
      builder.add(
        token.from,
        token.to,
        Decoration.replace({
          widget: new StripTokenWidget(token),
          inclusive: false,
        })
      );
    }

    return builder.finish();
  }
);

export const strudelPlaybackHighlightExtension = [
  focusTrackerPlugin,
  inlineMetaPlugin,
  playbackOptions,
  editorFocus,
  activePlayback,
  noteTokens,
  playedTokens,
  stripTokenDecorations,
];

function extractNoteTokens(doc: Text): NoteToken[] {
  const tokens: NoteToken[] = [];
  const content = doc.toString();
  const patternBounds = getPatternBounds(content);

  for (const match of content.matchAll(ABSOLUTE_NOTE_REGEX)) {
    const note = match[0];
    const from = match.index;

    if (from == null || !isInsidePattern(from, patternBounds) || !isNote(note)) {
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
      text: note,
      isRelative: false,
    });
  }

  for (const match of content.matchAll(RELATIVE_NOTE_REGEX)) {
    const degree = match[0];
    const from = match.index;

    if (from == null || !isInsidePattern(from, patternBounds)) {
      continue;
    }

    tokens.push({
      from,
      to: from + degree.length,
      color: degreeToHslColor(Number(degree)),
      text: degree,
      isRelative: true,
    });
  }

  return tokens.sort((left, right) => left.from - right.from);
}

function buildStripTokens(
  notes: NoteToken[],
  doc: Text,
  options: PlaybackHighlightOptions,
  atTime: NumericLike,
  haps: HapLike[],
  played: PlayedTokenState
): StripToken[] {
  const content = doc.toString();
  const patternBounds = getPatternBounds(content);
  const filledNoteIndices = new Set(played.filledNoteIndices);
  const tokens: StripToken[] = notes.map((note, index) => {
    const matchingHap = haps.find((hap) => isTokenActive(note, hap));
    const skin = options.noteSkins[index];
    const color =
      skin?.color ??
      (options.isNoteColoringEnabled ? note.color : "hsla(0, 0%, 100%, 0.82)");
    const duration = extractTrailingDuration(content, note.to);
    const end = duration ? note.to + duration.length : note.to;

    return {
      from: note.from,
      to: end,
      kind: "note",
      noteIndex: index,
      color,
      label: skin?.label ?? resolveDisplayLabel(note, options) ?? note.text,
      duration,
      isActive: Boolean(matchingHap),
      style: matchingHap
        ? buildFilledTokenStyle(
            color,
            getFillScale(
              options.isProgressiveFillEnabled
                ? getProgressPercent(atTime, matchingHap)
                : 100
            ),
            options.isPatternTextColoringEnabled,
            skin
          )
        : filledNoteIndices.has(index)
          ? buildFilledTokenStyle(
              color,
              1,
              options.isPatternTextColoringEnabled,
              skin
            )
        : buildPassiveTokenStyle(color, options.isNoteColoringEnabled, skin),
    };
  });

  for (const match of content.matchAll(REST_TOKEN_REGEX)) {
    const from = match.index;
    if (from == null || !isInsidePattern(from, patternBounds)) {
      continue;
    }
    const duration = extractTrailingDuration(content, from + match[0].length);
    const end =
      duration ? from + match[0].length + duration.length : from + match[0].length;

    tokens.push({
      from,
      to: end,
      kind: "rest",
      label: match[0],
      duration,
    });
  }

  return tokens.sort((left, right) => left.from - right.from);
}

function resolveDisplayLabel(note: NoteToken, options: PlaybackHighlightOptions) {
  if (!note.isRelative) {
    return undefined;
  }

  if (options.notationMode === "degree") {
    return String(Number(note.text) + 1);
  }

  if (options.notationMode === "solfege") {
    const labels =
      options.scaleMode === "minor" ? SOLFEGE_LABELS.minor : SOLFEGE_LABELS.major;
    return labels[Number(note.text)] ?? note.text;
  }

  return undefined;
}

class StripTokenWidget extends WidgetType {
  constructor(private token: StripToken) {
    super();
  }

  eq(other: StripTokenWidget) {
    return JSON.stringify(this.token) === JSON.stringify(other.token);
  }

  toDOM() {
    const element = document.createElement("span");
    element.className =
      this.token.kind === "rest"
        ? "cm-live-strip-token cm-live-strip-token--rest"
        : this.token.isActive
          ? "cm-live-strip-token cm-live-strip-token--active"
          : "cm-live-strip-token";

    if (this.token.style) {
      element.setAttribute("style", this.token.style);
    }

    if (this.token.color) {
      element.setAttribute("data-strudel-note-color", this.token.color);
    }

    if (this.token.noteIndex != null) {
      element.setAttribute("data-note-index", String(this.token.noteIndex));
    }

    const label = document.createElement("span");
    label.className = "cm-live-strip-token__label";
    label.textContent = this.token.label ?? "";
    element.appendChild(label);

    if (this.token.duration) {
      const duration = document.createElement("span");
      duration.className = "cm-live-strip-token__duration";
      duration.textContent = this.token.duration;
      element.appendChild(duration);
    }

    return element;
  }

  ignoreEvent() {
    return false;
  }
}

function isTokenActive(token: NoteToken, hap: HapLike) {
  if (!hap.context?.locations?.length) {
    return false;
  }

  return hap.context.locations.some(
    ({ start, end }) => start < token.to && end > token.from
  );
}

function extractTrailingDuration(content: string, start: number) {
  const match = content.slice(start).match(/^@(?:\d+(?:\.\d+)?)/);
  return match?.[0];
}

function getPatternBounds(content: string) {
  const start = content.indexOf("<");
  if (start === -1) {
    return null;
  }

  const end = content.indexOf(">", start + 1);
  if (end === -1) {
    return null;
  }

  return { start, end };
}

function isInsidePattern(position: number, bounds: { start: number; end: number } | null) {
  if (!bounds) {
    return true;
  }

  return position > bounds.start && position < bounds.end;
}

function buildPassiveTokenStyle(
  color: string,
  isNoteColoringEnabled: boolean,
  skin?: NoteSkin
) {
  const passiveColor = skin?.color ?? color;
  const fillColor = skin?.fillColor ?? color;
  const fillSurface = skin?.fillBackground ?? fillColor;

  return [
    `--strudel-note-color: ${passiveColor}`,
    `--live-strip-label-color: ${passiveColor}`,
    `--live-strip-fill-color: ${fillColor}`,
    `--live-strip-fill-surface: ${fillSurface}`,
    `--live-strip-radius: ${skin?.shapeRadius ?? "4px"}`,
    `--live-strip-clip-path: ${skin?.clipPath ?? "none"}`,
    "--live-strip-fill-scale: 0",
    "--live-strip-shadow: none",
    isNoteColoringEnabled ? `color: ${passiveColor}` : "color: hsla(0, 0%, 100%, 0.82)",
  ].join("; ");
}

function buildFilledTokenStyle(
  color: string,
  fillScale: number,
  isPatternTextColoringEnabled: boolean,
  skin?: NoteSkin
) {
  const fillColor = skin?.fillColor ?? color;
  const fillSurface = skin?.fillBackground ?? fillColor;
  const textColor = skin?.activeTextColor
    ? skin.activeTextColor
    : isPatternTextColoringEnabled
      ? getContrastTextColor(fillColor)
      : skin?.color ?? color;

  return [
    `--strudel-note-color: ${textColor}`,
    `--live-strip-label-color: ${textColor}`,
    `--live-strip-fill-color: ${fillColor}`,
    `--live-strip-fill-surface: ${fillSurface}`,
    `--live-strip-radius: ${skin?.shapeRadius ?? "4px"}`,
    `--live-strip-clip-path: ${skin?.clipPath ?? "none"}`,
    `--live-strip-fill-scale: ${fillScale}`,
    `--live-strip-shadow: inset 0 -1px 0 ${toTransparentColor(
      fillColor,
      0.28
    )}, 0 0 0 1px ${toTransparentColor(fillColor, 0.22)}`,
    `color: ${textColor}`,
  ]
    .filter(Boolean)
    .join("; ");
}

function getProgressPercent(atTime: NumericLike, hap: HapLike) {
  const begin = hap.whole?.begin?.valueOf?.() ?? 0;
  const duration = hap.whole?.duration?.valueOf?.() ?? 0;

  if (!duration) {
    return 100;
  }

  const progress = Math.max(0, Math.min(1, (atTime.valueOf() - begin) / duration));
  return progress * 100;
}

function getFillScale(progressPercent: number) {
  if (progressPercent <= 0) {
    return 0;
  }

  return Math.max(0.04, Math.min(1, progressPercent / 100));
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

function degreeToHslColor(degree: number) {
  const hueInterval = 360 / 7;
  const hue = (degree * hueInterval + hueInterval / 2) % 360;

  return `hsl(${hue} 88% 72%)`;
}

function toTransparentColor(color: string, alpha: number) {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

function getContrastTextColor(color: string) {
  const lightness = getColorLightness(color);
  if (lightness == null) {
    return "white";
  }

  return lightness >= 58 ? "hsla(0, 0%, 6%, 0.94)" : "hsla(0, 0%, 100%, 0.96)";
}

function getColorLightness(color: string) {
  const match = color.match(
    /hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*([\d.]+)%/i
  );

  if (!match) {
    return null;
  }

  return Number(match[1]);
}
