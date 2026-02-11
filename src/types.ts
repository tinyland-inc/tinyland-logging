/**
 * Shared types for tinyland-logging
 *
 * @module types
 */

/**
 * Log levels supported by the file logger
 */
export type FileLogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Alias for FileLogLevel for backward compatibility
 */
export type LogLevel = FileLogLevel;

/**
 * Structured log context
 * Key-value pairs for Grafana labels and context fields
 */
export interface LogContext {
	/** Component/module name (becomes Grafana label) */
	component?: string;
	/** Action/operation name (becomes Grafana label) */
	action?: string;
	/** User ID (for user-scoped queries) */
	userId?: string;
	/** Session ID (for session correlation) */
	sessionId?: string;
	/** Request ID (for request correlation) */
	requestId?: string;
	/** Additional context fields */
	[key: string]: unknown;
}

/**
 * Minimal admin user type for audit logging.
 * Inlined from the app's auth types to avoid framework coupling.
 */
export interface AdminUser {
	id: string;
	email: string;
}

/**
 * Options for admin activity logging
 */
export interface AdminLogOptions {
	action: string;
	resourceType?: string;
	resourceId?: string;
	details?: Record<string, unknown>;
}

/**
 * Flat-file admin activity log entry
 */
export interface AdminActivityLog {
	id: string;
	admin_user_id: string;
	admin_email: string;
	action: string;
	resource_type: string | null;
	resource_id: string | null;
	ip_address: string;
	user_agent: string | null;
	details: Record<string, unknown> | null;
	created_at: string;
}

/**
 * Log entry from the file logger (used by adminFileLogger)
 */
export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	category: string;
	message: string;
	metadata?: Record<string, unknown>;
	userId?: string;
	ipAddress?: string;
	userAgent?: string;
}

/**
 * Loki log entry structure
 */
export interface LokiLogEntry {
	level: string;
	message: string;
	timestamp: string;
	labels: Record<string, string>;
}
