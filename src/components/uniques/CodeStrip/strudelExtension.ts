import type { SelectionRange, Text } from "@codemirror/state";
import {
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { showMiniLocations } from "@strudel/codemirror";
import { h, render, type AppContext } from "vue";
import { CHROMATIC_NOTES, getSolfegeNameForMode, normalizeScaleIndex } from "@/data";
import { getScaleDegreeIndexForPitchClass } from "@/services/musicColor";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import Sequence from "./Sequence.vue";
import type {
  CodeStripChordToken,
  CodeStripDensity,
  CodeStripDurationMode,
  CodeStripGlyph,
  CodeStripNote,
  CodeStripNoteToken,
  CodeStripToken,
} from "./types";

type NumericLike = number | { valueOf(): number };

type HapLike = {
  context?: { locations?: Array<{ start: number; end: number }> };
  whole?: { begin: NumericLike; duration: NumericLike };
};

type SourceRange = { start: number; end: number };

type ActiveSourceRange = SourceRange & {
  begin: number;
  progress: number;
};

type ParsedNote = {
  from: number;
  to: number;
  text: string;
  isRelative: boolean;
};

export type ParsedCodeStripEvent = {
  kind: "note" | "rest" | "group";
  from: number;
  to: number;
  duration?: string;
  notes: ParsedNote[];
  startWeight: number;
  endWeight: number;
};

export interface CodeStripPresentation {
  tokens: CodeStripToken[];
  durationMode?: CodeStripDurationMode;
  density?: CodeStripDensity;
  timeSignature?: string;
  showRests?: boolean;
  notation?: "solfege" | "note" | "degree";
  mode?: MusicalMode;
  musicKey?: ChromaticNote;
  surfaceStyle?: "colored" | "monochrome";
  keyBrightness?: number;
  keySaturation?: number;
  appContext?: AppContext;
}

type PlaybackState = {
  atTime: number;
  cycle: number;
  active: ActiveSourceRange[];
  played: SourceRange[];
};

type InlineMetaToken = { from: number; to: number };

const INLINE_META_REGEX = /(?:@(?:\d+(?:\.\d+)?)|:(?:\d+(?:\.\d+)?))/g;
const ABSOLUTE_NOTE_REGEX = /\b[a-gA-G](?:[#bsf]+)?-?\d+\b/g;
const RELATIVE_NOTE_REGEX = /(?<![@.\w])\d{1,2}(?=@|\b)/g;
const REST_CHARACTERS = new Set(["~", "-"]);
const NOTE_NAMES: CodeStripNote[] = ["do", "re", "mi", "fa", "sol", "la", "ti"];

const setEditorFocus = StateEffect.define<boolean>();
const setPresentation = StateEffect.define<CodeStripPresentation>();
const setTransportPlaying = StateEffect.define<boolean>();

const defaultPresentation: CodeStripPresentation = {
  tokens: [],
  durationMode: "stacked",
  density: "default",
  timeSignature: "4/4",
  showRests: true,
  notation: "solfege",
  mode: "major",
  musicKey: "C",
  surfaceStyle: "colored",
  keyBrightness: 1,
  keySaturation: 1,
};

const idlePlayback = (): PlaybackState => ({
  atTime: 0,
  cycle: -1,
  active: [],
  played: [],
});

export function updateCodeStripPresentation(
  view: EditorView,
  presentation: CodeStripPresentation,
) {
  view.dispatch({ effects: setPresentation.of(presentation) });
}

export function setCodeStripPlaying(view: EditorView, playing: boolean) {
  view.dispatch({ effects: setTransportPlaying.of(playing) });
}

const editorFocus = StateField.define<boolean>({
  create() {
    return false;
  },
  update(focused, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setEditorFocus)) return effect.value;
    }
    return focused;
  },
});

const transportPlaying = StateField.define<boolean>({
  create() {
    return false;
  },
  update(playing, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setTransportPlaying)) return effect.value;
    }
    return playing;
  },
});

const presentationState = StateField.define<CodeStripPresentation>({
  create() {
    return defaultPresentation;
  },
  update(presentation, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setPresentation)) {
        return { ...defaultPresentation, ...effect.value };
      }
    }
    return presentation;
  },
});

const playbackState = StateField.define<PlaybackState>({
  create() {
    return idlePlayback();
  },
  update(playback, transaction) {
    if (transaction.docChanged) return idlePlayback();

    for (const effect of transaction.effects) {
      if (effect.is(setTransportPlaying) && !effect.value) {
        playback = idlePlayback();
      }

      if (!effect.is(showMiniLocations)) continue;

      const atTime = numericValue(effect.value.atTime);
      const cycle = Math.floor(atTime);
      const active = collectLeafPlaybackRanges(
        effect.value.haps as HapLike[],
        getPatternBounds(transaction.state.doc.toString()),
        atTime,
      );
      const played = cycle === playback.cycle ? [...playback.played] : [];

      for (const range of active) {
        if (!played.some((candidate) => sameRange(candidate, range))) {
          played.push({ start: range.start, end: range.end });
        }
      }

      playback = { atTime, cycle, active, played };
    }

    return playback;
  },
});

const focusTracker = EditorView.domEventHandlers({
  focusin(_event, view) {
    view.dispatch({ effects: setEditorFocus.of(true) });
  },
  focusout(event, view) {
    if (!view.dom.contains(event.relatedTarget as Node | null)) {
      view.dispatch({ effects: setEditorFocus.of(false) });
    }
  },
});

const inlineMetaPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    tokens: InlineMetaToken[];

    constructor(view: EditorView) {
      this.tokens = extractInlineMetaTokens(view.state.doc);
      this.decorations = buildInlineMetaDecorations(
        this.tokens,
        view.state.selection.main,
      );
    }

    update(update: ViewUpdate) {
      if (update.docChanged) this.tokens = extractInlineMetaTokens(update.state.doc);
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildInlineMetaDecorations(
          this.tokens,
          update.state.selection.main,
        );
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const codeStripEventDecorations = EditorView.decorations.compute(
  [presentationState, editorFocus, transportPlaying, playbackState],
  (state) => {
    if (state.field(editorFocus) || !state.doc.length) return Decoration.none;

    const presentation = state.field(presentationState);
    const playing = state.field(transportPlaying);
    const playback = state.field(playbackState);
    const events = parseCodeStripEvents(state.doc);
    const semanticTokens = presentation.tokens.filter(isSemanticEvent);
    const builder = new RangeSetBuilder<Decoration>();

    events.forEach((event, index) => {
      if (event.kind === "rest" && presentation.showRests === false) {
        builder.add(
          event.from,
          event.to,
          Decoration.replace({ widget: new HiddenCodeStripEventWidget() }),
        );
        return;
      }

      const supplied = semanticTokens[index];
      const baseToken = compatibleToken(event, supplied)
        ? supplied
        : fallbackToken(event, presentation);
      const rendered = applyPlayback(baseToken, event, events, playing, playback);
      const active = isEventActive(event, events, playing, playback);
      const followRank = active ? activeFollowRank(event, playback) : undefined;

      builder.add(
        event.from,
        event.to,
        Decoration.replace({
          widget: new CodeStripEventWidget(
            rendered,
            presentation,
            active,
            followRank,
          ),
          inclusive: false,
        }),
      );
    });

    return builder.finish();
  },
);

export const codeStripStrudelExtension = [
  focusTracker,
  inlineMetaPlugin,
  editorFocus,
  transportPlaying,
  presentationState,
  playbackState,
  codeStripEventDecorations,
];

class CodeStripEventWidget extends WidgetType {
  constructor(
    private token: CodeStripToken,
    private presentation: CodeStripPresentation,
    private active: boolean,
    private followRank?: number,
  ) {
    super();
  }

  eq(other: CodeStripEventWidget) {
    return this.active === other.active &&
      this.followRank === other.followRank &&
      this.presentation.durationMode === other.presentation.durationMode &&
      this.presentation.density === other.presentation.density &&
      this.presentation.timeSignature === other.presentation.timeSignature &&
      JSON.stringify(this.token) === JSON.stringify(other.token);
  }

  toDOM() {
    const root = document.createElement("span");
    this.renderInto(root);
    return root;
  }

  updateDOM(root: HTMLElement) {
    this.renderInto(root);
    return true;
  }

  destroy(root: HTMLElement) {
    render(null, root);
  }

  ignoreEvent() {
    return false;
  }

  private renderInto(root: HTMLElement) {
    root.className = this.active
      ? "cm-code-strip-event cm-code-strip-event--active"
      : "cm-code-strip-event";
    if (this.followRank == null) delete root.dataset.followRank;
    else root.dataset.followRank = String(this.followRank);

    const vnode = h(Sequence, {
      tokens: [this.token],
      durationMode: this.presentation.durationMode ?? "stacked",
      density: this.presentation.density ?? "default",
      timeSignature: this.presentation.timeSignature ?? "4/4",
      showChevron: false,
      embedded: true,
      ariaLabel: eventAccessibleName(this.token),
    });
    if (this.presentation.appContext) vnode.appContext = this.presentation.appContext;
    render(vnode, root);
  }
}

class HiddenCodeStripEventWidget extends WidgetType {
  toDOM() {
    const root = document.createElement("span");
    root.className = "cm-code-strip-event cm-code-strip-event--hidden";
    root.setAttribute("aria-hidden", "true");
    return root;
  }
}

export function parseCodeStripEvents(doc: Text): ParsedCodeStripEvent[] {
  const content = doc.toString();
  const bounds = getPatternBounds(content);
  if (!bounds) return [];

  const events: ParsedCodeStripEvent[] = [];
  let cursor = bounds.start + 1;
  let weightCursor = 0;

  while (cursor < bounds.end) {
    if (/\s/.test(content[cursor]) || content[cursor] === "/") {
      cursor++;
      continue;
    }

    if (content[cursor] === "{") {
      const from = cursor;
      let depth = 1;
      cursor++;
      while (cursor < bounds.end && depth > 0) {
        if (content[cursor] === "{") depth++;
        else if (content[cursor] === "}") depth--;
        cursor++;
      }
      const duration = extractTrailingDuration(content, cursor);
      const to = cursor + (duration?.length ?? 0);
      const notes = extractNotes(content, from + 1, cursor - 1);
      const weight = durationWeight(duration);
      events.push({
        kind: "group",
        from,
        to,
        duration,
        notes,
        startWeight: weightCursor,
        endWeight: weightCursor + weight,
      });
      weightCursor += weight;
      cursor = to;
      continue;
    }

    const from = cursor;
    while (cursor < bounds.end && !/\s|\//.test(content[cursor])) cursor++;
    const raw = content.slice(from, cursor);
    if (!raw) continue;

    const duration = raw.match(/@(?:\d+(?:\.\d+)?)/)?.[0];
    const notes = extractNotes(content, from, cursor);
    const kind = REST_CHARACTERS.has(raw[0])
      ? "rest"
      : notes.length
        ? "note"
        : null;
    if (!kind) continue;

    const weight = durationWeight(duration);
    events.push({
      kind,
      from,
      to: cursor,
      duration,
      notes,
      startWeight: weightCursor,
      endWeight: weightCursor + weight,
    });
    weightCursor += weight;
  }

  return events;
}

export function serializeCodeStripTokens(tokens: CodeStripToken[]) {
  const body = tokens.map((token) => {
    if (token.type === "note") {
      return `${sourceNoteValue(token)}${token.duration ?? ""}`;
    }
    if (token.type === "rest") return `~${token.duration ?? ""}`;
    if (token.type === "chord") {
      const members = token.members.map((member) =>
        member.rawPitch ?? String(member.scaleIndex ?? 0),
      );
      return `{${members.join(", ")}}${token.duration ?? ""}`;
    }
    return token.text ?? ",";
  }).join(" ");

  return `\`< ${body} >\``;
}

export function applySpecimenPlayback(view: EditorView, tokens: CodeStripToken[]) {
  const events = parseCodeStripEvents(view.state.doc);
  const semantic = tokens.filter(isSemanticEvent);
  const haps: HapLike[] = [];
  let hasControlledProgress = false;

  events.forEach((event, eventIndex) => {
    const token = semantic[eventIndex];
    if (!token) return;

    if (token.type === "chord") {
      event.notes.forEach((note, memberIndex) => {
        const progress = token.members[memberIndex]?.progress ?? token.progress;
        if (progress == null) return;
        hasControlledProgress = true;
        if (progress > 0) haps.push(specimenHap(note, progress));
      });
      return;
    }

    if (token.progress == null) return;
    hasControlledProgress = true;
    if (token.progress > 0) haps.push(specimenHap(event, token.progress));
  });

  if (!hasControlledProgress) {
    setCodeStripPlaying(view, false);
    return;
  }

  view.dispatch({
    effects: [
      setTransportPlaying.of(true),
      showMiniLocations.of({ atTime: 1, haps }),
    ],
  });
}

function specimenHap(range: { from: number; to: number }, progress: number): HapLike {
  const clamped = clampProgress(progress);
  return {
    context: { locations: [{ start: range.from, end: range.to }] },
    whole: { begin: 1 - clamped, duration: 1 },
  };
}

function applyPlayback(
  token: CodeStripToken,
  event: ParsedCodeStripEvent,
  events: ParsedCodeStripEvent[],
  playing: boolean,
  playback: PlaybackState,
): CodeStripToken {
  if (token.type === "note") {
    return {
      ...token,
      progress: progressForRange(event.notes[0] ?? event, playing, playback),
    };
  }

  if (token.type === "rest") {
    const highlighted = hasPlaybackRange(event, playback);
    return {
      ...token,
      progress: highlighted
        ? progressForRange(event, playing, playback)
        : restProgress(event, events, playing, playback),
    };
  }

  if (token.type === "chord") {
    const remaining = [...event.notes];
    return {
      ...token,
      members: token.members.map((member, index) => {
        const note = takeMatchingSourceNote(remaining, member) ?? event.notes[index];
        return {
          ...member,
          progress: progressForRange(note ?? event, playing, playback),
        };
      }),
    };
  }

  return token;
}

function fallbackToken(
  event: ParsedCodeStripEvent,
  presentation: CodeStripPresentation,
): CodeStripToken {
  if (event.kind === "rest") {
    return { type: "rest", duration: event.duration };
  }

  if (event.kind === "group") {
    const members = event.notes.map((note, index): ChordMember => {
      const token = fallbackNoteToken(note, event.duration, presentation);
      return {
        id: `${note.from}:${note.to}`,
        syllable: token.syllable,
        degree: token.degree,
        rawPitch: token.rawPitch,
        scaleIndex: token.scaleIndex ?? index,
        octave: token.octave,
        mode: token.mode,
        musicKey: token.musicKey,
        surfaceStyle: token.surfaceStyle,
        accidental: token.isAccidental,
        keyBrightness: token.keyBrightness,
        keySaturation: token.keySaturation,
        voicingOrder: index,
        pressOrder: index,
      };
    });
    return {
      type: "chord",
      symbol: "",
      display: "notes",
      members,
      duration: event.duration,
      accessibleName: `Chord: ${members.map((member) => member.rawPitch).join(", ")}`,
    };
  }

  return fallbackNoteToken(event.notes[0], event.duration, presentation);
}

function fallbackNoteToken(
  note: ParsedNote,
  duration: string | undefined,
  presentation: CodeStripPresentation,
): CodeStripNoteToken {
  const mode = presentation.mode ?? "major";
  const musicKey = presentation.musicKey ?? "C";
  const parsed = parseSourceNote(note, mode, musicKey);
  const normalized = normalizeScaleIndex(mode, parsed.scaleIndex);
  const syllable = getSolfegeNameForMode(mode, normalized);
  const degree = String(normalized + 1);
  const glyph: CodeStripGlyph = presentation.notation === "note"
    ? "raw"
    : presentation.notation === "degree"
      ? "deg"
      : "syl";

  return {
    type: "note",
    note: NOTE_NAMES[positiveModulo(normalized, NOTE_NAMES.length)],
    text: glyph === "raw" ? parsed.rawPitch : glyph === "deg" ? degree : syllable,
    glyph,
    duration,
    syllable,
    degree,
    rawPitch: parsed.rawPitch,
    scaleIndex: normalized,
    octave: parsed.octave,
    mode,
    musicKey,
    surfaceStyle: presentation.surfaceStyle,
    isAccidental: /[#bsf]/i.test(note.text),
    keyBrightness: presentation.keyBrightness,
    keySaturation: presentation.keySaturation,
  };
}

function parseSourceNote(note: ParsedNote, mode: MusicalMode, key: ChromaticNote) {
  if (note.isRelative) {
    const scaleIndex = Number(note.text);
    return {
      rawPitch: note.text,
      scaleIndex: Number.isFinite(scaleIndex) ? scaleIndex : 0,
      octave: 4,
    };
  }

  const match = note.text.match(/^([A-Ga-g])([#bsf]*)(-?\d+)$/);
  const pitchClass = normalizePitchClass(match?.[1] ?? "C", match?.[2] ?? "");
  const scaleIndex = getScaleDegreeIndexForPitchClass(pitchClass, key, mode) ??
    positiveModulo(CHROMATIC_NOTES.indexOf(pitchClass), 7);
  return {
    rawPitch: note.text,
    scaleIndex,
    octave: Number(match?.[3] ?? 4),
  };
}

function normalizePitchClass(letter: string, accidental: string): ChromaticNote {
  const natural = CHROMATIC_NOTES.indexOf(letter.toUpperCase() as ChromaticNote);
  const offset = accidental.includes("#") || accidental.includes("s")
    ? 1
    : accidental.includes("b") || accidental.includes("f")
      ? -1
      : 0;
  return CHROMATIC_NOTES[positiveModulo(natural + offset, CHROMATIC_NOTES.length)];
}

function compatibleToken(
  event: ParsedCodeStripEvent,
  token: CodeStripToken | undefined,
): token is CodeStripToken {
  if (!token) return false;
  return (event.kind === "note" && token.type === "note") ||
    (event.kind === "rest" && token.type === "rest") ||
    (event.kind === "group" && token.type === "chord");
}

function isSemanticEvent(
  token: CodeStripToken,
): token is CodeStripNoteToken | CodeStripChordToken | Extract<CodeStripToken, { type: "rest" }> {
  return token.type === "note" || token.type === "chord" || token.type === "rest";
}

function extractNotes(content: string, from: number, to: number) {
  const notes: ParsedNote[] = [];
  const slice = content.slice(from, to);

  for (const match of slice.matchAll(ABSOLUTE_NOTE_REGEX)) {
    if (match.index == null) continue;
    notes.push({
      from: from + match.index,
      to: from + match.index + match[0].length,
      text: match[0],
      isRelative: false,
    });
  }

  for (const match of slice.matchAll(RELATIVE_NOTE_REGEX)) {
    if (match.index == null) continue;
    notes.push({
      from: from + match.index,
      to: from + match.index + match[0].length,
      text: match[0],
      isRelative: true,
    });
  }

  return notes.sort((left, right) => left.from - right.from);
}

function extractInlineMetaTokens(doc: Text): InlineMetaToken[] {
  const tokens: InlineMetaToken[] = [];
  const content = doc.toString();
  for (const match of content.matchAll(INLINE_META_REGEX)) {
    if (match.index == null) continue;
    tokens.push({ from: match.index, to: match.index + match[0].length });
  }
  return tokens;
}

function buildInlineMetaDecorations(
  tokens: InlineMetaToken[],
  selection: SelectionRange,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const token of tokens) {
    const selected = selection.empty
      ? selection.head >= token.from && selection.head <= token.to
      : selection.from < token.to && selection.to > token.from;
    builder.add(
      token.from,
      token.to,
      Decoration.mark({ class: selected ? "cm-inline-meta cm-inline-meta-active" : "cm-inline-meta" }),
    );
  }
  return builder.finish();
}

function collectLeafPlaybackRanges(
  haps: HapLike[],
  bounds: { start: number; end: number } | null,
  atTime: number,
) {
  const active: ActiveSourceRange[] = [];
  if (!bounds) return active;

  for (const hap of haps) {
    if (!hap.context?.locations?.length || !hap.whole) continue;
    const candidates = hap.context.locations.filter(
      (location) => location.start < bounds.end && location.end > bounds.start,
    );
    if (!candidates.length) continue;
    const narrowest = Math.min(...candidates.map((location) => location.end - location.start));
    const begin = numericValue(hap.whole.begin);
    const duration = numericValue(hap.whole.duration);
    const progress = duration > 0
      ? clampProgress((atTime - begin) / duration)
      : 1;

    for (const location of candidates.filter(
      (candidate) => candidate.end - candidate.start === narrowest,
    )) {
      active.push({ ...location, begin, progress });
    }
  }

  return active;
}

function progressForRange(
  range: { from: number; to: number },
  playing: boolean,
  playback: PlaybackState,
) {
  if (!playing) return 1;
  const active = playback.active
    .filter((candidate) => overlaps(range, candidate))
    .sort((left, right) => (left.end - left.start) - (right.end - right.start));
  if (active.length) return Math.max(...active.map((candidate) => candidate.progress));
  return playback.played.some((candidate) => overlaps(range, candidate)) ? 1 : 0;
}

function restProgress(
  event: ParsedCodeStripEvent,
  events: ParsedCodeStripEvent[],
  playing: boolean,
  playback: PlaybackState,
) {
  if (!playing) return 1;
  const total = events[events.length - 1]?.endWeight ?? 0;
  if (total <= 0) return 0;
  const position = positiveModulo(playback.atTime, 1) * total;
  if (position <= event.startWeight) return 0;
  if (position >= event.endWeight) return 1;
  return (position - event.startWeight) /
    Math.max(Number.EPSILON, event.endWeight - event.startWeight);
}

function isEventActive(
  event: ParsedCodeStripEvent,
  events: ParsedCodeStripEvent[],
  playing: boolean,
  playback: PlaybackState,
) {
  if (!playing) return false;
  if (hasActiveRange(event, playback)) return true;
  if (event.kind !== "rest") return false;
  const total = events[events.length - 1]?.endWeight ?? 0;
  const position = positiveModulo(playback.atTime, 1) * total;
  return position >= event.startWeight && position < event.endWeight;
}

function activeFollowRank(event: ParsedCodeStripEvent, playback: PlaybackState) {
  const begins = playback.active
    .filter((candidate) => overlaps(event, candidate))
    .map((candidate) => candidate.begin);
  return begins.length ? Math.max(...begins) : playback.atTime;
}

function hasActiveRange(range: { from: number; to: number }, playback: PlaybackState) {
  return playback.active.some((candidate) => overlaps(range, candidate));
}

function hasPlaybackRange(range: { from: number; to: number }, playback: PlaybackState) {
  return hasActiveRange(range, playback) ||
    playback.played.some((candidate) => overlaps(range, candidate));
}

function takeMatchingSourceNote(notes: ParsedNote[], member: ChordMember) {
  let index = notes.findIndex((note) => {
    if (!note.isRelative && member.rawPitch) {
      return note.text.toLowerCase() === member.rawPitch.toLowerCase();
    }
    return note.isRelative && Number(note.text) === member.scaleIndex;
  });
  if (index < 0) index = 0;
  return notes.splice(index, 1)[0];
}

function getPatternBounds(content: string) {
  const start = content.indexOf("<");
  if (start < 0) return null;
  const end = content.indexOf(">", start + 1);
  return end < 0 ? null : { start, end };
}

function extractTrailingDuration(content: string, start: number) {
  return content.slice(start).match(/^@(?:\d+(?:\.\d+)?)/)?.[0];
}

function durationWeight(duration: string | undefined) {
  const parsed = Number.parseFloat((duration ?? "").replace(/^@/, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function sourceNoteValue(token: CodeStripNoteToken) {
  if (token.glyph === "raw" && token.rawPitch) return token.rawPitch;
  if (token.rawPitch && /^[A-Ga-g]/.test(token.rawPitch)) return token.rawPitch;
  return String(token.scaleIndex ?? NOTE_NAMES.indexOf(token.note));
}

function eventAccessibleName(token: CodeStripToken) {
  if (token.type === "note") return `Code note ${token.text}`;
  if (token.type === "chord") return token.accessibleName ?? `Code chord ${token.symbol}`;
  if (token.type === "rest") return "Code rest";
  return "Code punctuation";
}

function numericValue(value: NumericLike) {
  const numeric = Number(value?.valueOf?.() ?? value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampProgress(progress: number) {
  return Math.min(1, Math.max(0, progress));
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function overlaps(
  left: { from: number; to: number },
  right: SourceRange,
) {
  return left.from < right.end && left.to > right.start;
}

function sameRange(left: SourceRange, right: SourceRange) {
  return left.start === right.start && left.end === right.end;
}
