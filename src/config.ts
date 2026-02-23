






















import type { LogEntry } from './types.js';




export interface LoggingLogger {
	info: (msg: string, meta?: Record<string, unknown>) => void;
	warn: (msg: string, meta?: Record<string, unknown>) => void;
	error: (msg: string, meta?: Record<string, unknown>) => void;
	debug: (msg: string, meta?: Record<string, unknown>) => void;
}




export interface WriteLogFn {
	(entry: Record<string, unknown>): Promise<void>;
}




export interface AuditLogFn {
	(action: string, userId: string, ipAddress: string, metadata?: Record<string, unknown>): Promise<void>;
}




export interface AuditLogReader {
	readLogs: (type: string, date: string, filter?: { userId?: string }) => Promise<LogEntry[]>;
	getAvailableDates: (type: string) => Promise<string[]>;
}




export interface LoggingConfig {
	
	writeLog?: WriteLogFn;
	
	auditLog?: AuditLogFn;
	
	auditLogReader?: AuditLogReader;
	
	lokiUrl?: string;
	
	lokiEnabled?: boolean;
	
	nodeEnv?: string;
	
	logsDir?: string;
}


const noopLogger: LoggingLogger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

let config: LoggingConfig = {};









export function configureLogging(c: LoggingConfig): void {
	config = { ...config, ...c };
}






export function getLoggingConfig(): LoggingConfig {
	return config;
}





export function resetLoggingConfig(): void {
	config = {};
}






export function getNoopLogger(): LoggingLogger {
	return noopLogger;
}
