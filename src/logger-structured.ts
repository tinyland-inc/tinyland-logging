/**
 * Production-Ready Structured Logger
 *
 * TypeScript wrapper for structured logging compatible with Loki/Grafana.
 * Designed to replace console.log with proper structured logs.
 *
 * Features:
 * - Log levels: debug, info, warn, error
 * - Structured context (key-value pairs)
 * - Component-based tagging for Grafana labels
 * - Automatic trace correlation (trace_id, span_id from OpenTelemetry)
 * - Conditional compilation (no debug logs in production)
 * - Integration with file-based logging via DI config
 *
 * Architecture:
 * - Uses writeLog from DI config for file-based collection
 * - Adds OpenTelemetry trace context automatically (when available)
 * - Provides clean API for component-based logging
 * - Grafana-optimized JSON structure
 *
 * @module logger-structured
 */

import { getLoggingConfig } from './config.js';
import type { FileLogLevel, LogContext } from './types.js';

/**
 * Attempt to get the OpenTelemetry trace API.
 * Returns undefined if @opentelemetry/api is not installed.
 */
let traceApi: typeof import('@opentelemetry/api').trace | undefined;

try {
	// Dynamic import at module level to check if OTel is available
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const otel = await import('@opentelemetry/api');
	traceApi = otel.trace;
} catch {
	// @opentelemetry/api not available - trace context will be empty
}

/**
 * Extract trace context from OpenTelemetry active span
 * Returns trace_id and span_id for distributed tracing correlation
 */
function getTraceContext(): { trace_id?: string; span_id?: string } {
	try {
		if (!traceApi) {
			return {};
		}

		const activeSpan = traceApi.getActiveSpan();
		if (!activeSpan) {
			return {};
		}

		const spanContext = activeSpan.spanContext();
		return {
			trace_id: spanContext.traceId,
			span_id: spanContext.spanId,
		};
	} catch {
		// Graceful degradation if OTel not initialized
		return {};
	}
}

/**
 * Internal log implementation
 * Adds trace context and writes to file logger
 */
async function logInternal(
	level: FileLogLevel,
	message: string,
	context: LogContext = {},
): Promise<void> {
	const config = getLoggingConfig();

	// Skip debug logs in production (conditional compilation)
	if (level === 'debug' && config.nodeEnv === 'production') {
		return;
	}

	// Extract trace context for correlation
	const traceContext = getTraceContext();

	// Build structured log entry
	const logEntry: Record<string, unknown> = {
		level,
		message,
		timestamp: Date.now(),
		// Trace correlation
		...traceContext,
		// Component context (for Grafana labels)
		component: context.component,
		action: context.action,
		// User/session context
		user_id: context.userId,
		session_id: context.sessionId,
		request_id: context.requestId,
		// Additional context fields
		...Object.fromEntries(
			Object.entries(context).filter(
				([key]) =>
					!['component', 'action', 'userId', 'sessionId', 'requestId'].includes(key),
			),
		),
	};

	// Write to file logger (picked up by Alloy -> Loki) if configured
	if (config.writeLog) {
		await config.writeLog(logEntry);
	}

	// Also log to console in development for immediate feedback
	if (config.nodeEnv === 'development') {
		const prefix = `[${level.toUpperCase()}]`;
		const componentTag = context.component ? `[${context.component}]` : '';
		console.log(`${prefix}${componentTag} ${message}`, context);
	}
}

/**
 * Structured logger API
 *
 * @example
 * ```typescript
 * import { structuredLogger } from '@tummycrypt/tinyland-logging';
 *
 * // Simple logging
 * structuredLogger.info('Server started');
 *
 * // With component context
 * structuredLogger.info({ component: 'a11y', action: 'flush', count: 10 }, 'Flushed violations');
 *
 * // Error logging with trace context
 * structuredLogger.error({ component: 'trpc', error: err.message }, 'tRPC mutation failed');
 *
 * // Debug logging (auto-filtered in production)
 * structuredLogger.debug({ component: 'metrics', metric: 'CLS' }, 'Collecting Core Web Vitals');
 * ```
 */
// Supports both old API: logger.info('message', context) and new API: logger.info(context, 'message')
export const structuredLogger = {
	debug: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => {
		if (typeof messageOrContext === 'string') {
			// Old API: logger.debug('message', context) or logger.debug('message')
			const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
			return logInternal('debug', messageOrContext, context);
		}
		// New API: logger.debug(context, 'message')
		const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
		return logInternal('debug', message, messageOrContext);
	},

	info: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => {
		if (typeof messageOrContext === 'string') {
			const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
			return logInternal('info', messageOrContext, context);
		}
		const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
		return logInternal('info', message, messageOrContext);
	},

	warn: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => {
		if (typeof messageOrContext === 'string') {
			const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
			return logInternal('warn', messageOrContext, context);
		}
		const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
		return logInternal('warn', message, messageOrContext);
	},

	error: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => {
		if (typeof messageOrContext === 'string') {
			const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
			return logInternal('error', messageOrContext, context);
		}
		const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
		return logInternal('error', message, messageOrContext);
	},

	// Add child method for compatibility
	child: (context: LogContext) => createScopedLogger(context),
};

/**
 * Backward compatibility alias
 */
export const logger = structuredLogger;

/**
 * Create a scoped logger with default context
 * Useful for components that always log with the same component name
 *
 * @example
 * ```typescript
 * const a11yLogger = createScopedLogger({ component: 'a11y' });
 * a11yLogger.info({ action: 'flush', count: 10 }, 'Flushed violations');
 * ```
 */
export function createScopedLogger(defaultContext: LogContext) {
	// Helper to handle both APIs:
	// - Old API: logger.method('message', { context })
	// - New API: logger.method({ context }, 'message')
	// - Simple API: logger.method('message')
	const handleCall = (
		method: (ctx: LogContext, msg: string) => void,
		firstArg: LogContext | string,
		secondArg?: LogContext | string,
	) => {
		if (typeof firstArg === 'string') {
			// Old API: logger.method('message') or logger.method('message', { context })
			const additionalContext = typeof secondArg === 'object' ? secondArg : {};
			return method({ ...defaultContext, ...additionalContext }, firstArg);
		}
		// New API: logger.method({ context }, 'message')
		const message = typeof secondArg === 'string' ? secondArg : '';
		return method({ ...defaultContext, ...firstArg }, message);
	};

	return {
		debug: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) =>
			handleCall((ctx, msg) => structuredLogger.debug(ctx, msg), contextOrMessage, contextOrMessageSecond),
		info: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) =>
			handleCall((ctx, msg) => structuredLogger.info(ctx, msg), contextOrMessage, contextOrMessageSecond),
		warn: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) =>
			handleCall((ctx, msg) => structuredLogger.warn(ctx, msg), contextOrMessage, contextOrMessageSecond),
		error: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) =>
			handleCall((ctx, msg) => structuredLogger.error(ctx, msg), contextOrMessage, contextOrMessageSecond),
	};
}

/**
 * Performance logging helper
 * Logs operation duration with component/action context
 *
 * @example
 * ```typescript
 * const endTimer = perf({ component: 'geoip', action: 'lookup' });
 * const result = await performGeoIPLookup(ip);
 * endTimer({ success: true, city: result.city });
 * ```
 */
export function perf(context: LogContext): (additionalContext?: LogContext) => void {
	const startTime = Date.now();

	return (additionalContext: LogContext = {}) => {
		const duration = Date.now() - startTime;
		structuredLogger.info(
			{
				...context,
				...additionalContext,
				duration_ms: duration,
			},
			`Operation completed in ${duration}ms`,
		);
	};
}

/**
 * Override the OTel trace API (primarily useful for testing)
 * @internal
 */
export function _setTraceApi(api: typeof traceApi): void {
	traceApi = api;
}

/**
 * Get the current OTel trace API reference (primarily useful for testing)
 * @internal
 */
export function _getTraceApi(): typeof traceApi {
	return traceApi;
}
