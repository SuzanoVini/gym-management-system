'use client';

import { useCallback, useEffect } from 'react';
import { logger, PerformanceMonitor } from '@/lib/logger';

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
