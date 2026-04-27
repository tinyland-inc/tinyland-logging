import type { LogContext } from './types.js';
declare let traceApi: typeof import('@opentelemetry/api').trace | undefined;
export declare const structuredLogger: {
    debug: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    info: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    warn: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    error: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    child: (context: LogContext) => {
        debug: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
        info: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
        warn: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
        error: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
    };
};
export declare const logger: {
    debug: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    info: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    warn: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    error: (messageOrContext: LogContext | string, contextOrMessage?: LogContext | string) => Promise<void>;
    child: (context: LogContext) => {
        debug: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
        info: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
        warn: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
        error: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
    };
};
export declare function createScopedLogger(defaultContext: LogContext): {
    debug: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
    info: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
    warn: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
    error: (contextOrMessage: LogContext | string, contextOrMessageSecond?: LogContext | string) => void;
};
export declare function perf(context: LogContext): (additionalContext?: LogContext) => void;
export declare function _setTraceApi(api: typeof traceApi): void;
export declare function _getTraceApi(): typeof traceApi;
export {};
//# sourceMappingURL=logger-structured.d.ts.map