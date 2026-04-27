export declare function flushLogs(): Promise<void>;
export declare function log(level: string, message: string, labels?: Record<string, string>): void;
export declare const lokiLogger: {
    debug: (message: string, labels?: Record<string, string>) => void;
    info: (message: string, labels?: Record<string, string>) => void;
    warn: (message: string, labels?: Record<string, string>) => void;
    error: (message: string, labels?: Record<string, string>) => void;
};
export declare function _getBufferLength(): number;
export declare function _resetBuffer(): void;
export declare function _getFlushTimer(): ReturnType<typeof setTimeout> | null;
//# sourceMappingURL=logger.d.ts.map