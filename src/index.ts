/**
 * @tummycrypt/tinyland-logging
 *
 * Structured logging with Loki integration, OTel trace correlation,
 * and admin audit logging.
 *
 * @packageDocumentation
 */

// Configuration injection
export {
	configureLogging,
	getLoggingConfig,
	resetLoggingConfig,
	getNoopLogger,
} from './config.js';
export type {
	LoggingConfig,
	LoggingLogger,
	WriteLogFn,
	AuditLogFn,
	AuditLogReader,
} from './config.js';

// Shared types
export type {
	FileLogLevel,
	LogLevel,
	LogContext,
	AdminUser,
	AdminLogOptions,
	AdminActivityLog,
	LogEntry,
	LokiLogEntry,
} from './types.js';

// Structured logger (OTel-correlated, file-backed)
export {
	structuredLogger,
	logger,
	createScopedLogger,
	perf,
} from './logger-structured.js';

// Loki push logger (buffered batch sending)
export {
	lokiLogger,
	log as lokiLog,
	flushLogs,
} from './logger.js';

// Admin file logger (DI-backed audit logging)
export {
	logAdminActivity as logAdminFileActivity,
	AdminActions,
	getRecentAdminActivities as getRecentAdminFileActivities,
	getAdminActivitiesByUser as getAdminFileActivitiesByUser,
	getAdminActivitiesByResource as getAdminFileActivitiesByResource,
	adminFileLogger,
} from './admin-file-logger.js';

// Admin flat-file logger (self-contained file-based)
export {
	logAdminActivity as logAdminFlatActivity,
	logAdminAction as logAdminFlatAction,
	FlatAdminActions,
	getRecentAdminActivities as getRecentAdminFlatActivities,
	getAdminActivitiesByUser as getAdminFlatActivitiesByUser,
	getAdminActivitiesByResource as getAdminFlatActivitiesByResource,
	getRecentAdminActivity as getRecentAdminFlatActivity,
	rotateAdminLogs,
	readLogs as readFlatLogs,
	writeLogs as writeFlatLogs,
} from './admin-logger-flat.js';

// Internal testing helpers (re-exported for test access)
export {
	_setTraceApi,
	_getTraceApi,
} from './logger-structured.js';
export {
	_getBufferLength,
	_resetBuffer,
	_getFlushTimer,
} from './logger.js';
