import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createNativeCodeStripReveal } from "@/components/uniques/CodeStrip/nativeReveal";

const views: EditorView[] = [];
function makeView() {
  const view = new EditorView({ state: EditorState.create({ doc: "C4 D4 E4 F4" }) });
  views.push(view);
  return view;
}
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  vi.restoreAllMocks();
});

describe("native CodeStrip reveal dispatch", () => {
  it("leaves the current write stack and coalesces to the latest target", async () => {
    const view = makeView();
    const dispatch = vi.spyOn(view, "dispatch");
    const scroll = vi.spyOn(EditorView, "scrollIntoView");
    const reveal = createNativeCodeStripReveal(() => view);
    reveal.schedule(view, 1);
    reveal.schedule(view, 7);
    expect(dispatch).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith(7, { x: "center", y: "nearest" });
  });

  it("drops a position from a replaced document", async () => {
    const view = makeView();
    const reveal = createNativeCodeStripReveal(() => view);
    reveal.schedule(view, 7);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "C4" } });
    const dispatch = vi.spyOn(view, "dispatch");
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("drops an old view after the owner replaces it", async () => {
    const view = makeView();
    let current = view;
    const reveal = createNativeCodeStripReveal(() => current);
    const dispatch = vi.spyOn(view, "dispatch");
    reveal.schedule(view, 7);
    current = makeView();
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("cancels before owner teardown without touching the destroyed view", async () => {
    const view = makeView();
    const reveal = createNativeCodeStripReveal(() => view);
    const dispatch = vi.spyOn(view, "dispatch");
    reveal.schedule(view, 7);
    reveal.cancel();
    view.destroy();
    views.splice(views.indexOf(view), 1);
    await Promise.resolve();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("accepts a new request after cancellation while the microtask is pending", async () => {
    const view = makeView();
    const reveal = createNativeCodeStripReveal(() => view);
    const scroll = vi.spyOn(EditorView, "scrollIntoView");
    reveal.schedule(view, 7);
    reveal.cancel();
    reveal.schedule(view, 1);
    await Promise.resolve();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith(1, { x: "center", y: "nearest" });
  });
});
