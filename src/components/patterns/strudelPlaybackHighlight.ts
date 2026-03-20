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
  noteIndex: number;
  noteKey: string;
};

type PatternSegment = {
  kind: "group" | "note" | "rest";
  from: number;
  to: number;
  closeBrace?: number;
};

type ActiveNoteState = {
  noteKey: string;
  cycle: number;
  progress: number;
  begin: number;
};

type PlaybackState = {
  filledNoteKeys: string[];
  cycle: number;
};

type GroupPartRender =
  | {
      kind: "note";
      text: string;
      inlineDuration?: string;
      style: string;
      active: boolean;
      begin?: number;
      compact: boolean;
    }
  | {
      kind: "rest";
      text: string;
      inlineDuration?: string;
      compact: boolean;
    }
  | {
      kind: "punct";
      text: string;
    };

type StripToken = {
  from: number;
  to: number;
  kind: "note" | "rest" | "group";
  color?: string;
  label?: string;
  duration?: string;
  isActive?: boolean;
  style?: string;
  followRank?: number;
  displayMode?: "cluster" | "literal";
  parts?: GroupPartRender[];
};

type InlineMetaToken = {
  from: number;
  to: number;
};

const INLINE_META_REGEX = /(?:@(?:\d+(?:\.\d+)?)|:(?:\d+(?:\.\d+)?))/g;
const RELATIVE_NOTE_REGEX = /(?<![@.\w])[0-6](?=@|\b)/g;
const ABSOLUTE_NOTE_REGEX = /\b[a-gA-G](?:[#bsf]+)?\d\b/g;
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

const emptyPlaybackState = (): PlaybackState => ({
  filledNoteKeys: [],
  cycle: -1,
});

const playedTokens = StateField.define<PlaybackState>({
  create() {
    return emptyPlaybackState();
  },
  update(current, tr) {
    if (tr.docChanged) {
      return emptyPlaybackState();
    }

    for (const effect of tr.effects) {
      if (!effect.is(setActivePlayback)) {
        continue;
      }

      const atTime = effect.value.atTime.valueOf();
      if (!effect.value.haps.length) {
        return atTime === 0 ? emptyPlaybackState() : current;
      }

      const notes = tr.state.field(noteTokens);
      const active = collectActiveNotes(
        notes,
        effect.value.haps,
        effect.value.atTime
      );

      if (active.cycle == null || !active.activeByKey.size) {
        return atTime === 0 ? emptyPlaybackState() : current;
      }

      const filledNoteKeys =
        active.cycle === current.cycle ? [...current.filledNoteKeys] : [];

      for (const noteKey of active.activeByKey.keys()) {
        if (!filledNoteKeys.includes(noteKey)) {
          filledNoteKeys.push(noteKey);
        }
      }

      return {
        filledNoteKeys,
        cycle: active.cycle,
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

    const notes = state.field(noteTokens);
    const options = state.field(playbackOptions);
    const { atTime, haps } = state.field(activePlayback);
    const played = state.field(playedTokens);
    const builder = new RangeSetBuilder<Decoration>();
    const stripTokens = buildStripTokens(notes, state.doc, options, atTime, haps, played);

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
  const unsorted: Omit<NoteToken, "noteIndex" | "noteKey">[] = [];
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

    unsorted.push({
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

    unsorted.push({
      from,
      to: from + degree.length,
      color: degreeToHslColor(Number(degree)),
      text: degree,
      isRelative: true,
    });
  }

  return unsorted
    .sort((left, right) => left.from - right.from)
    .map((token, noteIndex) => ({
      ...token,
      noteIndex,
      noteKey: `${token.from}:${token.to}`,
    }));
}

function buildStripTokens(
  notes: NoteToken[],
  doc: Text,
  options: PlaybackHighlightOptions,
  atTime: NumericLike,
  haps: HapLike[],
  played: PlaybackState
): StripToken[] {
  const content = doc.toString();
  const patternBounds = getPatternBounds(content);
  const segments = extractPatternSegments(content, patternBounds);
  const active = collectActiveNotes(notes, haps, atTime);
  const activeByKey = active.activeByKey;
  const filledNoteKeys = new Set(
    played.cycle === -1 || active.cycle == null || played.cycle === active.cycle
      ? played.filledNoteKeys
      : []
  );
  const noteByStart = new Map(notes.map((note) => [note.from, note]));
  const stripTokens: StripToken[] = [];

  for (const segment of segments) {
    if (segment.kind === "group") {
      stripTokens.push(
        buildGroupToken(
          segment,
          content,
          notes,
          options,
          activeByKey,
          filledNoteKeys
        )
      );
      continue;
    }

    if (segment.kind === "rest") {
      const duration = extractTrailingDuration(content, segment.from + 1);
      stripTokens.push({
        from: segment.from,
        to: duration ? segment.from + 1 + duration.length : segment.to,
        kind: "rest",
        label: "~",
        duration,
      });
      continue;
    }

    const note = noteByStart.get(segment.from);
    if (!note) {
      continue;
    }

    const skin = options.noteSkins[note.noteIndex];
    const color =
      skin?.color ??
      (options.isNoteColoringEnabled ? note.color : "hsla(0, 0%, 100%, 0.82)");
    const duration = extractTrailingDuration(content, note.to);
    const activeState = activeByKey.get(note.noteKey);
    const isFilled = filledNoteKeys.has(note.noteKey);

    stripTokens.push({
      from: note.from,
      to: duration ? note.to + duration.length : note.to,
      kind: "note",
      color,
      label: skin?.label ?? resolveDisplayLabel(note, options) ?? note.text,
      duration,
      isActive: Boolean(activeState),
      followRank: activeState?.begin,
      style: activeState
        ? buildFilledTokenStyle(
            color,
            getFillScale(
              options.isProgressiveFillEnabled ? activeState.progress : 100
            ),
            options.isPatternTextColoringEnabled,
            skin
          )
        : isFilled
          ? buildFilledTokenStyle(color, 1, options.isPatternTextColoringEnabled, skin)
          : buildPassiveTokenStyle(color, options.isNoteColoringEnabled, skin),
    });
  }

  return stripTokens;
}

function buildGroupToken(
  segment: PatternSegment,
  content: string,
  notes: NoteToken[],
  options: PlaybackHighlightOptions,
  activeByKey: Map<string, ActiveNoteState>,
  filledNoteKeys: Set<string>
): StripToken {
  const closeBrace = segment.closeBrace ?? segment.to - 1;
  const duration = extractTrailingDuration(content, closeBrace + 1);
  const notesInGroup = notes.filter(
    (note) => note.from > segment.from && note.to <= closeBrace
  );
  const renderedParts = buildGroupParts(
    content,
    segment.from,
    closeBrace,
    notesInGroup,
    options,
    activeByKey,
    filledNoteKeys
  );
  const meaningfulParts = renderedParts.filter(
    (part): part is Extract<GroupPartRender, { kind: "note" }> => part.kind === "note"
  );
  const displayMode = isCompactChord(renderedParts) ? "cluster" : "literal";
  const parts =
    displayMode === "cluster"
      ? meaningfulParts.map((part) => ({ ...part, compact: true }))
      : renderedParts;
  const activeNotes = meaningfulParts.filter((part) => part.active);
  const followRank = activeNotes.length
    ? Math.max(...activeNotes.map((part) => part.begin ?? -Infinity))
    : undefined;

  return {
    from: segment.from,
    to: segment.to,
    kind: "group",
    duration,
    isActive: activeNotes.length > 0,
    followRank,
    displayMode,
    parts,
  };
}

function buildGroupParts(
  content: string,
  groupStart: number,
  closeBrace: number,
  notesInGroup: NoteToken[],
  options: PlaybackHighlightOptions,
  activeByKey: Map<string, ActiveNoteState>,
  filledNoteKeys: Set<string>
): GroupPartRender[] {
  const parts: GroupPartRender[] = [];
  const noteQueue = [...notesInGroup].sort((left, right) => left.from - right.from);
  let cursor = groupStart + 1;

  while (cursor < closeBrace) {
    const nextNote = noteQueue[0];

    if (nextNote && nextNote.from === cursor) {
      noteQueue.shift();

      const skin = options.noteSkins[nextNote.noteIndex];
      const color =
        skin?.color ??
        (options.isNoteColoringEnabled
          ? nextNote.color
          : "hsla(0, 0%, 100%, 0.82)");
      const inlineDuration = extractTrailingDuration(content, nextNote.to);
      const activeState = activeByKey.get(nextNote.noteKey);
      const isFilled = filledNoteKeys.has(nextNote.noteKey);

      parts.push({
        kind: "note",
        text: skin?.label ?? resolveDisplayLabel(nextNote, options) ?? nextNote.text,
        inlineDuration,
        style: activeState
          ? buildFilledTokenStyle(
              color,
              getFillScale(
                options.isProgressiveFillEnabled ? activeState.progress : 100
              ),
              options.isPatternTextColoringEnabled,
              skin
            )
          : isFilled
            ? buildFilledTokenStyle(
                color,
                1,
                options.isPatternTextColoringEnabled,
                skin
              )
            : buildPassiveTokenStyle(color, options.isNoteColoringEnabled, skin),
        active: Boolean(activeState),
        begin: activeState?.begin,
        compact: false,
      });

      cursor = nextNote.to + (inlineDuration?.length ?? 0);
      continue;
    }

    if (content[cursor] === "~") {
      const inlineDuration = extractTrailingDuration(content, cursor + 1);
      parts.push({
        kind: "rest",
        text: "~",
        inlineDuration,
        compact: false,
      });
      cursor += 1 + (inlineDuration?.length ?? 0);
      continue;
    }

    let end = cursor + 1;
    while (end < closeBrace) {
      const upcomingNote = noteQueue[0];
      if ((upcomingNote && upcomingNote.from === end) || content[end] === "~") {
        break;
      }
      end++;
    }

    const punct = content.slice(cursor, end);
    if (punct) {
      parts.push({
        kind: "punct",
        text: punct,
      });
    }
    cursor = end;
  }

  return parts;
}

function isCompactChord(parts: GroupPartRender[]) {
  const meaningfulParts = parts.filter((part) => part.kind !== "punct");
  if (!meaningfulParts.length) {
    return false;
  }

  return meaningfulParts.every((part) => part.kind === "note") &&
    parts
      .filter((part): part is Extract<GroupPartRender, { kind: "punct" }> => part.kind === "punct")
      .every((part) => /^[,\s]+$/.test(part.text));
}

function collectActiveNotes(
  notes: NoteToken[],
  haps: HapLike[],
  atTime: NumericLike
) {
  const activeByKey = new Map<string, ActiveNoteState>();

  for (const note of notes) {
    for (const hap of haps) {
      if (!isTokenActive(note, hap) || !hap.whole) {
        continue;
      }

      const begin = hap.whole.begin.valueOf();
      const cycle = Math.floor(begin);
      const existing = activeByKey.get(note.noteKey);
      const nextState: ActiveNoteState = {
        noteKey: note.noteKey,
        cycle,
        progress: getProgressPercent(atTime, hap),
        begin,
      };

      if (
        !existing ||
        cycle > existing.cycle ||
        (cycle === existing.cycle && begin >= existing.begin)
      ) {
        activeByKey.set(note.noteKey, nextState);
      }
    }
  }

  if (!activeByKey.size) {
    return {
      cycle: null as number | null,
      activeByKey,
    };
  }

  const currentCycle = Math.max(...Array.from(activeByKey.values()).map((state) => state.cycle));
  const currentCycleEntries = new Map(
    Array.from(activeByKey.entries()).filter(([, state]) => state.cycle === currentCycle)
  );

  return {
    cycle: currentCycle,
    activeByKey: currentCycleEntries,
  };
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
    const classes = ["cm-live-strip-token"];

    if (this.token.kind === "rest") {
      classes.push("cm-live-strip-token--rest");
    }

    if (this.token.kind === "group") {
      classes.push("cm-live-strip-token--group");
    }

    if (this.token.isActive) {
      classes.push("cm-live-strip-token--active");
    }

    element.className = classes.join(" ");

    if (this.token.style) {
      element.setAttribute("style", this.token.style);
    }

    if (this.token.color) {
      element.setAttribute("data-strudel-note-color", this.token.color);
    }

    if (this.token.followRank != null) {
      element.setAttribute("data-follow-rank", String(this.token.followRank));
    }

    if (this.token.kind === "group") {
      element.appendChild(this.renderGroupBody());
    } else {
      const label = document.createElement("span");
      label.className = "cm-live-strip-token__label";
      label.textContent = this.token.label ?? "";
      element.appendChild(label);
    }

    if (this.token.duration) {
      const duration = document.createElement("span");
      duration.className = "cm-live-strip-token__duration";
      duration.textContent = this.token.duration;
      element.appendChild(duration);
    }

    return element;
  }

  private renderGroupBody() {
    const body = document.createElement("span");
    body.className = "cm-live-strip-token__group";

    const openBrace = document.createElement("span");
    openBrace.className = "cm-live-strip-token__brace";
    openBrace.textContent = "{";
    body.appendChild(openBrace);

    const inner = document.createElement("span");
    inner.className = `cm-live-strip-token__group-inner cm-live-strip-token__group-inner--${this.token.displayMode ?? "literal"}`;

    for (const part of this.token.parts ?? []) {
      inner.appendChild(renderGroupPart(part));
    }

    body.appendChild(inner);

    const closeBrace = document.createElement("span");
    closeBrace.className = "cm-live-strip-token__brace";
    closeBrace.textContent = "}";
    body.appendChild(closeBrace);

    return body;
  }

  ignoreEvent() {
    return false;
  }
}

function renderGroupPart(part: GroupPartRender) {
  if (part.kind === "punct") {
    const punct = document.createElement("span");
    punct.className = "cm-live-strip-part cm-live-strip-part--punct";
    punct.textContent = part.text;
    return punct;
  }

  const element = document.createElement("span");
  element.className =
    part.kind === "note"
      ? [
          "cm-live-strip-part",
          "cm-live-strip-part--note",
          part.active ? "cm-live-strip-part--active" : "",
          part.compact ? "cm-live-strip-part--compact" : "",
        ]
          .filter(Boolean)
          .join(" ")
      : [
          "cm-live-strip-part",
          "cm-live-strip-part--rest",
          part.compact ? "cm-live-strip-part--compact" : "",
        ]
          .filter(Boolean)
          .join(" ");

  if (part.kind === "note") {
    element.setAttribute("style", part.style);
  }

  const label = document.createElement("span");
  label.className =
    part.kind === "note"
      ? "cm-live-strip-part__label"
      : "cm-live-strip-part__rest-label";
  label.textContent = part.text;
  element.appendChild(label);

  if (part.inlineDuration) {
    const meta = document.createElement("span");
    meta.className = "cm-live-strip-part__meta";
    meta.textContent = part.inlineDuration;
    element.appendChild(meta);
  }

  return element;
}

function isTokenActive(token: NoteToken, hap: HapLike) {
  if (!hap.context?.locations?.length) {
    return false;
  }

  return hap.context.locations.some(
    ({ start, end }) => start < token.to && end > token.from
  );
}

function extractPatternSegments(
  content: string,
  bounds: { start: number; end: number } | null
) {
  if (!bounds) {
    return [];
  }

  const segments: PatternSegment[] = [];
  let cursor = bounds.start + 1;

  while (cursor < bounds.end) {
    if (/\s/.test(content[cursor])) {
      cursor++;
      continue;
    }

    if (content[cursor] === "{") {
      const from = cursor;
      let depth = 1;
      cursor++;

      while (cursor < bounds.end && depth > 0) {
        if (content[cursor] === "{") {
          depth++;
        } else if (content[cursor] === "}") {
          depth--;
        }
        cursor++;
      }

      const closeBrace = cursor - 1;
      const duration = extractTrailingDuration(content, closeBrace + 1);
      const to = closeBrace + 1 + (duration?.length ?? 0);
      segments.push({
        kind: "group",
        from,
        to,
        closeBrace,
      });
      cursor = to;
      continue;
    }

    const from = cursor;
    while (cursor < bounds.end && !/\s/.test(content[cursor])) {
      cursor++;
    }

    const text = content.slice(from, cursor);
    if (!text) {
      continue;
    }

    segments.push({
      kind: text.startsWith("~") ? "rest" : "note",
      from,
      to: cursor,
    });
  }

  return segments;
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
