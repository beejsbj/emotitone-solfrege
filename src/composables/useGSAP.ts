import { onMounted, onUnmounted } from "vue";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

/**
 * GSAP Plugin Registration
 *
 * Registers GSAP core and plugins for advanced animation capabilities.
 *
 * @features
 * - Registers GSAP core and plugins (DrawSVGPlugin, Draggable, InertiaPlugin)
 * - Ensures plugins are only registered once
 * - Provides type-safe access to GSAP and its plugins
 *
 * @dependencies
 * - gsap
 * - gsap/DrawSVGPlugin
 * - gsap/Draggable
 * - gsap/InertiaPlugin
 */

// Register all GSAP plugins here
// This runs once when the module is imported
const plugins = [DrawSVGPlugin, Draggable, InertiaPlugin];
gsap.registerPlugin(...plugins);

// Create a tuple type of all plugins for better type inference
type GSAPPlugins = typeof plugins;
type GSAPContext = gsap.Context | null;

// Improve type safety for the animation function
type GSAPTools = {
  gsap: typeof gsap;
  DrawSVGPlugin: typeof DrawSVGPlugin;
  Draggable: typeof Draggable;
  InertiaPlugin: typeof InertiaPlugin;
};

type AnimationFunction = (tools: GSAPTools) => void;

// Return type for better type inference
type UseGSAPReturn = GSAPTools & {
  getContext: () => GSAPContext;
};

/**
 * useGSAP
 *
 * A composable for managing GSAP animations within a Vue component lifecycle.
 * Provides automatic context management and cleanup.
 *
 * @param {AnimationFunction} animationFunction - Function to define GSAP animations
 * @returns {UseGSAPReturn} GSAP instance and context utilities
 *
 * @example
 * const { gsap } = useGSAP((gsap, DrawSVGPlugin) => {
 *   gsap.to('.element', {
 *     opacity: 0,
 *     duration: 1,
 *     onComplete: () => console.log('Animation complete')
 *   });
 * });
 *
 * @features
 * - Automatically sets up and cleans up GSAP context
 * - Provides GSAP and plugins to the animation function
 * - Reverts animations on component unmount
 * - Type-safe plugin access
 */
export default function useGSAP(
  animationFunction?: AnimationFunction
): UseGSAPReturn {
  let context: GSAPContext = null;

  onMounted(() => {
    try {
      // Create a new context and run the animation function
      context = gsap.context(() => {
        if (animationFunction) {
          // Pass gsap and all plugins as a single object
          animationFunction({ gsap, DrawSVGPlugin, Draggable, InertiaPlugin });
        }
      });

      if (import.meta.env.DEV) {
        console.log("[useGSAP] Context created", context);
      }
    } catch (error) {
      console.error("[useGSAP] Failed to create GSAP context:", error);
    }
  });

  onUnmounted(() => {
    try {
      if (context) {
        // Revert animations to their initial state
        context.revert();
        // Kill the context
        context.kill();

        if (import.meta.env.DEV) {
          console.log(
            "[useGSAP] Context killed and animations reverted",
            context
          );
        }
      }
    } catch (error) {
      console.error("[useGSAP] Failed to cleanup GSAP context:", error);
    }
  });

  return {
    gsap,
    DrawSVGPlugin,
    Draggable,
    InertiaPlugin,
    getContext: () => context,
  };
}

/**
 * USAGE EXAMPLES
 *
 * 1. Basic Usage - Simple Animation
 * ```ts
 * // Destructure just what you need
 * useGSAP(({ gsap }) => {
 *   gsap.to('.my-element', {
 *     x: 100,
 *     duration: 1
 *   });
 * });
 * ```
 *
 * 2. Using Plugins - DrawSVG
 * ```ts
 * useGSAP(({ gsap, DrawSVGPlugin }) => {
 *   gsap.to('svg path', {
 *     drawSVG: "0% 100%",
 *     duration: 2
 *   });
 * });
 * ```
 *
 * 3. Using Multiple Plugins - Draggable with Inertia
 * ```ts
 * useGSAP(({ Draggable, InertiaPlugin }) => {
 *   Draggable.create(".draggable", {
 *     type: "x,y",
 *     inertia: true
 *   });
 * });
 * ```
 *
 * 4. Using with Vue Refs
 * ```ts
 * const elementRef = ref<HTMLElement>();
 *
 * useGSAP(({ gsap }) => {
 *   gsap.to(elementRef.value!, {
 *     scale: 2,
 *     duration: 1
 *   });
 * });
 * ```
 *
 * 5. Complex Timeline Example
 * ```ts
 * const timeline = ref<gsap.core.Timeline>();
 *
 * useGSAP(({ gsap }) => {
 *   const tl = gsap.timeline({ repeat: -1 });
 *   tl.to('.element', { x: 100 })
 *     .to('.element', { y: 100 })
 *     .to('.element', { rotation: 360 });
 *
 *   timeline.value = tl;
 * });
 * ```
 *
 * WHY OBJECT DESTRUCTURING?
 * We use object destructuring because:
 * 1. It's cleaner - only grab what you need
 * 2. Better TypeScript inference
 * 3. More explicit about what tools you're using
 * 4. Follows modern JS/TS patterns
 * 5. Easier to read and maintain
 *
 * The composable automatically:
 * - Handles proper GSAP context creation
 * - Manages cleanup on component unmount
 * - Ensures plugins are registered
 * - Provides type safety
 */
