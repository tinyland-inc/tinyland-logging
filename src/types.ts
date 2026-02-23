








export type FileLogLevel = 'info' | 'warn' | 'error' | 'debug';




export type LogLevel = FileLogLevel;





export interface LogContext {
	
	component?: string;
	
	action?: string;
	
	userId?: string;
	
	sessionId?: string;
	
	requestId?: string;
	
	[key: string]: unknown;
}





export interface AdminUser {
	id: string;
	email: string;
}




export interface AdminLogOptions {
	action: string;
	resourceType?: string;
	resourceId?: string;
	details?: Record<string, unknown>;
}




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




export interface LokiLogEntry {
	level: string;
	message: string;
	timestamp: string;
	labels: Record<string, string>;
}
