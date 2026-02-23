






















import { getLoggingConfig } from './config.js';
import type { FileLogLevel, LogContext } from './types.js';





let traceApi: typeof import('@opentelemetry/api').trace | undefined;

try {
	
	
	const otel = await import('@opentelemetry/api');
	traceApi = otel.trace;
} catch {
	
}





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
		
		return {};
	}
}





async function logInternal(
	level: FileLogLevel,
	message: string,
	context: LogContext = {},
): Promise<void> {
	const config = getLoggingConfig();

	
	if (level === 'debug' && config.nodeEnv === 'production') {
		return;
	}

	
	const traceContext = getTraceContext();

	
	const logEntry: Record<string, unknown> = {
		level,
		message,
		timestamp: Date.now(),
		
		...traceContext,
		
		component: context.component,
		action: context.action,
		
		user_id: context.userId,
		session_id: context.sessionId,
		request_id: context.requestId,
		
		...Object.fromEntries(
			Object.entries(context).filter(
				([key]) =>
					!['component', 'action', 'userId', 'sessionId', 'requestId'].includes(key),
			),
		),
	};

	
	if (config.writeLog) {
		await config.writeLog(logEntry);
	}

	
	if (config.nodeEnv === 'development') {
		const prefix = `[${level.toUpperCase()}]`;
		const componentTag = context.component ? `[${context.component}]` : '';
		console.log(`${prefix}${componentTag} ${message}`, context);
	}
}






















export const structuredLogger = {
	debug: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => {
		if (typeof messageOrContext === 'string') {
			
			const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
			return logInternal('debug', messageOrContext, context);
		}
		
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

	
	child: (context: LogContext) => createScopedLogger(context),
};




export const logger = structuredLogger;











export function createScopedLogger(defaultContext: LogContext) {
	
	
	
	
	const handleCall = (
		method: (ctx: LogContext, msg: string) => void,
		firstArg: LogContext | string,
		secondArg?: LogContext | string,
	) => {
		if (typeof firstArg === 'string') {
			
			const additionalContext = typeof secondArg === 'object' ? secondArg : {};
			return method({ ...defaultContext, ...additionalContext }, firstArg);
		}
		
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





export function _setTraceApi(api: typeof traceApi): void {
	traceApi = api;
}





export function _getTraceApi(): typeof traceApi {
	return traceApi;
}
