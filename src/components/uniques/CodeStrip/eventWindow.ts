import {
  computed,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
  ref,
  shallowRef,
  watch,
  type Ref,
} from "vue";

/** A line this short renders whole; windowing only pays on long takes. */
export const WINDOW_MIN_EVENTS = 48;
/** Events kept mounted around a pinned (sounding or newest) event. */
const PIN_RADIUS = 3;
/** Width assumed for a view not yet laid out. */
const FALLBACK_VIEW_PX = 400;
/** Width assumed for an event of a shape never measured. */
const FALLBACK_EVENT_PX = 48;

export type EventWindowItem =
  | { kind: "gap"; key: string; width: number }
  | { kind: "event"; index: number };

export interface EventWindowOptions {
  /** The scrolling element whose visible span decides what is mounted. */
  scroller: Ref<HTMLElement | null>;
  /** Per event: identity plus everything that changes its width. */
  keys: () => readonly string[];
  /** Per event: what it looks like, so a measured event sizes its unmounted kin. */
  shapes: () => readonly string[];
  /** Per event: takes no width at all. */
  hidden: () => readonly boolean[];
  /** Window only while this is true; otherwise every event is mounted. */
  enabled: () => boolean;
  /** Anything that resizes every event (density, duration mode, meter). */
  layoutKey: () => unknown;
  /** The view was moved by `delta` px to keep what is on screen in place. */
  onShift?: (delta: number) => void;
}

/**
 * Keeps only the events in and near the visible span of a horizontal line
 * mounted, standing in for the rest with gaps of their measured (or, unseen,
 * estimated) widths. The scroll extent and every mounted event's position are
 * therefore the same as with the whole line mounted.
 *
 * A pinned event (the one sounding, or the newest typed) is always mounted, so
 * the line can follow it before the view arrives there. When an estimate is
 * corrected by a measurement, the view moves by the same amount, so the events
 * on screen never jump.
 */
export function useEventWindow(options: EventWindowOptions) {
  const measured = new Map<string, number>();
  const shapeTotals = new Map<string, { sum: number; count: number }>();
  // Moves when a measurement lands, so gap widths are recomputed.
  const measureVersion = ref(0);
  const span = shallowRef<{ from: number; to: number }>({ from: 0, to: FALLBACK_VIEW_PX });
  const pinned = ref<number | null>(null);
  let marginPx: number | undefined;
  let observer: ResizeObserver | null = null;
  const observed = new Set<Element>();
  let spanFrame: number | null = null;
  let hostWidth = 0;

  function clearMeasurements() {
    measured.clear();
    shapeTotals.clear();
    marginPx = undefined;
    measureVersion.value++;
  }

  watch(options.layoutKey, clearMeasurements);

  function record(index: number, width: number) {
    const key = options.keys()[index];
    const shape = options.shapes()[index];
    if (key === undefined || shape === undefined || !(width > 0)) return false;
    const previous = measured.get(key);
    if (previous !== undefined && Math.abs(previous - width) < 0.25) return false;
    measured.set(key, width);
    const total = shapeTotals.get(shape) ?? { sum: 0, count: 0 };
    total.sum += width - (previous ?? 0);
    if (previous === undefined) total.count++;
    shapeTotals.set(shape, total);
    return true;
  }

  function outerWidth(element: HTMLElement, inner: number) {
    if (marginPx === undefined) {
      const style = getComputedStyle(element);
      const sum = (Number.parseFloat(style.marginLeft) || 0) + (Number.parseFloat(style.marginRight) || 0);
      marginPx = sum;
    }
    return inner + marginPx;
  }

  function indexOf(element: Element) {
    const value = (element as HTMLElement).dataset?.eventIndex;
    return value === undefined ? -1 : Number(value);
  }

  /** Each event's width: measured, else its shape's mean, else any event's mean. */
  const widths = computed(() => {
    void measureVersion.value;
    const keys = options.keys();
    const shapes = options.shapes();
    const hidden = options.hidden();
    let allSum = 0;
    let allCount = 0;
    for (const total of shapeTotals.values()) {
      allSum += total.sum;
      allCount += total.count;
    }
    const fallback = allCount ? allSum / allCount : FALLBACK_EVENT_PX;
    return keys.map((key, index) => {
      if (hidden[index]) return 0;
      const known = measured.get(key);
      if (known !== undefined) return known;
      const total = shapeTotals.get(shapes[index]);
      return total?.count ? total.sum / total.count : fallback;
    });
  });

  /** `offsets[i]` is where event i starts along the line; the last is its length. */
  const offsets = computed(() => {
    const list = widths.value;
    const result = new Float64Array(list.length + 1);
    for (let index = 0; index < list.length; index++) result[index + 1] = result[index] + list[index];
    return result;
  });

  /** The first event that ends after `x`. */
  function eventAt(x: number) {
    const starts = offsets.value;
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (starts[middle + 1] <= x) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  const ranges = computed(() => {
    const count = options.keys().length;
    if (!options.enabled() || count === 0) return count ? [[0, count - 1]] : [];
    const width = span.value.to - span.value.from;
    // One view either side, so a scroll or fling reveals mounted events.
    const first = eventAt(span.value.from - width);
    const last = Math.min(count - 1, eventAt(span.value.to + width));
    const list: [number, number][] = [[first, last]];
    if (pinned.value !== null) {
      const at = Math.min(count - 1, Math.max(0, pinned.value));
      list.push([Math.max(0, at - PIN_RADIUS), Math.min(count - 1, at + PIN_RADIUS)]);
    }
    list.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const range of list) {
      const previous = merged[merged.length - 1];
      if (previous && range[0] <= previous[1] + 1) previous[1] = Math.max(previous[1], range[1]);
      else merged.push([...range]);
    }
    return merged;
  });

  const items = computed<EventWindowItem[]>(() => {
    const count = options.keys().length;
    const starts = offsets.value;
    const result: EventWindowItem[] = [];
    let next = 0;
    ranges.value.forEach(([first, last], rangeIndex) => {
      if (first > next) result.push({ kind: "gap", key: `gap-${rangeIndex}`, width: starts[first] - starts[next] });
      for (let index = first; index <= last; index++) result.push({ kind: "event", index });
      next = last + 1;
    });
    if (next < count) result.push({ kind: "gap", key: "gap-end", width: starts[count] - starts[next] });
    return result;
  });

  // ─── The visible span ──────────────────────────────────────────────────────
  function readSpan() {
    const element = options.scroller.value;
    if (!element) return;
    const width = element.clientWidth || FALLBACK_VIEW_PX;
    const from = element.scrollLeft;
    if (span.value.from === from && span.value.to === from + width) return;
    span.value = { from, to: from + width };
  }

  /** Read the scroll position on the next frame, once per frame. */
  function onScroll() {
    if (spanFrame !== null) return;
    if (typeof requestAnimationFrame === "undefined") {
      readSpan();
      return;
    }
    spanFrame = requestAnimationFrame(() => {
      spanFrame = null;
      readSpan();
    });
  }

  // ─── Measurement ───────────────────────────────────────────────────────────
  function measureNow(elements: Iterable<Element>) {
    let changed = false;
    for (const element of elements) {
      const index = indexOf(element);
      if (index < 0 || !element.isConnected || options.hidden()[index]) continue;
      const inner = element.getBoundingClientRect().width;
      if (inner > 0) changed = record(index, outerWidth(element as HTMLElement, inner)) || changed;
    }
    if (changed) measureVersion.value++;
  }

  function onResize(entries: ResizeObserverEntry[]) {
    let changed = false;
    for (const entry of entries) {
      if (entry.target === options.scroller.value) {
        const width = entry.contentRect.width;
        // A new strip width rescales every glyph: remeasure from scratch.
        if (hostWidth && Math.abs(width - hostWidth) >= 1) clearMeasurements();
        hostWidth = width;
        readSpan();
        continue;
      }
      const index = indexOf(entry.target);
      if (index < 0 || !entry.target.isConnected || options.hidden()[index]) continue;
      const inner = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      if (inner > 0) changed = record(index, outerWidth(entry.target as HTMLElement, inner)) || changed;
    }
    if (changed) measureVersion.value++;
  }

  function mountedEvents() {
    return options.scroller.value?.querySelectorAll("[data-event-index]") ?? [];
  }

  function observeMounted() {
    const current = new Set<Element>(mountedEvents());
    if (!observer) {
      measureNow(current);
      return;
    }
    for (const element of observed) {
      if (!current.has(element)) {
        observer.unobserve(element);
        observed.delete(element);
      }
    }
    for (const element of current) {
      if (observed.has(element)) continue;
      observer.observe(element);
      observed.add(element);
    }
  }

  // ─── Keep what is on screen in place ───────────────────────────────────────
  let anchor: { index: number; left: number } | null = null;

  function captureAnchor() {
    anchor = null;
    const element = options.scroller.value;
    if (!element || !options.enabled() || element.scrollLeft <= 0) return;
    const viewLeft = element.getBoundingClientRect().left;
    for (const event of mountedEvents()) {
      const rect = event.getBoundingClientRect();
      if (rect.width > 0 && rect.right > viewLeft) {
        anchor = { index: indexOf(event), left: rect.left };
        return;
      }
    }
  }

  function restoreAnchor() {
    const element = options.scroller.value;
    const held = anchor;
    anchor = null;
    if (!element || !held) return;
    const event = element.querySelector(`[data-event-index="${held.index}"]`);
    if (!event) return;
    const delta = event.getBoundingClientRect().left - held.left;
    if (Math.abs(delta) < 0.5) return;
    element.scrollLeft += delta;
    options.onShift?.(delta);
    readSpan();
  }

  onBeforeUpdate(captureAnchor);
  onUpdated(() => {
    restoreAnchor();
    observeMounted();
  });

  onMounted(() => {
    observer = typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : null;
    if (options.scroller.value) observer?.observe(options.scroller.value);
    readSpan();
    observeMounted();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    observed.clear();
    if (spanFrame !== null) cancelAnimationFrame(spanFrame);
    spanFrame = null;
  });

  return {
    items,
    /** Keep the event at `index` mounted until another is pinned. */
    pin: (index: number | null) => { pinned.value = index; },
    onScroll,
  };
}
