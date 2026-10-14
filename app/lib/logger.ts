// lib/logger.ts
import { errorHandler } from './errorHandler';

export function reportConsoleError(...args: Parameters<typeof console.error>): void {
  console.error(...args);
}

export function reportConsoleWarn(...args: Parameters<typeof console.warn>): void {
  console.warn(...args);
}

export function reportConsoleLog(...args: Parameters<typeof console.log>): void {
  console.log(...args);
}

export function reportConsoleInfo(...args: Parameters<typeof console.info>): void {
  console.info(...args);
}

export function reportConsoleDebug(...args: Parameters<typeof console.debug>): void {
  console.debug(...args);
}

export function reportConsoleTime(...args: Parameters<typeof console.time>): void {
  console.time(...args);
}

export function reportConsoleTimeEnd(...args: Parameters<typeof console.timeEnd>): void {
  console.timeEnd(...args);
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string | undefined;
  userId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.getCurrentUserId(),
      metadata,
    };
  }

  private getCurrentUserId(): string | undefined {
    // In a real app, this would get the user ID from auth context
    // For now, return undefined
    return undefined;
  }

  private log(entry: LogEntry) {
    const logMessage = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;

    if (entry.context) {
      console.log(`${logMessage} (Context: ${entry.context})`);
    } else {
      console.log(logMessage);
    }

    if (entry.metadata) {
      console.log('Metadata:', entry.metadata);
    }

    // In production, send to logging service
    if (!this.isDevelopment) {
      this.sendToLoggingService(entry);
    }
  }

  private sendToLoggingService(entry: LogEntry): void {
    try {
      // Example: Send to Sentry, LogRocket, or custom logging service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });

      // For now, just store in localStorage for debugging
      if (typeof window !== 'undefined') {
        const existingLogs = JSON.parse(localStorage.getItem('app_logs') || '[]') as LogEntry[];
        existingLogs.push(entry);

        // Keep only last 1000 logs
        if (existingLogs.length > 1000) {
          existingLogs.splice(0, existingLogs.length - 1000);
        }

        localStorage.setItem('app_logs', JSON.stringify(existingLogs));
      }
    } catch (error) {
      console.error('Failed to send log to service:', error);
    }
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>) {
    if (this.isDevelopment) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata);
      this.log(entry);
    }
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata);
    this.log(entry);
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata);
    this.log(entry);
  }

  error(message: string, context?: string, metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata);
    this.log(entry);

    // Also send to error handler
    errorHandler.log(new Error(message), context);
  }

  // Performance logging
  time(label: string) {
    console.time(label);
    this.debug(`Timer started: ${label}`, 'performance');
  }

  timeEnd(label: string) {
    console.timeEnd(label);
    this.debug(`Timer ended: ${label}`, 'performance');
  }

  // User action logging
  logUserAction(action: string, details?: Record<string, unknown>) {
    this.info(`User action: ${action}`, 'user-action', {
      action,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  // API request logging
  logApiRequest(method: string, url: string, status?: number, duration?: number) {
    this.info(`API ${method} ${url}`, 'api-request', {
      method,
      url,
      status,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  // Component lifecycle logging
  logComponentLifecycle(componentName: string, lifecycle: 'mount' | 'unmount' | 'update') {
    this.debug(`Component ${lifecycle}: ${componentName}`, 'component-lifecycle');
  }

  // Get logs for debugging
  getLogs(): LogEntry[] {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('app_logs') || '[]') as LogEntry[];
    }
    return [];
  }

  // Clear logs
  clearLogs() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_logs');
    }
  }
}

export const logger = new Logger();

// Performance monitoring utilities
const performanceMetrics = new Map<string, number[]>();

export const PerformanceMonitor = {
  startTimer(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!performanceMetrics.has(name)) {
        performanceMetrics.set(name, []);
      }

      performanceMetrics.get(name)?.push(duration);

      logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`, 'performance');
    };
  },

  getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const times = performanceMetrics.get(name);
    if (!times || times.length === 0) {
      return null;
    }

    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, count: times.length };
  },

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [name] of performanceMetrics) {
      const metrics = PerformanceMonitor.getMetrics(name);
      if (metrics) {
        result[name] = metrics;
      }
    }

    return result;
  },

  clearMetrics() {
    performanceMetrics.clear();
  },
};
