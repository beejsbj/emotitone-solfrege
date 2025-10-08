/**
 * Keyboard Drawer Composable (simplified)
 * - No dragging or height logic
 * - Just open/close slide animation for the keys container
 */

import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
  type Ref,
} from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import useGSAP from "@/composables/useGSAP";

export function useKeyboardDrawer(targetRef: Ref<HTMLElement | null>) {
  const store = useKeyboardDrawerStore();

  // Useful for binding if needed
  const drawerTransform = computed(() =>
    store.drawer.isOpen ? "translateY(0%)" : "translateY(100%)"
  );

  let animateDrawer: ((immediate?: boolean) => void) | null = null;

  useGSAP(({ gsap }) => {
    if (!targetRef.value) return;

    gsap.set(targetRef.value, {
      y: store.drawer.isOpen ? "0%" : "100%",
      willChange: "transform",
    });

    animateDrawer = (immediate = false) => {
      if (!targetRef.value) return;
      const y = store.drawer.isOpen ? "0%" : "100%";
      if (immediate) {
        gsap.set(targetRef.value, { y });
      } else {
        gsap.to(targetRef.value, {
          y,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };
  });

  // Animate when isOpen changes
  watch(
    () => store.drawer.isOpen,
    () => nextTick(() => animateDrawer?.())
  );

  onMounted(() => {
    nextTick(() => animateDrawer?.(true));
  });

  // Public helpers
  const openDrawerAnimated = () => store.openDrawer();
  const closeDrawerAnimated = () => store.closeDrawer();
  const toggleDrawerAnimated = () => store.toggleDrawer();

  // Cleanup is handled by GSAP context automatically
  onUnmounted(() => {
    // No manual cleanup needed
  });

  return {
    store,
    drawerTransform,
    animateDrawer,
    openDrawerAnimated,
    closeDrawerAnimated,
    toggleDrawerAnimated,
  };
}
