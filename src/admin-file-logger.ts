









import { getLoggingConfig } from './config.js';
import type { AdminUser, AdminLogOptions } from './types.js';









export async function logAdminActivity(
	user: AdminUser,
	ipAddress: string,
	userAgent: string | null,
	options: AdminLogOptions,
): Promise<void> {
	try {
		const config = getLoggingConfig();
		if (config.auditLog) {
			await config.auditLog(options.action, user.id, ipAddress, {
				adminEmail: user.email,
				resourceType: options.resourceType,
				resourceId: options.resourceId,
				userAgent,
				...options.details,
			});
		} else {
			
			console.log(
				`[AUDIT] ${options.action} by ${user.email} (${user.id}) from ${ipAddress}`,
				options,
			);
		}
	} catch (error) {
		console.error('Failed to log admin activity:', error);
	}
}




export const AdminActions = {
	
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
): Promise<Record<string, unknown>[]> {
	const config = getLoggingConfig();
	if (!config.auditLogReader) {
		return [];
	}

	const today = new Date().toISOString().split('T')[0]!;
	const logs = await config.auditLogReader.readLogs('audit', today);

	
	return logs
		.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		)
		.slice(offset, offset + limit)
		.map((log) => ({
			id: `${log.timestamp}-${log.userId}`,
			admin_user_id: log.userId,
			admin_email: log.metadata?.adminEmail,
			action: log.message,
			resource_type: log.metadata?.resourceType,
			resource_id: log.metadata?.resourceId,
			ip_address: log.ipAddress,
			user_agent: log.metadata?.userAgent,
			details: log.metadata,
			created_at: log.timestamp,
		}));
}








export async function getAdminActivitiesByUser(
	userId: string,
	limit: number = 50,
): Promise<Record<string, unknown>[]> {
	const config = getLoggingConfig();
	if (!config.auditLogReader) {
		return [];
	}

	const availableDates = await config.auditLogReader.getAvailableDates('audit');
	const activities: Record<string, unknown>[] = [];

	
	for (const date of availableDates) {
		const logs = await config.auditLogReader.readLogs('audit', date, { userId });

		activities.push(
			...logs.map((log) => ({
				id: `${log.timestamp}-${log.userId}`,
				admin_user_id: log.userId,
				action: log.message,
				resource_type: log.metadata?.resourceType,
				resource_id: log.metadata?.resourceId,
				ip_address: log.ipAddress,
				user_agent: log.metadata?.userAgent,
				details: log.metadata,
				created_at: log.timestamp,
			})),
		);

		if (activities.length >= limit) {
			break;
		}
	}

	return activities
		.sort(
			(a, b) =>
				new Date(a.created_at as string).getTime() -
				new Date(b.created_at as string).getTime(),
		)
		.reverse()
		.slice(0, limit);
}








export async function getAdminActivitiesByResource(
	resourceType: string,
	resourceId: string,
): Promise<Record<string, unknown>[]> {
	const config = getLoggingConfig();
	if (!config.auditLogReader) {
		return [];
	}

	const availableDates = await config.auditLogReader.getAvailableDates('audit');
	const activities: Record<string, unknown>[] = [];

	
	for (const date of availableDates.slice(0, 30)) {
		const logs = await config.auditLogReader.readLogs('audit', date);

		const filtered = logs.filter(
			(log) =>
				log.metadata?.resourceType === resourceType &&
				log.metadata?.resourceId === resourceId,
		);

		activities.push(
			...filtered.map((log) => ({
				id: `${log.timestamp}-${log.userId}`,
				admin_user_id: log.userId,
				admin_email: log.metadata?.adminEmail,
				action: log.message,
				resource_type: log.metadata?.resourceType,
				resource_id: log.metadata?.resourceId,
				ip_address: log.ipAddress,
				user_agent: log.metadata?.userAgent,
				details: log.metadata,
				created_at: log.timestamp,
			})),
		);
	}

	return activities.sort(
		(a, b) =>
			new Date(b.created_at as string).getTime() -
			new Date(a.created_at as string).getTime(),
	);
}




export const adminFileLogger = {
	log: async (options: {
		adminId: string;
		actionType: string;
		actionDescription: string;
		targetType?: string;
		targetId?: string;
		metadata?: Record<string, unknown>;
	}) => {
		try {
			const config = getLoggingConfig();
			if (config.auditLog) {
				await config.auditLog(
					options.actionDescription,
					options.adminId,
					'system', 
					{
						actionType: options.actionType,
						targetType: options.targetType,
						targetId: options.targetId,
						...options.metadata,
					},
				);
			} else {
				console.log(
					`[AUDIT] ${options.actionDescription} by ${options.adminId}`,
					options,
				);
			}
		} catch (error) {
			console.error('Failed to log admin action:', error);
		}
	},
};
