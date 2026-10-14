import { errorHandler } from '../errorHandler';
import { logger, PerformanceMonitor, reportConsoleError, reportConsoleLog } from '../logger';

afterEach(() => {
  jest.restoreAllMocks();
  PerformanceMonitor.clearMetrics();
});

it('forwards console arguments unchanged and resolves the error-handler import cycle', () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const detail = { problem: 'example' };
  reportConsoleError('failure', detail);
  reportConsoleLog('information', detail);
  expect(error).toHaveBeenCalledWith('failure', detail);
  expect(log).toHaveBeenCalledWith('information', detail);
  errorHandler.log(new Error('cycle works'), 'test');
  expect(error).toHaveBeenLastCalledWith('[ERROR]', expect.objectContaining({ context: 'test' }));
});

it('continues delegating logger errors to the shared error handler', () => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const logError = jest.spyOn(errorHandler, 'log').mockImplementation(() => undefined);
  logger.error('failure', 'test');
  expect(logError).toHaveBeenCalledWith(expect.objectContaining({ message: 'failure' }), 'test');
});

it('retains timer aggregation and clearing through the public monitor methods', () => {
  jest.spyOn(logger, 'debug').mockImplementation(() => undefined);
  jest
    .spyOn(performance, 'now')
    .mockReturnValueOnce(10)
    .mockReturnValueOnce(25)
    .mockReturnValueOnce(30)
    .mockReturnValueOnce(35);
  expect(PerformanceMonitor.getMetrics('operation')).toBeNull();
  PerformanceMonitor.startTimer('operation')();
  PerformanceMonitor.startTimer('operation')();
  expect(PerformanceMonitor.getMetrics('operation')).toEqual({
    avg: 10,
    min: 5,
    max: 15,
    count: 2,
  });
  expect(PerformanceMonitor.getAllMetrics()).toEqual({
    operation: { avg: 10, min: 5, max: 15, count: 2 },
  });
  PerformanceMonitor.clearMetrics();
  expect(PerformanceMonitor.getAllMetrics()).toEqual({});
});
