/**
 * Device Detection Utility
 * Provides functions to detect device type and capabilities
 */

/**
 * Check if the device is a touch device
 */
export const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Check if the device is likely a mobile device
 * Based on screen size and touch capability
 */
export const isMobileDevice = (): boolean => {
  const isMobileScreen = window.innerWidth <= 768; // Mobile breakpoint
  const hasTouch = isTouchDevice();
  
  // Mobile if small screen OR (touch device AND not a large screen)
  return isMobileScreen || (hasTouch && window.innerWidth <= 1024);
};

/**
 * Check if the device is likely a desktop device
 * Desktop = not mobile and has keyboard/mouse capability
 */
export const isDesktopDevice = (): boolean => {
  return !isMobileDevice();
};

/**
 * Check if the device has a physical keyboard
 * This is a best-guess based on device type and screen size
 */
export const hasPhysicalKeyboard = (): boolean => {
  // Desktop devices typically have physical keyboards
  // Large tablets in landscape might have keyboards too
  return isDesktopDevice() || (window.innerWidth >= 1024 && !isTouchDevice());
};

/**
 * Get device type as a string
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  const hasTouch = isTouchDevice();
  
  if (width <= 768) {
    return 'mobile';
  } else if (width <= 1024 && hasTouch) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

/**
 * Check if keyboard shortcuts should be shown
 * Show on desktop or when physical keyboard is likely present
 */
export const shouldShowKeyboardShortcuts = (): boolean => {
  return hasPhysicalKeyboard();
};
