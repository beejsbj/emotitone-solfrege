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

/** Shared multi-contact lifecycle used by melody Keys and Chord Keys. */
export function usePressableKey(
  element: Ref<HTMLButtonElement | null>,
  callbacks: PressableKeyCallbacks,
) {
  const activeInputIds = reactive(new Set<string>());
  const pulseTimeouts = new Map<string, number>();
  const mouseInputId = "mouse";
  const touchInputId = (identifier: number) => `touch:${identifier}`;

  function beginInput(inputId: string, event: Event) {
    if (activeInputIds.has(inputId)) return;
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
      if (isTouchWithinElement(touch)) {
        beginInput(touchInputId(touch.identifier), event);
      }
    }
  }

  function handleTouchMove(event: TouchEvent) {
    for (const touch of Array.from(event.touches)) {
      const inputId = touchInputId(touch.identifier);
      if (activeInputIds.has(inputId) && !isTouchWithinElement(touch, 5)) {
        endInput(inputId, event);
      }
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    for (const touch of Array.from(event.changedTouches)) {
      endInput(touchInputId(touch.identifier), event);
    }
  }

  function handleVisibilityChange(event: Event) {
    if (document.visibilityState === "hidden") releaseAllInputs(event);
  }

  onMounted(() => {
    window.addEventListener("blur", releaseAllInputs);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("blur", releaseAllInputs);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    handleTouchCancel: handleTouchEnd,
    pulseInput,
    releaseAllInputs,
  };
}
