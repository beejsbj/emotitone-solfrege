import type { Directive, App } from "vue";
import { useTooltip, type TooltipOptions } from "@/composables/useTooltip";

// Global tooltip instance
const globalTooltip = useTooltip();

interface TooltipElement extends HTMLElement {
  _tooltipOptions?: TooltipOptions;
  _tooltipHandlers?: {
    touchstart: (e: TouchEvent) => void;
    touchmove: (e: TouchEvent) => void;
    touchend: (e: TouchEvent) => void;
  };
}

const createTouchHandlers = (
  element: TooltipElement,
  mode: "press" | "drag" = "press"
) => {
  const touchstart = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling while interacting

    // Get current content from stored options
    const options = element._tooltipOptions || { content: "" };
    const content = options.content;

    if (mode === "drag") {
      // Show immediately on drag mode
      globalTooltip.showTooltip(element, content, e, {
        ...options,
        showOnDrag: true,
      });
    } else {
      // Start long press timer for press mode
      globalTooltip.startLongPress(element, content, e, {
        ...options,
        showOnDrag: false,
      });
    }
  };

  const touchmove = (e: TouchEvent) => {
    e.preventDefault();

    if (mode === "drag" || globalTooltip.tooltipState.value.isVisible) {
      // Update tooltip position during drag
      globalTooltip.updateTouchPosition(e);

      // Update content if tooltip is visible
      if (globalTooltip.tooltipState.value.isVisible) {
        const options = element._tooltipOptions || { content: "" };
        const content = options.content;
        globalTooltip.tooltipState.value.content = content;
      }

      // Show tooltip if not already visible (for press mode)
      if (!globalTooltip.tooltipState.value.isVisible) {
        const options = element._tooltipOptions || { content: "" };
        const content = options.content;
        globalTooltip.showTooltip(element, content, e, {
          ...options,
          showOnDrag: mode === "drag",
        });
      }
    }
  };

  const touchend = (e: TouchEvent) => {
    // Cancel long press and hide tooltip
    globalTooltip.cancelLongPress();
    globalTooltip.hideTooltip();
  };

  return { touchstart, touchmove, touchend };
};

const bindTooltip = (
  element: TooltipElement,
  content: string,
  mode: "press" | "drag" = "press",
  options: Partial<TooltipOptions> = {}
) => {
  // Remove existing handlers
  if (element._tooltipHandlers) {
    element.removeEventListener(
      "touchstart",
      element._tooltipHandlers.touchstart
    );
    element.removeEventListener(
      "touchmove",
      element._tooltipHandlers.touchmove
    );
    element.removeEventListener("touchend", element._tooltipHandlers.touchend);
  }

  // Store options
  element._tooltipOptions = { content, ...options };

  // Create and bind new handlers
  const handlers = createTouchHandlers(element, mode);
  element._tooltipHandlers = handlers;

  // Add touch event listeners with passive: false to allow preventDefault
  element.addEventListener("touchstart", handlers.touchstart, {
    passive: false,
  });
  element.addEventListener("touchmove", handlers.touchmove, { passive: false });
  element.addEventListener("touchend", handlers.touchend, { passive: false });
};

const unbindTooltip = (element: TooltipElement) => {
  if (element._tooltipHandlers) {
    element.removeEventListener(
      "touchstart",
      element._tooltipHandlers.touchstart
    );
    element.removeEventListener(
      "touchmove",
      element._tooltipHandlers.touchmove
    );
    element.removeEventListener("touchend", element._tooltipHandlers.touchend);
  }
  delete element._tooltipHandlers;
  delete element._tooltipOptions;
};

// v-tooltip-press directive (long press to show)
export const vTooltipPress: Directive<TooltipElement, string | TooltipOptions> =
  {
    mounted(el, binding) {
      const content =
        typeof binding.value === "string"
          ? binding.value
          : binding.value.content;
      const options = typeof binding.value === "string" ? {} : binding.value;
      bindTooltip(el, content, "press", options);
    },

    updated(el, binding) {
      const content =
        typeof binding.value === "string"
          ? binding.value
          : binding.value.content;
      const options = typeof binding.value === "string" ? {} : binding.value;
      bindTooltip(el, content, "press", options);
    },

    unmounted(el) {
      unbindTooltip(el);
    },
  };

// v-tooltip-drag directive (shows on touch and follows drag)
export const vTooltipDrag: Directive<TooltipElement, string | TooltipOptions> =
  {
    mounted(el, binding) {
      const content =
        typeof binding.value === "string"
          ? binding.value
          : binding.value.content;
      const options = typeof binding.value === "string" ? {} : binding.value;
      bindTooltip(el, content, "drag", options);
    },

    updated(el, binding) {
      const content =
        typeof binding.value === "string"
          ? binding.value
          : binding.value.content;
      const options = typeof binding.value === "string" ? {} : binding.value;
      bindTooltip(el, content, "drag", options);
    },

    unmounted(el) {
      unbindTooltip(el);
    },
  };

// Legacy directives for backward compatibility (now use touch)
export const vTooltip = vTooltipPress;
export const vTooltipTrack = vTooltipDrag;

// Plugin to install all directives
export const tooltipPlugin = {
  install(app: App) {
    app.directive("tooltip", vTooltip);
    app.directive("tooltip-track", vTooltipTrack);
    app.directive("tooltip-press", vTooltipPress);
    app.directive("tooltip-drag", vTooltipDrag);
  },
};

// Export the global tooltip instance for the renderer component
export { globalTooltip };
