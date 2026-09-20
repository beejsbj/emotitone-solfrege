import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";

const views: EditorView[] = [];
afterEach(() => {
  views.splice(0).forEach(view => view.destroy());
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});

function editor(editable = true) {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc: "C4 D4", extensions: [EditorView.editable.of(editable), EditorState.readOnly.of(!editable)] }),
  });
  views.push(view);
  // Instrument the actual native Selection read boundary, not a replacement view.
  const readSelection = vi.spyOn((view as any).observer, "readSelectionRange");
  return { view, readSelection };
}

describe("CodeMirror selection synchronization", () => {
  it("does not read native selection for a programmatic edit in a blurred editable view", () => {
    const { view, readSelection } = editor();
    expect(view.hasFocus).toBe(false);
    view.dispatch({ changes: { from: view.state.doc.length, insert: " E4" } });
    expect(view.state.doc.toString()).toBe("C4 D4 E4");
    expect(readSelection).not.toHaveBeenCalled();
  });

  it("still synchronizes selection for focused edits", () => {
    const { view, readSelection } = editor();
    view.focus();
    readSelection.mockClear();
    view.dispatch({ changes: { from: 0, insert: "F4 " }, selection: { anchor: 3 } });
    expect(readSelection).toHaveBeenCalled();
    expect(view.state.selection.main.anchor).toBe(3);
    expect(window.getSelection()?.anchorNode).not.toBeNull();
  });

  it("retains explicit pointer selection while blurred", () => {
    const { view, readSelection } = editor();
    view.dispatch({ selection: { anchor: 2 }, userEvent: "select.pointer" });
    expect(readSelection).toHaveBeenCalled();
    expect(window.getSelection()?.anchorOffset).toBe(2);
  });

  it("restores the mapped cursor when a changed blurred editor regains focus", () => {
    const { view } = editor();
    view.focus();
    view.dispatch({ selection: { anchor: 3 } });
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    view.dispatch({ changes: { from: 0, insert: "F4 " } });
    expect(view.state.selection.main.anchor).toBe(6);
    view.focus();
    expect(window.getSelection()?.anchorOffset).toBe(6);
    expect(window.getSelection()?.anchorNode?.textContent).toBe("F4 C4 D4");
  });

  it("retains native selection handling in a readonly noneditable view", () => {
    const { view, readSelection } = editor(false);
    const text = view.contentDOM.querySelector(".cm-line")!.firstChild!;
    window.getSelection()!.setBaseAndExtent(text, 0, text, 2);
    view.dispatch({ changes: { from: view.state.doc.length, insert: " E4" } });
    expect(readSelection).toHaveBeenCalled();
    expect(window.getSelection()?.anchorNode).not.toBeNull();
  });
});
