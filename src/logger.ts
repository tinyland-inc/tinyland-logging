/**
 * Loki Push Logger
 *
 * Buffered batch logger that pushes structured logs to Grafana Loki.
 * Uses config injection for Loki URL and environment settings.
 *
 * Features:
 * - Buffered batch sending (flushes every second or on buffer threshold)
 * - Console logging for immediate feedback
 * - Graceful degradation when Loki is unavailable
 * - Process exit handler for final flush
 *
 * @module logger
 */

import { getLoggingConfig } from './config.js';
import type { LokiLogEntry } from './types.js';

/** Buffer for batching log entries */
let logBuffer: LokiLogEntry[] = [];

/** Timer handle for periodic flush */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Get the effective Loki URL from config
 */
function getLokiUrl(): string {
	return getLoggingConfig().lokiUrl ?? 'http://localhost:3100';
}

/**
 * Check if Loki is enabled based on config
 */
function isLokiEnabled(): boolean {
	const config = getLoggingConfig();
	if (config.lokiEnabled !== undefined) {
		return config.lokiEnabled;
	}
	return config.lokiUrl !== undefined && config.lokiUrl !== '';
}

/**
 * Get current node environment from config
 */
function getNodeEnv(): string {
	return getLoggingConfig().nodeEnv ?? 'development';
}

/**
 * Flush buffered logs to Loki
 */
export async function flushLogs(): Promise<void> {
	if (logBuffer.length === 0) return;

	const logsToSend = [...logBuffer];
	logBuffer = [];

	try {
		const streams = [
			{
				stream: {
					job: 'sveltekit',
					container: 'stonewall-sveltekit',
					environment: getNodeEnv(),
					compose_service: 'sveltekit',
				},
				values: logsToSend.map((log) => [
					(new Date(log.timestamp).getTime() * 1000000).toString(), // nanoseconds
					JSON.stringify({
						level: log.level,
						msg: log.message,
						...log.labels,
					}),
				]),
			},
		];

		await fetch(`${getLokiUrl()}/loki/api/v1/push`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ streams }),
		});
	} catch (err) {
		// Don't log errors about logging to avoid infinite loop
		console.error('Failed to send logs to Loki:', err);
	}
}

/**
 * Schedule a flush if one isn't already scheduled
 */
function scheduleFlush(): void {
	if (flushTimer) return;
	flushTimer = setTimeout(() => {
		flushTimer = null;
		flushLogs();
	}, 1000); // Flush every second
}

/**
 * Log a message with level, message, and optional labels
 *
 * @param level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param message - Log message
 * @param labels - Optional key-value labels for Loki
 */
export function log(level: string, message: string, labels: Record<string, string> = {}): void {
	const entry: LokiLogEntry = {
		level: level.toUpperCase(),
		message,
		timestamp: new Date().toISOString(),
		labels,
	};

	// Always log to console
	console.log(`[${entry.timestamp}] [${entry.level}] ${entry.message}`, labels);

	// Send to Loki if enabled
	if (isLokiEnabled()) {
		logBuffer.push(entry);
		scheduleFlush();
	}
}

/**
 * Convenience methods for common log levels
 */
export const lokiLogger = {
	debug: (message: string, labels?: Record<string, string>) => log('DEBUG', message, labels),
	info: (message: string, labels?: Record<string, string>) => log('INFO', message, labels),
	warn: (message: string, labels?: Record<string, string>) => log('WARN', message, labels),
	error: (message: string, labels?: Record<string, string>) => log('ERROR', message, labels),
};

/**
 * Get the current buffer length (useful for testing)
 * @internal
 */
export function _getBufferLength(): number {
	return logBuffer.length;
}

/**
 * Clear the buffer and any pending flush timer (useful for testing)
 * @internal
 */
export function _resetBuffer(): void {
	logBuffer = [];
	if (flushTimer) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}
}

/**
 * Get the current flush timer (useful for testing)
 * @internal
 */
export function _getFlushTimer(): ReturnType<typeof setTimeout> | null {
	return flushTimer;
}

// Flush logs on process exit
if (typeof process !== 'undefined') {
	process.on('exit', () => {
		flushLogs();
	});
}
