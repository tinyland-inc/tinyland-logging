import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	logAdminFileActivity,
	AdminActions,
	getRecentAdminFileActivities,
	getAdminFileActivitiesByUser,
	getAdminFileActivitiesByResource,
	adminFileLogger,
	configureLogging,
	resetLoggingConfig,
} from '../src/index.js';
import type { LogEntry } from '../src/types.js';

describe('admin-file-logger', () => {
	let auditLogMock: ReturnType<typeof vi.fn>;
	let consoleSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		auditLogMock = vi.fn().mockResolvedValue(undefined);
		consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		resetLoggingConfig();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		vi.restoreAllMocks();
	});

	describe('logAdminActivity', () => {
		it('should call auditLog with correct parameters', async () => {
			configureLogging({ auditLog: auditLogMock });
			await logAdminFileActivity(
				{ id: 'u1', email: 'admin@test.com' },
				'192.168.1.1',
				'Mozilla/5.0',
				{ action: 'auth.login' },
			);
			expect(auditLogMock).toHaveBeenCalledWith(
				'auth.login',
				'u1',
				'192.168.1.1',
				expect.objectContaining({
					adminEmail: 'admin@test.com',
					userAgent: 'Mozilla/5.0',
				}),
			);
		});

		it('should pass resourceType in metadata', async () => {
			configureLogging({ auditLog: auditLogMock });
			await logAdminFileActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'post.create', resourceType: 'post' },
			);
			expect(auditLogMock).toHaveBeenCalledWith(
				'post.create',
				'u1',
				'127.0.0.1',
				expect.objectContaining({ resourceType: 'post' }),
			);
		});

		it('should pass resourceId in metadata', async () => {
			configureLogging({ auditLog: auditLogMock });
			await logAdminFileActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'post.update', resourceId: 'p123' },
			);
			expect(auditLogMock).toHaveBeenCalledWith(
				'post.update',
				'u1',
				'127.0.0.1',
				expect.objectContaining({ resourceId: 'p123' }),
			);
		});

		it('should spread details in metadata', async () => {
			configureLogging({ auditLog: auditLogMock });
			await logAdminFileActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'settings.update', details: { key: 'theme', value: 'dark' } },
			);
			expect(auditLogMock).toHaveBeenCalledWith(
				'settings.update',
				'u1',
				'127.0.0.1',
				expect.objectContaining({ key: 'theme', value: 'dark' }),
			);
		});

		it('should handle null userAgent', async () => {
			configureLogging({ auditLog: auditLogMock });
			await logAdminFileActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'auth.login' },
			);
			expect(auditLogMock).toHaveBeenCalledWith(
				'auth.login',
				'u1',
				'127.0.0.1',
				expect.objectContaining({ userAgent: null }),
			);
		});

		it('should fallback to console when auditLog is not configured', async () => {
			resetLoggingConfig();
			await logAdminFileActivity(
				{ id: 'u1', email: 'admin@test.com' },
				'192.168.1.1',
				null,
				{ action: 'auth.login' },
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[AUDIT]'),
				expect.any(Object),
			);
		});

		it('should handle errors gracefully', async () => {
			configureLogging({
				auditLog: vi.fn().mockRejectedValue(new Error('Audit failed')),
			});
			await logAdminFileActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'auth.login' },
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to log admin activity:',
				expect.any(Error),
			);
		});
	});

	describe('AdminActions constants', () => {
		it('should have LOGIN action', () => {
			expect(AdminActions.LOGIN).toBe('auth.login');
		});

		it('should have LOGOUT action', () => {
			expect(AdminActions.LOGOUT).toBe('auth.logout');
		});

		it('should have PASSWORD_RESET action', () => {
			expect(AdminActions.PASSWORD_RESET).toBe('auth.password_reset');
		});

		it('should have TOTP_ENABLE action', () => {
			expect(AdminActions.TOTP_ENABLE).toBe('auth.totp_enable');
		});

		it('should have TOTP_DISABLE action', () => {
			expect(AdminActions.TOTP_DISABLE).toBe('auth.totp_disable');
		});

		it('should have USER_CREATE action', () => {
			expect(AdminActions.USER_CREATE).toBe('user.create');
		});

		it('should have USER_UPDATE action', () => {
			expect(AdminActions.USER_UPDATE).toBe('user.update');
		});

		it('should have USER_DELETE action', () => {
			expect(AdminActions.USER_DELETE).toBe('user.delete');
		});

		it('should have POST_CREATE action', () => {
			expect(AdminActions.POST_CREATE).toBe('post.create');
		});

		it('should have POST_PUBLISH action', () => {
			expect(AdminActions.POST_PUBLISH).toBe('post.publish');
		});

		it('should have EVENT_CREATE action', () => {
			expect(AdminActions.EVENT_CREATE).toBe('event.create');
		});

		it('should have EVENT_CANCEL action', () => {
			expect(AdminActions.EVENT_CANCEL).toBe('event.cancel');
		});

		it('should have IP_BAN_CREATE action', () => {
			expect(AdminActions.IP_BAN_CREATE).toBe('security.ip_ban_create');
		});

		it('should have SETTINGS_UPDATE action', () => {
			expect(AdminActions.SETTINGS_UPDATE).toBe('system.settings_update');
		});

		it('should have MAINTENANCE_MODE_TOGGLE action', () => {
			expect(AdminActions.MAINTENANCE_MODE_TOGGLE).toBe('system.maintenance_toggle');
		});
	});

	describe('getRecentAdminActivities', () => {
		it('should return empty array when no audit log reader configured', async () => {
			resetLoggingConfig();
			const result = await getRecentAdminFileActivities();
			expect(result).toEqual([]);
		});

		it('should query audit logs for today', async () => {
			const today = new Date().toISOString().split('T')[0]!;
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue([]),
				getAvailableDates: vi.fn().mockResolvedValue([]),
			};
			configureLogging({ auditLogReader: mockReader });
			await getRecentAdminFileActivities();
			expect(mockReader.readLogs).toHaveBeenCalledWith('audit', today);
		});

		it('should sort by timestamp descending', async () => {
			const logs: LogEntry[] = [
				{ timestamp: '2025-01-01T10:00:00Z', level: 'info', category: 'audit', message: 'first', userId: 'u1', ipAddress: '1.1.1.1' },
				{ timestamp: '2025-01-01T12:00:00Z', level: 'info', category: 'audit', message: 'second', userId: 'u1', ipAddress: '1.1.1.1' },
			];
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue(logs),
				getAvailableDates: vi.fn().mockResolvedValue([]),
			};
			configureLogging({ auditLogReader: mockReader });
			const result = await getRecentAdminFileActivities();
			expect(result[0].action).toBe('second');
			expect(result[1].action).toBe('first');
		});

		it('should apply pagination with limit and offset', async () => {
			const logs: LogEntry[] = Array.from({ length: 10 }, (_, i) => ({
				timestamp: `2025-01-01T${String(i).padStart(2, '0')}:00:00Z`,
				level: 'info' as const,
				category: 'audit',
				message: `action-${i}`,
				userId: 'u1',
				ipAddress: '1.1.1.1',
			}));
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue(logs),
				getAvailableDates: vi.fn().mockResolvedValue([]),
			};
			configureLogging({ auditLogReader: mockReader });
			const result = await getRecentAdminFileActivities(3, 2);
			expect(result).toHaveLength(3);
		});

		it('should map log fields to activity record format', async () => {
			const logs: LogEntry[] = [{
				timestamp: '2025-01-01T10:00:00Z',
				level: 'info',
				category: 'audit',
				message: 'auth.login',
				userId: 'u1',
				ipAddress: '192.168.1.1',
				metadata: { adminEmail: 'admin@test.com', resourceType: 'user', resourceId: 'u2', userAgent: 'Chrome' },
			}];
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue(logs),
				getAvailableDates: vi.fn().mockResolvedValue([]),
			};
			configureLogging({ auditLogReader: mockReader });
			const result = await getRecentAdminFileActivities();
			expect(result[0]).toEqual(expect.objectContaining({
				admin_user_id: 'u1',
				admin_email: 'admin@test.com',
				action: 'auth.login',
				resource_type: 'user',
				resource_id: 'u2',
				ip_address: '192.168.1.1',
				user_agent: 'Chrome',
			}));
		});
	});

	describe('getAdminActivitiesByUser', () => {
		it('should return empty array when no audit log reader configured', async () => {
			resetLoggingConfig();
			const result = await getAdminFileActivitiesByUser('u1');
			expect(result).toEqual([]);
		});

		it('should query available dates', async () => {
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue([]),
				getAvailableDates: vi.fn().mockResolvedValue(['2025-01-01', '2025-01-02']),
			};
			configureLogging({ auditLogReader: mockReader });
			await getAdminFileActivitiesByUser('u1');
			expect(mockReader.getAvailableDates).toHaveBeenCalledWith('audit');
		});

		it('should filter by userId', async () => {
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue([]),
				getAvailableDates: vi.fn().mockResolvedValue(['2025-01-01']),
			};
			configureLogging({ auditLogReader: mockReader });
			await getAdminFileActivitiesByUser('u1');
			expect(mockReader.readLogs).toHaveBeenCalledWith('audit', '2025-01-01', { userId: 'u1' });
		});

		it('should stop iterating when limit is reached', async () => {
			const logs: LogEntry[] = Array.from({ length: 60 }, (_, i) => ({
				timestamp: `2025-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
				level: 'info' as const,
				category: 'audit',
				message: `action-${i}`,
				userId: 'u1',
				ipAddress: '1.1.1.1',
			}));
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue(logs),
				getAvailableDates: vi.fn().mockResolvedValue(['2025-01-01', '2025-01-02']),
			};
			configureLogging({ auditLogReader: mockReader });
			const result = await getAdminFileActivitiesByUser('u1', 50);
			expect(result).toHaveLength(50);
			// Should only read from first date since we already have enough
			expect(mockReader.readLogs).toHaveBeenCalledTimes(1);
		});

		it('should respect limit parameter', async () => {
			const logs: LogEntry[] = Array.from({ length: 5 }, (_, i) => ({
				timestamp: `2025-01-01T${String(i).padStart(2, '0')}:00:00Z`,
				level: 'info' as const,
				category: 'audit',
				message: `action-${i}`,
				userId: 'u1',
				ipAddress: '1.1.1.1',
			}));
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue(logs),
				getAvailableDates: vi.fn().mockResolvedValue(['2025-01-01']),
			};
			configureLogging({ auditLogReader: mockReader });
			const result = await getAdminFileActivitiesByUser('u1', 3);
			expect(result).toHaveLength(3);
		});
	});

	describe('getAdminActivitiesByResource', () => {
		it('should return empty array when no audit log reader configured', async () => {
			resetLoggingConfig();
			const result = await getAdminFileActivitiesByResource('post', 'p1');
			expect(result).toEqual([]);
		});

		it('should filter logs by resource type and id', async () => {
			const logs: LogEntry[] = [
				{ timestamp: '2025-01-01T10:00:00Z', level: 'info', category: 'audit', message: 'post.update', userId: 'u1', ipAddress: '1.1.1.1', metadata: { resourceType: 'post', resourceId: 'p1' } },
				{ timestamp: '2025-01-01T11:00:00Z', level: 'info', category: 'audit', message: 'post.update', userId: 'u1', ipAddress: '1.1.1.1', metadata: { resourceType: 'post', resourceId: 'p2' } },
				{ timestamp: '2025-01-01T12:00:00Z', level: 'info', category: 'audit', message: 'post.delete', userId: 'u1', ipAddress: '1.1.1.1', metadata: { resourceType: 'post', resourceId: 'p1' } },
			];
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue(logs),
				getAvailableDates: vi.fn().mockResolvedValue(['2025-01-01']),
			};
			configureLogging({ auditLogReader: mockReader });
			const result = await getAdminFileActivitiesByResource('post', 'p1');
			expect(result).toHaveLength(2);
		});

		it('should check at most 30 days of logs', async () => {
			const dates = Array.from({ length: 40 }, (_, i) => `2025-01-${String(i + 1).padStart(2, '0')}`);
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue([]),
				getAvailableDates: vi.fn().mockResolvedValue(dates),
			};
			configureLogging({ auditLogReader: mockReader });
			await getAdminFileActivitiesByResource('post', 'p1');
			expect(mockReader.readLogs).toHaveBeenCalledTimes(30);
		});

		it('should sort results by date descending', async () => {
			const logs: LogEntry[] = [
				{ timestamp: '2025-01-01T10:00:00Z', level: 'info', category: 'audit', message: 'first', userId: 'u1', ipAddress: '1.1.1.1', metadata: { resourceType: 'post', resourceId: 'p1' } },
				{ timestamp: '2025-01-01T14:00:00Z', level: 'info', category: 'audit', message: 'second', userId: 'u1', ipAddress: '1.1.1.1', metadata: { resourceType: 'post', resourceId: 'p1' } },
			];
			const mockReader = {
				readLogs: vi.fn().mockResolvedValue(logs),
				getAvailableDates: vi.fn().mockResolvedValue(['2025-01-01']),
			};
			configureLogging({ auditLogReader: mockReader });
			const result = await getAdminFileActivitiesByResource('post', 'p1');
			expect(result[0].action).toBe('second');
		});
	});

	describe('adminFileLogger.log', () => {
		it('should call auditLog with action description', async () => {
			configureLogging({ auditLog: auditLogMock });
			await adminFileLogger.log({
				adminId: 'u1',
				actionType: 'user.create',
				actionDescription: 'Created user',
			});
			expect(auditLogMock).toHaveBeenCalledWith(
				'Created user',
				'u1',
				'system',
				expect.objectContaining({ actionType: 'user.create' }),
			);
		});

		it('should pass targetType and targetId', async () => {
			configureLogging({ auditLog: auditLogMock });
			await adminFileLogger.log({
				adminId: 'u1',
				actionType: 'post.delete',
				actionDescription: 'Deleted post',
				targetType: 'post',
				targetId: 'p123',
			});
			expect(auditLogMock).toHaveBeenCalledWith(
				'Deleted post',
				'u1',
				'system',
				expect.objectContaining({ targetType: 'post', targetId: 'p123' }),
			);
		});

		it('should spread metadata', async () => {
			configureLogging({ auditLog: auditLogMock });
			await adminFileLogger.log({
				adminId: 'u1',
				actionType: 'settings.update',
				actionDescription: 'Updated settings',
				metadata: { key: 'theme' },
			});
			expect(auditLogMock).toHaveBeenCalledWith(
				'Updated settings',
				'u1',
				'system',
				expect.objectContaining({ key: 'theme' }),
			);
		});

		it('should fallback to console when auditLog not configured', async () => {
			resetLoggingConfig();
			await adminFileLogger.log({
				adminId: 'u1',
				actionType: 'test',
				actionDescription: 'test action',
			});
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[AUDIT]'),
				expect.any(Object),
			);
		});

		it('should handle errors gracefully', async () => {
			configureLogging({
				auditLog: vi.fn().mockRejectedValue(new Error('fail')),
			});
			await adminFileLogger.log({
				adminId: 'u1',
				actionType: 'test',
				actionDescription: 'test',
			});
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to log admin action:',
				expect.any(Error),
			);
		});
	});
});
