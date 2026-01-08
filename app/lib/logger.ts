// lib/logger.ts
import { useCallback, useEffect } from 'react';
import { errorHandler } from './errorHandler';

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
  metadata?: Record<string, any> | undefined;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>
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

  private async sendToLoggingService(entry: LogEntry) {
    try {
      // Example: Send to Sentry, LogRocket, or custom logging service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });

      // For now, just store in localStorage for debugging
      if (typeof window !== 'undefined') {
        const existingLogs = JSON.parse(localStorage.getItem('app_logs') || '[]');
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

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    if (this.isDevelopment) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata);
      this.log(entry);
    }
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata);
    this.log(entry);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata);
    this.log(entry);
  }

  error(message: string, context?: string, metadata?: Record<string, any>) {
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
  logUserAction(action: string, details?: Record<string, any>) {
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
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
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
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  static startTimer(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!PerformanceMonitor.metrics.has(name)) {
        PerformanceMonitor.metrics.set(name, []);
      }

      PerformanceMonitor.metrics.get(name)?.push(duration);

      logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`, 'performance');
    };
  }

  static getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const times = PerformanceMonitor.metrics.get(name);
    if (!times || times.length === 0) {
      return null;
    }

    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, count: times.length };
  }

  static getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [name] of PerformanceMonitor.metrics) {
      const metrics = PerformanceMonitor.getMetrics(name);
      if (metrics) {
        result[name] = metrics;
      }
    }

    return result;
  }

  static clearMetrics() {
    PerformanceMonitor.metrics.clear();
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    logger.logComponentLifecycle(componentName, 'mount');

    return () => {
      logger.logComponentLifecycle(componentName, 'unmount');
    };
  }, [componentName]);

  const measureOperation = useCallback(
    (operationName: string, fn: () => void) => {
      const endTimer = PerformanceMonitor.startTimer(`${componentName}-${operationName}`);
      fn();
      endTimer();
    },
    [componentName]
  );

  return { measureOperation };
}
