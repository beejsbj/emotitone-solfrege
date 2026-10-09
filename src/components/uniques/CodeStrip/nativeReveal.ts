import { EditorView } from "@codemirror/view";

/** Dispatch after CodeMirror releases its measure/write update lock. */
export function createNativeCodeStripReveal(currentView: () => EditorView | undefined) {
  let pending: { view: EditorView; doc: EditorView["state"]["doc"]; position: number } | null = null;
  let queued = false;

  return {
    schedule(view: EditorView, position: number) {
      pending = { view, doc: view.state.doc, position };
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        const request = pending;
        pending = null;
        if (!request || currentView() !== request.view || request.view.state.doc !== request.doc) return;
        request.view.dispatch({
          effects: EditorView.scrollIntoView(request.position, { x: "center", y: "nearest" }),
        });
      });
    },
    // The owner cancels before teardown and whenever a newer measured follow
    // replaces an older request, including when no native reveal is needed.
    cancel() {
      pending = null;
    },
  };
}
