/**
 * Configuration injection for tinyland-logging
 *
 * Provides a way to inject external dependencies (writeLog, logAudit, audit log reader,
 * Loki connection details) without coupling to specific implementations.
 *
 * All config values are optional - sensible no-op defaults are used when
 * no configuration is provided.
 *
 * @module config
 *
 * @example
 * ```typescript
 * import { configureLogging } from '@tinyland-inc/tinyland-logging';
 *
 * configureLogging({
 *   writeLog: myWriteLogFn,
 *   lokiUrl: 'http://loki:3100',
 *   nodeEnv: 'production',
 * });
 * ```
 */

import type { LogEntry } from './types.js';

/**
 * Logger interface for structured logging
 */
export interface LoggingLogger {
	info: (msg: string, meta?: Record<string, unknown>) => void;
	warn: (msg: string, meta?: Record<string, unknown>) => void;
	error: (msg: string, meta?: Record<string, unknown>) => void;
	debug: (msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Function signature for writing structured log entries
 */
export interface WriteLogFn {
	(entry: Record<string, unknown>): Promise<void>;
}

/**
 * Function signature for writing audit log entries
 */
export interface AuditLogFn {
	(action: string, userId: string, ipAddress: string, metadata?: Record<string, unknown>): Promise<void>;
}

/**
 * Interface for reading audit logs from the underlying storage
 */
export interface AuditLogReader {
	readLogs: (type: string, date: string, filter?: { userId?: string }) => Promise<LogEntry[]>;
	getAvailableDates: (type: string) => Promise<string[]>;
}

/**
 * Configuration options for tinyland-logging
 */
export interface LoggingConfig {
	/** Function to write structured log entries to file. If not provided, logs go to console only. */
	writeLog?: WriteLogFn;
	/** Function to write audit log entries. */
	auditLog?: AuditLogFn;
	/** Audit log reader for querying stored logs. */
	auditLogReader?: AuditLogReader;
	/** Loki push URL. If not provided, Loki push is disabled. */
	lokiUrl?: string;
	/** Whether Loki is enabled. Defaults to true if lokiUrl is set. */
	lokiEnabled?: boolean;
	/** Node environment string (e.g., 'production', 'development'). */
	nodeEnv?: string;
	/** Base directory for flat-file logs. Defaults to process.cwd(). */
	logsDir?: string;
}

/** Silent no-op logger used when no logger is configured */
const noopLogger: LoggingLogger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

let config: LoggingConfig = {};

/**
 * Configure logging with external dependencies.
 *
 * Call this once at application startup before using any logging functions.
 * Merges with existing configuration (does not replace).
 *
 * @param c - Configuration options to merge
 */
export function configureLogging(c: LoggingConfig): void {
	config = { ...config, ...c };
}

/**
 * Get current configuration.
 *
 * @returns Current merged configuration
 */
export function getLoggingConfig(): LoggingConfig {
	return config;
}

/**
 * Reset all configuration to empty defaults.
 * Primarily useful for testing.
 */
export function resetLoggingConfig(): void {
	config = {};
}

/**
 * Get a no-op logger instance (useful as a fallback).
 *
 * @returns Silent no-op logger
 */
export function getNoopLogger(): LoggingLogger {
	return noopLogger;
}
