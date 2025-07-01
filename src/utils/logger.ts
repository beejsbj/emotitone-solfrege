/**
 * Logging utility for development vs production environments
 * Removes console statements in production for better performance
 */

interface Logger {
  dev: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

// @ts-ignore - Vite provides import.meta.env
const isDev = import.meta.env?.DEV || false;

export const logger: Logger = {
  dev: isDev ? console.log : () => {},
  warn: isDev ? console.warn : () => {},
  error: console.error, // Always log errors
  info: isDev ? console.info : () => {},
  debug: isDev ? console.debug : () => {},
};

/**
 * Performance-aware logger for hot paths (animations, audio)
 * Only logs in development and with reduced frequency
 */
export const performanceLogger = {
  _lastLog: 0,
  _logInterval: 1000, // Log at most once per second

  throttled: (...args: any[]) => {
    if (!isDev) return;
    const now = Date.now();
    if (now - performanceLogger._lastLog > performanceLogger._logInterval) {
      console.log(...args);
      performanceLogger._lastLog = now;
    }
  },

  frame: (...args: any[]) => {
    if (!isDev) return;
    // Only log every 60th frame (once per second at 60fps)
    if (performance.now() % 1000 < 16.67) {
      console.log(...args);
    }
  },
};