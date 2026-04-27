import { getLoggingConfig } from './config.js';
let traceApi;
try {
    const otel = await import('@opentelemetry/api');
    traceApi = otel.trace;
}
catch {
}
function getTraceContext() {
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
    }
    catch {
        return {};
    }
}
async function logInternal(level, message, context = {}) {
    const config = getLoggingConfig();
    if (level === 'debug' && config.nodeEnv === 'production') {
        return;
    }
    const traceContext = getTraceContext();
    const logEntry = {
        level,
        message,
        timestamp: Date.now(),
        ...traceContext,
        component: context.component,
        action: context.action,
        user_id: context.userId,
        session_id: context.sessionId,
        request_id: context.requestId,
        ...Object.fromEntries(Object.entries(context).filter(([key]) => !['component', 'action', 'userId', 'sessionId', 'requestId'].includes(key))),
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
    debug: (messageOrContext, contextOrMessage) => {
        if (typeof messageOrContext === 'string') {
            const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
            return logInternal('debug', messageOrContext, context);
        }
        const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
        return logInternal('debug', message, messageOrContext);
    },
    info: (messageOrContext, contextOrMessage) => {
        if (typeof messageOrContext === 'string') {
            const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
            return logInternal('info', messageOrContext, context);
        }
        const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
        return logInternal('info', message, messageOrContext);
    },
    warn: (messageOrContext, contextOrMessage) => {
        if (typeof messageOrContext === 'string') {
            const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
            return logInternal('warn', messageOrContext, context);
        }
        const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
        return logInternal('warn', message, messageOrContext);
    },
    error: (messageOrContext, contextOrMessage) => {
        if (typeof messageOrContext === 'string') {
            const context = typeof contextOrMessage === 'object' ? contextOrMessage : {};
            return logInternal('error', messageOrContext, context);
        }
        const message = typeof contextOrMessage === 'string' ? contextOrMessage : '';
        return logInternal('error', message, messageOrContext);
    },
    child: (context) => createScopedLogger(context),
};
export const logger = structuredLogger;
export function createScopedLogger(defaultContext) {
    const handleCall = (method, firstArg, secondArg) => {
        if (typeof firstArg === 'string') {
            const additionalContext = typeof secondArg === 'object' ? secondArg : {};
            return method({ ...defaultContext, ...additionalContext }, firstArg);
        }
        const message = typeof secondArg === 'string' ? secondArg : '';
        return method({ ...defaultContext, ...firstArg }, message);
    };
    return {
        debug: (contextOrMessage, contextOrMessageSecond) => handleCall((ctx, msg) => structuredLogger.debug(ctx, msg), contextOrMessage, contextOrMessageSecond),
        info: (contextOrMessage, contextOrMessageSecond) => handleCall((ctx, msg) => structuredLogger.info(ctx, msg), contextOrMessage, contextOrMessageSecond),
        warn: (contextOrMessage, contextOrMessageSecond) => handleCall((ctx, msg) => structuredLogger.warn(ctx, msg), contextOrMessage, contextOrMessageSecond),
        error: (contextOrMessage, contextOrMessageSecond) => handleCall((ctx, msg) => structuredLogger.error(ctx, msg), contextOrMessage, contextOrMessageSecond),
    };
}
export function perf(context) {
    const startTime = Date.now();
    return (additionalContext = {}) => {
        const duration = Date.now() - startTime;
        structuredLogger.info({
            ...context,
            ...additionalContext,
            duration_ms: duration,
        }, `Operation completed in ${duration}ms`);
    };
}
export function _setTraceApi(api) {
    traceApi = api;
}
export function _getTraceApi() {
    return traceApi;
}
