/**
 * Production-safe logging utility
 * Intelligently handles logging for development and production environments
 */

type LogLevel = 'dev' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV;

  dev(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  warn(...args: any[]): void {
    console.warn(...args);
  }

  error(...args: any[]): void {
    console.error(...args);
  }

  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  trace(...args: any[]): void {
    if (this.isDevelopment) {
      console.trace(...args);
    }
  }
}

class PerformanceLogger extends Logger {
  private lastLog = 0;
  private throttleMs = 100;

  throttled = {
    dev: (...args: any[]) => {
      const now = Date.now();
      if (now - this.lastLog > this.throttleMs) {
        this.dev(...args);
        this.lastLog = now;
      }
    },

    warn: (...args: any[]) => {
      const now = Date.now();
      if (now - this.lastLog > this.throttleMs) {
        this.warn(...args);
        this.lastLog = now;
      }
    },

    error: (...args: any[]) => {
      const now = Date.now();
      if (now - this.lastLog > this.throttleMs) {
        this.error(...args);
        this.lastLog = now;
      }
    }
  };
}

export const logger = new Logger();
export const performanceLogger = new PerformanceLogger();