import type { SelectionRange } from "@codemirror/state";
import {
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { h, render, type AppContext } from "vue";
import CodeStrip from "@/components/uniques/CodeStrip.vue";
import type {
  CodeStripDurationMode,
  CodeStripToken,
} from "@/components/uniques/CodeStrip.vue";

export interface CodeStripPresentation {
  tokens: CodeStripToken[];
  activeTokenIndex: number | null;
  durationMode?: CodeStripDurationMode;
  appContext?: AppContext;
}

type InlineMetaToken = {
  from: number;
  to: number;
};

const INLINE_META_REGEX = /(?:@(?:\d+(?:\.\d+)?)|:(?:\d+(?:\.\d+)?))/g;
const setEditorFocus = StateEffect.define<boolean>();
const setCodeStripPresentation = StateEffect.define<CodeStripPresentation>();

export function updateCodeStripPresentation(
  view: EditorView,
  presentation: CodeStripPresentation,
) {
  view.dispatch({ effects: setCodeStripPresentation.of(presentation) });
}

function extractInlineMetaTokens(doc: Text): InlineMetaToken[] {
  const tokens: InlineMetaToken[] = [];
  const content = doc.toString();

  for (const match of content.matchAll(INLINE_META_REGEX)) {
    const from = match.index;
    if (from == null) continue;
    tokens.push({ from, to: from + match[0].length });
  }

  return tokens;
}

function buildInlineMetaDecorations(
  tokens: InlineMetaToken[],
  selection: SelectionRange,
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
      }),
    );
  }

  return builder.finish();
}

const editorFocus = StateField.define<boolean>({
  create() {
    return false;
  },
  update(isFocused, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setEditorFocus)) return effect.value;
    }
    return isFocused;
  },
});

const codeStripPresentation = StateField.define<CodeStripPresentation>({
  create() {
    return {
      tokens: [],
      activeTokenIndex: null,
      durationMode: "stacked",
    };
  },
  update(presentation, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setCodeStripPresentation)) return effect.value;
    }
    return presentation;
  },
});

const focusTrackerHandlers = EditorView.domEventHandlers({
  focus: (_event, view) => {
    view.dispatch({ effects: setEditorFocus.of(true) });
    return false;
  },
  blur: (_event, view) => {
    view.dispatch({ effects: setEditorFocus.of(false) });
    return false;
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
      if (update.docChanged) {
        this.tokens = extractInlineMetaTokens(update.state.doc);
      }

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

const codeStripDecorations = EditorView.decorations.compute(
  [codeStripPresentation, editorFocus],
  (state) => {
    const presentation = state.field(codeStripPresentation);
    if (state.field(editorFocus) || !presentation.tokens.length || !state.doc.length) {
      return Decoration.none;
    }

    return Decoration.set([
      Decoration.replace({
        widget: new CodeStripMirrorWidget(presentation),
        block: true,
        inclusive: false,
      }).range(0, state.doc.length),
    ]);
  },
);

export const codeStripMirrorPresentationExtension = [
  focusTrackerHandlers,
  inlineMetaPlugin,
  editorFocus,
  codeStripPresentation,
  codeStripDecorations,
];

class CodeStripMirrorWidget extends WidgetType {
  constructor(private presentation: CodeStripPresentation) {
    super();
  }

  eq(other: CodeStripMirrorWidget) {
    return this.presentation.activeTokenIndex === other.presentation.activeTokenIndex &&
      this.presentation.durationMode === other.presentation.durationMode &&
      JSON.stringify(this.presentation.tokens) === JSON.stringify(other.presentation.tokens);
  }

  toDOM() {
    const root = document.createElement("div");
    root.className = "cm-code-strip-widget";
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
    if (this.presentation.activeTokenIndex == null) {
      delete root.dataset.activeTokenIndex;
    } else {
      root.dataset.activeTokenIndex = String(this.presentation.activeTokenIndex);
    }

    const vnode = h(CodeStrip, {
      tokens: this.presentation.tokens,
      durationMode: this.presentation.durationMode ?? "stacked",
      scrollable: true,
      ariaLabel: "Live Strudel pattern",
    });
    if (this.presentation.appContext) vnode.appContext = this.presentation.appContext;
    render(vnode, root);
  }
}
