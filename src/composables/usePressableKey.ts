import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  type Ref,
} from "vue";

export interface PressInputEvent {
  inputId: string;
  event: Event;
}

interface PressableKeyCallbacks {
  press(payload: PressInputEvent): void;
  release(payload: PressInputEvent): void;
}

interface PressableKeyOptions {
  disabled?: () => boolean;
  touchHoldDelayMs?: number;
  touchPanThresholdPx?: number;
  touchTapPulseMs?: number;
}

/** Shared multi-contact lifecycle used by melody Keys and Chord Keys. */
export function usePressableKey(
  element: Ref<HTMLButtonElement | null>,
  callbacks: PressableKeyCallbacks,
  options: PressableKeyOptions = {},
) {
  const activeInputIds = reactive(new Set<string>());
  const pulseTimeouts = new Map<string, number>();
  const pendingTouches = new Map<
    number,
    { startX: number; startY: number; timeoutId: number }
  >();
  const touchHoldDelayMs = options.touchHoldDelayMs ?? 0;
  const touchPanThresholdPx = options.touchPanThresholdPx ?? 8;
  const touchTapPulseMs = options.touchTapPulseMs ?? 120;
  const mouseInputId = "mouse";
  const touchInputId = (identifier: number) => `touch:${identifier}`;

  function beginInput(inputId: string, event: Event) {
    if (options.disabled?.() || activeInputIds.has(inputId)) return;
    activeInputIds.add(inputId);
    callbacks.press({ inputId, event });
  }

  function endInput(inputId: string, event: Event) {
    const timeoutId = pulseTimeouts.get(inputId);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      pulseTimeouts.delete(inputId);
    }
    if (!activeInputIds.delete(inputId)) return;
    callbacks.release({ inputId, event });
  }

  function pulseInput(inputId: string, event: Event, durationMs: number) {
    if (activeInputIds.has(inputId)) return;
    beginInput(inputId, event);
    pulseTimeouts.set(inputId, window.setTimeout(() => {
      endInput(inputId, event);
    }, durationMs));
  }

  function releaseAllInputs(event: Event) {
    for (const inputId of Array.from(activeInputIds)) {
      endInput(inputId, event);
    }
  }

  function cancelPendingTouch(identifier: number) {
    const pending = pendingTouches.get(identifier);
    if (!pending) return false;
    window.clearTimeout(pending.timeoutId);
    pendingTouches.delete(identifier);
    return true;
  }

  function cancelAllPendingTouches() {
    for (const identifier of Array.from(pendingTouches.keys())) {
      cancelPendingTouch(identifier);
    }
  }

  function handleMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    beginInput(mouseInputId, event);
  }

  function handleMouseUp(event: MouseEvent) {
    endInput(mouseInputId, event);
  }

  function handleMouseLeave(event: MouseEvent) {
    endInput(mouseInputId, event);
  }

  function isTouchWithinElement(touch: Touch, tolerance = 0) {
    if (!element.value) return false;
    const rect = element.value.getBoundingClientRect();
    return (
      touch.clientX >= rect.left - tolerance
      && touch.clientX <= rect.right + tolerance
      && touch.clientY >= rect.top - tolerance
      && touch.clientY <= rect.bottom + tolerance
    );
  }

  function handleTouchStart(event: TouchEvent) {
    for (const touch of Array.from(event.changedTouches)) {
      if (!isTouchWithinElement(touch)) continue;

      if (touchHoldDelayMs <= 0) {
        beginInput(touchInputId(touch.identifier), event);
        continue;
      }

      cancelPendingTouch(touch.identifier);
      const timeoutId = window.setTimeout(() => {
        pendingTouches.delete(touch.identifier);
        beginInput(touchInputId(touch.identifier), event);
      }, touchHoldDelayMs);
      pendingTouches.set(touch.identifier, {
        startX: touch.clientX,
        startY: touch.clientY,
        timeoutId,
      });
    }
  }

  function handleTouchMove(event: TouchEvent) {
    for (const touch of Array.from(event.touches)) {
      const inputId = touchInputId(touch.identifier);
      const pending = pendingTouches.get(touch.identifier);
      if (pending) {
        if (!isTouchWithinElement(touch)) {
          cancelPendingTouch(touch.identifier);
          continue;
        }
        const deltaX = Math.abs(touch.clientX - pending.startX);
        const deltaY = Math.abs(touch.clientY - pending.startY);
        if (deltaX >= touchPanThresholdPx && deltaX > deltaY) {
          cancelPendingTouch(touch.identifier);
        }
      }
      if (activeInputIds.has(inputId) && !isTouchWithinElement(touch, 5)) {
        endInput(inputId, event);
      }
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    for (const touch of Array.from(event.changedTouches)) {
      const inputId = touchInputId(touch.identifier);
      if (cancelPendingTouch(touch.identifier)) {
        pulseInput(inputId, event, touchTapPulseMs);
        continue;
      }
      endInput(inputId, event);
    }
  }

  function handleTouchCancel(event: TouchEvent) {
    for (const touch of Array.from(event.changedTouches)) {
      cancelPendingTouch(touch.identifier);
      endInput(touchInputId(touch.identifier), event);
    }
  }

  function handleVisibilityChange(event: Event) {
    if (document.visibilityState === "hidden") {
      cancelAllPendingTouches();
      releaseAllInputs(event);
    }
  }

  function handleWindowBlur(event: Event) {
    cancelAllPendingTouches();
    releaseAllInputs(event);
  }

  onMounted(() => {
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("blur", handleWindowBlur);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    cancelAllPendingTouches();
    releaseAllInputs(new Event("unmount"));
  });

  return {
    activeInputIds,
    isLocallyPressed: computed(() => activeInputIds.size > 0),
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    pulseInput,
    releaseAllInputs,
  };
}
