import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	lokiLogger,
	lokiLog,
	flushLogs,
	_getBufferLength,
	_resetBuffer,
	_getFlushTimer,
	configureLogging,
	resetLoggingConfig,
} from '../src/index.js';

describe('logger (Loki push logger)', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		resetLoggingConfig();
		_resetBuffer();
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		_resetBuffer();
	});

	describe('lokiLogger convenience methods', () => {
		it('should have debug method', () => {
			expect(typeof lokiLogger.debug).toBe('function');
		});

		it('should have info method', () => {
			expect(typeof lokiLogger.info).toBe('function');
		});

		it('should have warn method', () => {
			expect(typeof lokiLogger.warn).toBe('function');
		});

		it('should have error method', () => {
			expect(typeof lokiLogger.error).toBe('function');
		});
	});

	describe('console logging', () => {
		it('should always log to console', () => {
			lokiLog('INFO', 'test message');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[INFO] test message'),
				expect.any(Object),
			);
		});

		it('should log with timestamp', () => {
			lokiLog('INFO', 'timestamp test');
			const call = consoleSpy.mock.calls[0][0];
			
			expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
		});

		it('should uppercase the level', () => {
			lokiLog('debug', 'lower case');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[DEBUG]'),
				expect.any(Object),
			);
		});

		it('should include labels in console output', () => {
			lokiLog('INFO', 'labeled', { env: 'test' });
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.any(String),
				{ env: 'test' },
			);
		});

		it('should use debug convenience method', () => {
			lokiLogger.debug('debug msg');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[DEBUG] debug msg'),
				expect.any(Object),
			);
		});

		it('should use info convenience method', () => {
			lokiLogger.info('info msg');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[INFO] info msg'),
				expect.any(Object),
			);
		});

		it('should use warn convenience method', () => {
			lokiLogger.warn('warn msg');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[WARN] warn msg'),
				expect.any(Object),
			);
		});

		it('should use error convenience method', () => {
			lokiLogger.error('error msg');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[ERROR] error msg'),
				expect.any(Object),
			);
		});

		it('should handle labels in convenience methods', () => {
			lokiLogger.info('with labels', { service: 'api' });
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.any(String),
				{ service: 'api' },
			);
		});

		it('should handle undefined labels', () => {
			lokiLogger.info('no labels');
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Object),
			);
		});
	});

	describe('Loki disabled mode', () => {
		it('should not buffer when Loki is not configured', () => {
			lokiLog('INFO', 'no loki');
			expect(_getBufferLength()).toBe(0);
		});

		it('should not schedule flush when Loki is disabled', () => {
			lokiLog('INFO', 'no flush');
			expect(_getFlushTimer()).toBeNull();
		});

		it('should not buffer when lokiEnabled is explicitly false', () => {
			configureLogging({ lokiUrl: 'http://loki:3100', lokiEnabled: false });
			lokiLog('INFO', 'disabled');
			expect(_getBufferLength()).toBe(0);
		});
	});

	describe('Loki buffering', () => {
		beforeEach(() => {
			configureLogging({ lokiUrl: 'http://loki:3100', nodeEnv: 'test' });
		});

		it('should buffer logs when Loki is enabled', () => {
			lokiLog('INFO', 'buffered');
			expect(_getBufferLength()).toBe(1);
		});

		it('should buffer multiple logs', () => {
			lokiLog('INFO', 'msg1');
			lokiLog('WARN', 'msg2');
			lokiLog('ERROR', 'msg3');
			expect(_getBufferLength()).toBe(3);
		});

		it('should schedule a flush timer', () => {
			lokiLog('INFO', 'timer test');
			expect(_getFlushTimer()).not.toBeNull();
		});

		it('should not create multiple flush timers', () => {
			lokiLog('INFO', 'timer1');
			const timer1 = _getFlushTimer();
			lokiLog('INFO', 'timer2');
			const timer2 = _getFlushTimer();
			expect(timer1).toBe(timer2);
		});
	});

	describe('flushLogs', () => {
		beforeEach(() => {
			configureLogging({ lokiUrl: 'http://loki:3100', nodeEnv: 'test' });
		});

		it('should not call fetch when buffer is empty', async () => {
			await flushLogs();
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('should call fetch with Loki push API', async () => {
			lokiLog('INFO', 'flush test');
			await flushLogs();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://loki:3100/loki/api/v1/push',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}),
			);
		});

		it('should clear buffer after flush', async () => {
			lokiLog('INFO', 'clear test');
			expect(_getBufferLength()).toBe(1);
			await flushLogs();
			expect(_getBufferLength()).toBe(0);
		});

		it('should send proper stream labels', async () => {
			lokiLog('INFO', 'labels test');
			await flushLogs();
			const body = JSON.parse(fetchMock.mock.calls[0][1].body);
			expect(body.streams[0].stream).toEqual({
				job: 'sveltekit',
				container: 'stonewall-sveltekit',
				environment: 'test',
				compose_service: 'sveltekit',
			});
		});

		it('should send log values as nanosecond timestamps', async () => {
			lokiLog('INFO', 'nano test');
			await flushLogs();
			const body = JSON.parse(fetchMock.mock.calls[0][1].body);
			const [timestamp] = body.streams[0].values[0];
			
			expect(Number(timestamp)).toBeGreaterThan(1e15);
		});

		it('should include level and message in log values', async () => {
			lokiLog('WARN', 'value test', { key: 'val' });
			await flushLogs();
			const body = JSON.parse(fetchMock.mock.calls[0][1].body);
			const logContent = JSON.parse(body.streams[0].values[0][1]);
			expect(logContent.level).toBe('WARN');
			expect(logContent.msg).toBe('value test');
			expect(logContent.key).toBe('val');
		});

		it('should handle fetch errors gracefully', async () => {
			fetchMock.mockRejectedValue(new Error('Network error'));
			lokiLog('INFO', 'error test');
			await flushLogs();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to send logs to Loki:',
				expect.any(Error),
			);
		});

		it('should flush multiple buffered entries in one request', async () => {
			lokiLog('INFO', 'msg1');
			lokiLog('WARN', 'msg2');
			lokiLog('ERROR', 'msg3');
			await flushLogs();
			expect(fetchMock).toHaveBeenCalledTimes(1);
			const body = JSON.parse(fetchMock.mock.calls[0][1].body);
			expect(body.streams[0].values).toHaveLength(3);
		});
	});

	describe('flush on timer', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			configureLogging({ lokiUrl: 'http://loki:3100', nodeEnv: 'test' });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should flush after 1 second timer', async () => {
			lokiLog('INFO', 'timer flush');
			expect(_getBufferLength()).toBe(1);
			vi.advanceTimersByTime(1000);
			
			await vi.runAllTimersAsync();
			expect(fetchMock).toHaveBeenCalled();
		});

		it('should clear timer after flush', async () => {
			lokiLog('INFO', 'timer clear');
			vi.advanceTimersByTime(1000);
			await vi.runAllTimersAsync();
			expect(_getFlushTimer()).toBeNull();
		});
	});

	describe('_resetBuffer', () => {
		it('should clear buffer', () => {
			configureLogging({ lokiUrl: 'http://loki:3100' });
			lokiLog('INFO', 'reset test');
			expect(_getBufferLength()).toBe(1);
			_resetBuffer();
			expect(_getBufferLength()).toBe(0);
		});

		it('should clear flush timer', () => {
			configureLogging({ lokiUrl: 'http://loki:3100' });
			lokiLog('INFO', 'timer reset');
			expect(_getFlushTimer()).not.toBeNull();
			_resetBuffer();
			expect(_getFlushTimer()).toBeNull();
		});
	});

	describe('Loki URL configuration', () => {
		it('should use configured lokiUrl', async () => {
			configureLogging({ lokiUrl: 'http://custom-loki:3100' });
			lokiLog('INFO', 'custom url');
			await flushLogs();
			expect(fetchMock).toHaveBeenCalledWith(
				'http://custom-loki:3100/loki/api/v1/push',
				expect.any(Object),
			);
		});

		it('should enable Loki when lokiUrl is set', () => {
			configureLogging({ lokiUrl: 'http://loki:3100' });
			lokiLog('INFO', 'enabled');
			expect(_getBufferLength()).toBe(1);
		});

		it('should enable Loki when lokiEnabled is explicitly true', () => {
			configureLogging({ lokiUrl: 'http://loki:3100', lokiEnabled: true });
			lokiLog('INFO', 'explicit enable');
			expect(_getBufferLength()).toBe(1);
		});
	});
});
