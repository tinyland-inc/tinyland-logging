














import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { getLoggingConfig } from './config.js';
import type { AdminUser, AdminLogOptions, AdminActivityLog } from './types.js';




function getLogsDir(): string {
	return getLoggingConfig().logsDir ?? process.cwd();
}




function getAdminLogsDir(): string {
	return path.join(getLogsDir(), 'content', 'auth', 'logs');
}




function getActivityLogFile(): string {
	return path.join(getAdminLogsDir(), 'admin-activity.json');
}




async function ensureLogsDir(): Promise<void> {
	const logsDir = getAdminLogsDir();
	const activityLogFile = getActivityLogFile();

	try {
		await fs.mkdir(logsDir, { recursive: true });
		await fs.access(activityLogFile);
	} catch {
		await fs.writeFile(activityLogFile, '{"logs": []}', 'utf8');
	}
}






export async function readLogs(): Promise<AdminActivityLog[]> {
	await ensureLogsDir();
	const content = await fs.readFile(getActivityLogFile(), 'utf8');
	const parsed = JSON.parse(content);
	
	if (Array.isArray(parsed)) {
		return parsed;
	} else if (parsed.logs && Array.isArray(parsed.logs)) {
		return parsed.logs;
	}
	return [];
}






export async function writeLogs(logs: AdminActivityLog[]): Promise<void> {
	await ensureLogsDir();
	
	await fs.writeFile(getActivityLogFile(), JSON.stringify({ logs }, null, 2), 'utf8');
}









export async function logAdminActivity(
	user: AdminUser,
	ipAddress: string,
	userAgent: string | null,
	options: AdminLogOptions,
): Promise<void> {
	try {
		const logs = await readLogs();

		const newLog: AdminActivityLog = {
			id: crypto.randomUUID(),
			admin_user_id: user.id,
			admin_email: user.email,
			action: options.action,
			resource_type: options.resourceType || null,
			resource_id: options.resourceId || null,
			ip_address: ipAddress,
			user_agent: userAgent,
			details: options.details || null,
			created_at: new Date().toISOString(),
		};

		logs.push(newLog);

		
		if (logs.length > 1000) {
			logs.splice(0, logs.length - 1000);
		}

		await writeLogs(logs);
	} catch (error) {
		console.error('Failed to log admin activity:', error);
	}
}











export async function logAdminAction(
	userId: string,
	action: string,
	targetType: string | null,
	targetId: string | null,
	request: Request,
	metadata?: Record<string, unknown>,
): Promise<void> {
	try {
		const logs = await readLogs();

		const newLog: AdminActivityLog = {
			id: crypto.randomUUID(),
			admin_user_id: userId,
			admin_email: '', 
			action: action,
			resource_type: targetType,
			resource_id: targetId,
			ip_address: '127.0.0.1', 
			user_agent: request.headers.get('user-agent') || null,
			details: (metadata as Record<string, unknown> | undefined) || null,
			created_at: new Date().toISOString(),
		};

		logs.push(newLog);

		
		if (logs.length > 1000) {
			logs.splice(0, logs.length - 1000);
		}

		await writeLogs(logs);
	} catch (error) {
		console.error('Failed to log admin action:', error);
	}
}




export const FlatAdminActions = {
	
	LOGIN: 'auth.login',
	LOGOUT: 'auth.logout',
	PASSWORD_RESET: 'auth.password_reset',
	TOTP_ENABLE: 'auth.totp_enable',
	TOTP_DISABLE: 'auth.totp_disable',

	
	USER_CREATE: 'user.create',
	USER_UPDATE: 'user.update',
	USER_DELETE: 'user.delete',
	USER_INVITE: 'user.invite',
	USER_RESET_PASSWORD: 'user.reset_password',

	
	POST_CREATE: 'post.create',
	POST_UPDATE: 'post.update',
	POST_DELETE: 'post.delete',
	POST_PUBLISH: 'post.publish',
	POST_UNPUBLISH: 'post.unpublish',

	EVENT_CREATE: 'event.create',
	EVENT_UPDATE: 'event.update',
	EVENT_DELETE: 'event.delete',
	EVENT_CANCEL: 'event.cancel',

	PROFILE_CREATE: 'profile.create',
	PROFILE_UPDATE: 'profile.update',
	PROFILE_DELETE: 'profile.delete',

	
	IP_BAN_CREATE: 'security.ip_ban_create',
	IP_BAN_REMOVE: 'security.ip_ban_remove',
	SECURITY_SETTINGS_UPDATE: 'security.settings_update',

	
	SETTINGS_UPDATE: 'system.settings_update',
	BACKUP_CREATE: 'system.backup_create',
	MAINTENANCE_MODE_TOGGLE: 'system.maintenance_toggle',
} as const;








export async function getRecentAdminActivities(
	limit: number = 50,
	offset: number = 0,
): Promise<AdminActivityLog[]> {
	const logs = await readLogs();
	return logs
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		)
		.slice(offset, offset + limit);
}








export async function getAdminActivitiesByUser(
	userId: string,
	limit: number = 50,
): Promise<AdminActivityLog[]> {
	const logs = await readLogs();
	return logs
		.filter((log) => log.admin_user_id === userId)
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		)
		.slice(0, limit);
}








export async function getAdminActivitiesByResource(
	resourceType: string,
	resourceId: string,
): Promise<AdminActivityLog[]> {
	const logs = await readLogs();
	return logs
		.filter(
			(log) =>
				log.resource_type === resourceType && log.resource_id === resourceId,
		)
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);
}







export async function getRecentAdminActivity(
	days: number = 7,
): Promise<AdminActivityLog[]> {
	const logs = await readLogs();
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	return logs
		.filter((log) => new Date(log.created_at) > cutoffDate)
		.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);
}







export async function rotateAdminLogs(days: number = 7): Promise<number> {
	const logs = await readLogs();
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	const filteredLogs = logs.filter(
		(log) => new Date(log.created_at) > cutoffDate,
	);

	const deletedCount = logs.length - filteredLogs.length;
	await writeLogs(filteredLogs);

	return deletedCount;
}
