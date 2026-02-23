import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	structuredLogger,
	logger,
	createScopedLogger,
	perf,
	_setTraceApi,
	configureLogging,
	resetLoggingConfig,
} from '../src/index.js';

describe('logger-structured', () => {
	let writeLogMock: ReturnType<typeof vi.fn>;
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		writeLogMock = vi.fn().mockResolvedValue(undefined);
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		resetLoggingConfig();
		_setTraceApi(undefined);
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		vi.restoreAllMocks();
	});

	describe('structuredLogger and logger are the same', () => {
		it('should export structuredLogger', () => {
			expect(structuredLogger).toBeDefined();
		});

		it('should export logger as an alias', () => {
			expect(logger).toBeDefined();
			expect(logger).toBe(structuredLogger);
		});

		it('should have debug method', () => {
			expect(typeof structuredLogger.debug).toBe('function');
		});

		it('should have info method', () => {
			expect(typeof structuredLogger.info).toBe('function');
		});

		it('should have warn method', () => {
			expect(typeof structuredLogger.warn).toBe('function');
		});

		it('should have error method', () => {
			expect(typeof structuredLogger.error).toBe('function');
		});

		it('should have child method', () => {
			expect(typeof structuredLogger.child).toBe('function');
		});
	});

	describe('log levels', () => {
		beforeEach(() => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'development' });
		});

		it('should log at debug level with old API', async () => {
			await structuredLogger.debug('debug message');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'debug', message: 'debug message' }),
			);
		});

		it('should log at info level with old API', async () => {
			await structuredLogger.info('info message');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'info', message: 'info message' }),
			);
		});

		it('should log at warn level with old API', async () => {
			await structuredLogger.warn('warn message');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'warn', message: 'warn message' }),
			);
		});

		it('should log at error level with old API', async () => {
			await structuredLogger.error('error message');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'error', message: 'error message' }),
			);
		});

		it('should log at debug level with new API (context first)', async () => {
			await structuredLogger.debug({ component: 'test' }, 'debug ctx');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'debug',
					message: 'debug ctx',
					component: 'test',
				}),
			);
		});

		it('should log at info level with new API (context first)', async () => {
			await structuredLogger.info({ component: 'svc' }, 'info ctx');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'info',
					message: 'info ctx',
					component: 'svc',
				}),
			);
		});

		it('should log at warn level with new API (context first)', async () => {
			await structuredLogger.warn({ component: 'svc' }, 'warn ctx');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'warn',
					message: 'warn ctx',
					component: 'svc',
				}),
			);
		});

		it('should log at error level with new API (context first)', async () => {
			await structuredLogger.error({ component: 'svc' }, 'error ctx');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'error',
					message: 'error ctx',
					component: 'svc',
				}),
			);
		});
	});

	describe('production debug filtering', () => {
		it('should skip debug logs in production', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'production' });
			await structuredLogger.debug('debug in prod');
			expect(writeLogMock).not.toHaveBeenCalled();
		});

		it('should allow info logs in production', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'production' });
			await structuredLogger.info('info in prod');
			expect(writeLogMock).toHaveBeenCalled();
		});

		it('should allow warn logs in production', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'production' });
			await structuredLogger.warn('warn in prod');
			expect(writeLogMock).toHaveBeenCalled();
		});

		it('should allow error logs in production', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'production' });
			await structuredLogger.error('error in prod');
			expect(writeLogMock).toHaveBeenCalled();
		});

		it('should allow debug logs in development', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'development' });
			await structuredLogger.debug('debug in dev');
			expect(writeLogMock).toHaveBeenCalled();
		});
	});

	describe('console output in development', () => {
		it('should log to console in development', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'development' });
			await structuredLogger.info('console test');
			expect(consoleSpy).toHaveBeenCalledWith(
				'[INFO] console test',
				expect.any(Object),
			);
		});

		it('should include component tag in console output', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'development' });
			await structuredLogger.info({ component: 'myComp' }, 'tagged msg');
			expect(consoleSpy).toHaveBeenCalledWith(
				'[INFO][myComp] tagged msg',
				expect.objectContaining({ component: 'myComp' }),
			);
		});

		it('should not log to console in production', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'production' });
			await structuredLogger.info('no console');
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it('should not log to console when nodeEnv is undefined', async () => {
			configureLogging({ writeLog: writeLogMock });
			await structuredLogger.info('no console when undefined');
			expect(consoleSpy).not.toHaveBeenCalled();
		});
	});

	describe('context merging', () => {
		beforeEach(() => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'test' });
		});

		it('should pass component to log entry', async () => {
			await structuredLogger.info({ component: 'auth' }, 'comp test');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ component: 'auth' }),
			);
		});

		it('should pass action to log entry', async () => {
			await structuredLogger.info({ action: 'login' }, 'action test');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'login' }),
			);
		});

		it('should map userId to user_id', async () => {
			await structuredLogger.info({ userId: 'u123' }, 'user test');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ user_id: 'u123' }),
			);
		});

		it('should map sessionId to session_id', async () => {
			await structuredLogger.info({ sessionId: 's456' }, 'session test');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ session_id: 's456' }),
			);
		});

		it('should map requestId to request_id', async () => {
			await structuredLogger.info({ requestId: 'r789' }, 'request test');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ request_id: 'r789' }),
			);
		});

		it('should include additional context fields', async () => {
			await structuredLogger.info({ custom: 'value', count: 42 }, 'extra fields');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ custom: 'value', count: 42 }),
			);
		});

		it('should include timestamp in log entry', async () => {
			await structuredLogger.info('timestamp test');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ timestamp: expect.any(Number) }),
			);
		});

		it('should handle old API with context as second argument', async () => {
			await structuredLogger.info('msg', { component: 'old-api' });
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'msg', component: 'old-api' }),
			);
		});
	});

	describe('trace context extraction', () => {
		beforeEach(() => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'test' });
		});

		it('should return empty trace context when OTel is not available', async () => {
			_setTraceApi(undefined);
			await structuredLogger.info('no trace');
			const logEntry = writeLogMock.mock.calls[0][0];
			expect(logEntry.trace_id).toBeUndefined();
			expect(logEntry.span_id).toBeUndefined();
		});

		it('should return empty trace context when no active span', async () => {
			const mockTrace = {
				getActiveSpan: vi.fn().mockReturnValue(null),
			} as any;
			_setTraceApi(mockTrace);
			await structuredLogger.info('no span');
			const logEntry = writeLogMock.mock.calls[0][0];
			expect(logEntry.trace_id).toBeUndefined();
			expect(logEntry.span_id).toBeUndefined();
		});

		it('should extract trace_id and span_id from active span', async () => {
			const mockSpan = {
				spanContext: () => ({
					traceId: 'abc123trace',
					spanId: 'def456span',
				}),
			};
			const mockTrace = {
				getActiveSpan: vi.fn().mockReturnValue(mockSpan),
			} as any;
			_setTraceApi(mockTrace);
			await structuredLogger.info('with trace');
			const logEntry = writeLogMock.mock.calls[0][0];
			expect(logEntry.trace_id).toBe('abc123trace');
			expect(logEntry.span_id).toBe('def456span');
		});

		it('should handle errors in trace context extraction gracefully', async () => {
			const mockTrace = {
				getActiveSpan: vi.fn().mockImplementation(() => {
					throw new Error('OTel not initialized');
				}),
			} as any;
			_setTraceApi(mockTrace);
			await structuredLogger.info('otel error');
			const logEntry = writeLogMock.mock.calls[0][0];
			expect(logEntry.trace_id).toBeUndefined();
			expect(logEntry.span_id).toBeUndefined();
		});
	});

	describe('dual API support', () => {
		beforeEach(() => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'test' });
		});

		it('should support old API: logger.info(message)', async () => {
			await structuredLogger.info('simple message');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'simple message', level: 'info' }),
			);
		});

		it('should support old API: logger.info(message, context)', async () => {
			await structuredLogger.info('msg with ctx', { component: 'test' });
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'msg with ctx', component: 'test' }),
			);
		});

		it('should support new API: logger.info(context, message)', async () => {
			await structuredLogger.info({ component: 'new' }, 'new api msg');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'new api msg', component: 'new' }),
			);
		});

		it('should support new API with only context (empty message)', async () => {
			await structuredLogger.info({ component: 'ctx-only' });
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ message: '', component: 'ctx-only' }),
			);
		});
	});

	describe('no writeLog configured', () => {
		it('should not throw when writeLog is not configured', async () => {
			resetLoggingConfig();
			await expect(structuredLogger.info('no writeLog')).resolves.not.toThrow();
		});

		it('should still log to console in development without writeLog', async () => {
			configureLogging({ nodeEnv: 'development' });
			await structuredLogger.info('console only');
			expect(consoleSpy).toHaveBeenCalled();
		});
	});

	describe('createScopedLogger', () => {
		beforeEach(() => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'test' });
		});

		it('should create a scoped logger with default context', async () => {
			const scoped = createScopedLogger({ component: 'auth' });
			await scoped.info('scoped message');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ component: 'auth', message: 'scoped message' }),
			);
		});

		it('should merge additional context in old API', async () => {
			const scoped = createScopedLogger({ component: 'auth' });
			await scoped.info('merge test', { action: 'login' });
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ component: 'auth', action: 'login' }),
			);
		});

		it('should merge additional context in new API', async () => {
			const scoped = createScopedLogger({ component: 'auth' });
			await scoped.info({ action: 'logout' }, 'new api merge');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ component: 'auth', action: 'logout' }),
			);
		});

		it('should support debug on scoped logger', async () => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'development' });
			const scoped = createScopedLogger({ component: 'dbg' });
			await scoped.debug('scoped debug');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'debug', component: 'dbg' }),
			);
		});

		it('should support warn on scoped logger', async () => {
			const scoped = createScopedLogger({ component: 'wrn' });
			await scoped.warn('scoped warn');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'warn', component: 'wrn' }),
			);
		});

		it('should support error on scoped logger', async () => {
			const scoped = createScopedLogger({ component: 'err' });
			await scoped.error('scoped error');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ level: 'error', component: 'err' }),
			);
		});

		it('should be creatable via logger.child()', async () => {
			const scoped = structuredLogger.child({ component: 'child-test' });
			await scoped.info('child message');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ component: 'child-test' }),
			);
		});

		it('should allow overriding default context in scoped logger', async () => {
			const scoped = createScopedLogger({ component: 'original' });
			await scoped.info({ component: 'overridden' }, 'override test');
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({ component: 'overridden' }),
			);
		});
	});

	describe('perf timer', () => {
		beforeEach(() => {
			configureLogging({ writeLog: writeLogMock, nodeEnv: 'test' });
		});

		it('should log operation duration', async () => {
			const endTimer = perf({ component: 'perf-test', action: 'lookup' });
			
			await new Promise((r) => setTimeout(r, 10));
			endTimer();
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({
					level: 'info',
					component: 'perf-test',
					action: 'lookup',
					duration_ms: expect.any(Number),
				}),
			);
		});

		it('should include additional context in perf timer end', async () => {
			const endTimer = perf({ component: 'perf-test' });
			endTimer({ success: true, city: 'Ithaca' });
			expect(writeLogMock).toHaveBeenCalledWith(
				expect.objectContaining({
					component: 'perf-test',
					success: true,
					city: 'Ithaca',
				}),
			);
		});

		it('should include duration message', async () => {
			const endTimer = perf({ component: 'timer' });
			endTimer();
			const logEntry = writeLogMock.mock.calls[0][0];
			expect(logEntry.message).toMatch(/^Operation completed in \d+ms$/);
		});

		it('should measure elapsed time', async () => {
			const endTimer = perf({ component: 'time-check' });
			await new Promise((r) => setTimeout(r, 50));
			endTimer();
			const logEntry = writeLogMock.mock.calls[0][0];
			expect(logEntry.duration_ms).toBeGreaterThanOrEqual(40);
		});
	});
});
