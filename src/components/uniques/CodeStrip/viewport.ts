import { ref } from "vue";
import type { NoteColorResolver } from "@/components/primatives/noteColorContext";
import { staticNoteColorResolver } from "@/components/primatives/noteColorContext";

interface WidgetBinding {
  colorResolver: NoteColorResolver | undefined;
  update: (draw: () => void) => void;
  destroy: () => void;
}

interface Registration {
  intersecting: boolean;
  setActive: (active: boolean) => void;
  binding: WidgetBinding;
}

/** One observer for all mounted widgets in an editor, including scroll clipping.
 * CodeMirror still owns document virtualization. No layout reads or frame loop
 * are needed to decide whether an individual mounted widget should do work.
 */
export class CodeStripViewport {
  readonly visibleCount = ref(0);
  private readonly registrations = new Map<HTMLElement, Registration>();
  private readonly observer: IntersectionObserver | null;
  private readonly motionQuery: MediaQueryList | undefined;
  private reducedMotion = false;
  private destroyed = false;

  constructor() {
    this.motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionQuery?.matches ?? false;
    this.motionQuery?.addEventListener?.("change", this.onMotionChange);
    document.addEventListener("visibilitychange", this.refresh);
    this.observer = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          const registration = this.registrations.get(entry.target as HTMLElement);
          if (!registration) continue;
          // isIntersecting is also true at edge adjacency (zero visible area).
          registration.intersecting = entry.isIntersecting &&
            entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
          this.refreshRegistration(registration);
        }
      }, { root: null, threshold: [0, 0.000001] })
      : null;
  }

  bind(
    root: HTMLElement,
    live?: NoteColorResolver,
    still: NoteColorResolver = staticNoteColorResolver,
  ): WidgetBinding {
    const existing = this.registrations.get(root);
    if (existing) return existing.binding;
    const active = ref(false);
    let visible = false;
    let mounted = false;
    let latestDraw: (() => void) | undefined;
    // Hidden Notes retain their configuration dependency but never read the
    // shared phase. A visible re-entry samples the current phase directly.
    const colorResolver: NoteColorResolver | undefined = live ? {
      getKeyBackground: (...args) => (active.value ? live : still).getKeyBackground(...args),
      getKeyBackgroundByPitchClass: (...args) =>
        (active.value ? live : still).getKeyBackgroundByPitchClass(...args),
    } : undefined;
    const binding: WidgetBinding = {
      colorResolver,
      update: draw => {
        latestDraw = draw;
        // The first render supplies intrinsic size for CodeMirror and IO.
        if (!mounted || visible) draw();
        mounted = true;
      },
      destroy: () => {
        if (!this.registrations.delete(root)) return;
        this.observer?.unobserve(root);
        if (visible) this.visibleCount.value--;
        visible = false;
        active.value = false;
        latestDraw = undefined;
      },
    };
    const registration: Registration = {
      intersecting: !this.observer,
      binding,
      setActive: next => {
        root.dataset.codeStripVisible = String(next);
        active.value = next && !this.reducedMotion;
        if (visible === next) return;
        this.visibleCount.value += next ? 1 : -1;
        visible = next;
        if (next) latestDraw?.();
      },
    };
    this.registrations.set(root, registration);
    this.refreshRegistration(registration);
    this.observer?.observe(root);
    return binding;
  }

  private refreshRegistration(registration: Registration) {
    registration.setActive(registration.intersecting && document.visibilityState !== "hidden");
  }

  get allowsMotion() {
    return !this.reducedMotion && document.visibilityState !== "hidden";
  }

  unbind(root: HTMLElement) {
    this.registrations.get(root)?.binding.destroy();
  }

  private refresh = () => {
    for (const registration of this.registrations.values()) this.refreshRegistration(registration);
  };

  private onMotionChange = (event: MediaQueryListEvent) => {
    this.reducedMotion = event.matches;
    this.refresh();
  };

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.observer?.disconnect();
    document.removeEventListener("visibilitychange", this.refresh);
    this.motionQuery?.removeEventListener?.("change", this.onMotionChange);
    for (const registration of [...this.registrations.values()]) registration.binding.destroy();
  }
}
