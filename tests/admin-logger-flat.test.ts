import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
	logAdminFlatActivity,
	logAdminFlatAction,
	FlatAdminActions,
	getRecentAdminFlatActivities,
	getAdminFlatActivitiesByUser,
	getAdminFlatActivitiesByResource,
	getRecentAdminFlatActivity,
	rotateAdminLogs,
	readFlatLogs,
	writeFlatLogs,
	configureLogging,
	resetLoggingConfig,
} from '../src/index.js';
import type { AdminActivityLog } from '../src/types.js';

describe('admin-logger-flat', () => {
	let tmpDir: string;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		
		tmpDir = await fs.mkdtemp(path.join('/tmp', 'logging-test-'));
		resetLoggingConfig();
		configureLogging({ logsDir: tmpDir });
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(async () => {
		consoleErrorSpy.mockRestore();
		vi.restoreAllMocks();
		
		try {
			await fs.rm(tmpDir, { recursive: true, force: true });
		} catch {
			
		}
	});

	describe('file creation', () => {
		it('should create the logs directory if it does not exist', async () => {
			const logs = await readFlatLogs();
			expect(logs).toEqual([]);
			
			const logsDir = path.join(tmpDir, 'content', 'auth', 'logs');
			const stat = await fs.stat(logsDir);
			expect(stat.isDirectory()).toBe(true);
		});

		it('should create the activity log file if it does not exist', async () => {
			await readFlatLogs();
			const filePath = path.join(tmpDir, 'content', 'auth', 'logs', 'admin-activity.json');
			const stat = await fs.stat(filePath);
			expect(stat.isFile()).toBe(true);
		});

		it('should initialize with empty logs array', async () => {
			const logs = await readFlatLogs();
			expect(logs).toEqual([]);
		});
	});

	describe('readLogs', () => {
		it('should return empty array for newly created file', async () => {
			const logs = await readFlatLogs();
			expect(logs).toEqual([]);
		});

		it('should handle object format with logs property', async () => {
			const logsDir = path.join(tmpDir, 'content', 'auth', 'logs');
			await fs.mkdir(logsDir, { recursive: true });
			await fs.writeFile(
				path.join(logsDir, 'admin-activity.json'),
				JSON.stringify({ logs: [{ id: 'test-1', action: 'test' }] }),
			);
			const logs = await readFlatLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].id).toBe('test-1');
		});

		it('should handle raw array format', async () => {
			const logsDir = path.join(tmpDir, 'content', 'auth', 'logs');
			await fs.mkdir(logsDir, { recursive: true });
			await fs.writeFile(
				path.join(logsDir, 'admin-activity.json'),
				JSON.stringify([{ id: 'test-2', action: 'test' }]),
			);
			const logs = await readFlatLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].id).toBe('test-2');
		});

		it('should return empty array for unrecognized format', async () => {
			const logsDir = path.join(tmpDir, 'content', 'auth', 'logs');
			await fs.mkdir(logsDir, { recursive: true });
			await fs.writeFile(
				path.join(logsDir, 'admin-activity.json'),
				JSON.stringify({ other: 'data' }),
			);
			const logs = await readFlatLogs();
			expect(logs).toEqual([]);
		});
	});

	describe('writeLogs', () => {
		it('should write logs in object format', async () => {
			const testLogs: AdminActivityLog[] = [{
				id: 'w1',
				admin_user_id: 'u1',
				admin_email: 'a@b.com',
				action: 'test',
				resource_type: null,
				resource_id: null,
				ip_address: '127.0.0.1',
				user_agent: null,
				details: null,
				created_at: '2025-01-01T00:00:00Z',
			}];
			await writeFlatLogs(testLogs);
			const content = await fs.readFile(
				path.join(tmpDir, 'content', 'auth', 'logs', 'admin-activity.json'),
				'utf8',
			);
			const parsed = JSON.parse(content);
			expect(parsed.logs).toHaveLength(1);
			expect(parsed.logs[0].id).toBe('w1');
		});

		it('should overwrite existing logs', async () => {
			await writeFlatLogs([{
				id: 'first',
				admin_user_id: 'u1',
				admin_email: 'a@b.com',
				action: 'first',
				resource_type: null,
				resource_id: null,
				ip_address: '127.0.0.1',
				user_agent: null,
				details: null,
				created_at: '2025-01-01T00:00:00Z',
			}]);
			await writeFlatLogs([{
				id: 'second',
				admin_user_id: 'u1',
				admin_email: 'a@b.com',
				action: 'second',
				resource_type: null,
				resource_id: null,
				ip_address: '127.0.0.1',
				user_agent: null,
				details: null,
				created_at: '2025-01-01T00:00:00Z',
			}]);
			const logs = await readFlatLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].id).toBe('second');
		});
	});

	describe('logAdminActivity', () => {
		it('should add a new log entry', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'admin@test.com' },
				'192.168.1.1',
				'Chrome/100',
				{ action: 'auth.login' },
			);
			const logs = await readFlatLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].admin_user_id).toBe('u1');
			expect(logs[0].admin_email).toBe('admin@test.com');
			expect(logs[0].action).toBe('auth.login');
			expect(logs[0].ip_address).toBe('192.168.1.1');
			expect(logs[0].user_agent).toBe('Chrome/100');
		});

		it('should generate a UUID id', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'test' },
			);
			const logs = await readFlatLogs();
			expect(logs[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
		});

		it('should set created_at to ISO timestamp', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'test' },
			);
			const logs = await readFlatLogs();
			expect(logs[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('should handle resourceType', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'post.create', resourceType: 'post' },
			);
			const logs = await readFlatLogs();
			expect(logs[0].resource_type).toBe('post');
		});

		it('should handle resourceId', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'post.update', resourceId: 'p123' },
			);
			const logs = await readFlatLogs();
			expect(logs[0].resource_id).toBe('p123');
		});

		it('should handle details', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'settings', details: { theme: 'dark' } },
			);
			const logs = await readFlatLogs();
			expect(logs[0].details).toEqual({ theme: 'dark' });
		});

		it('should set null for missing optional fields', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'test' },
			);
			const logs = await readFlatLogs();
			expect(logs[0].resource_type).toBeNull();
			expect(logs[0].resource_id).toBeNull();
			expect(logs[0].user_agent).toBeNull();
			expect(logs[0].details).toBeNull();
		});

		it('should handle errors gracefully', async () => {
			
			configureLogging({ logsDir: '/nonexistent/path/that/cannot/be/created\x00invalid' });
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'test' },
			);
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe('1000 log limit', () => {
		it('should keep only the last 1000 logs', async () => {
			
			const existingLogs: AdminActivityLog[] = Array.from({ length: 999 }, (_, i) => ({
				id: `existing-${i}`,
				admin_user_id: 'u1',
				admin_email: 'a@b.com',
				action: `action-${i}`,
				resource_type: null,
				resource_id: null,
				ip_address: '127.0.0.1',
				user_agent: null,
				details: null,
				created_at: new Date(Date.now() - (999 - i) * 1000).toISOString(),
			}));
			await writeFlatLogs(existingLogs);

			
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'action-999' },
			);
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'action-1000' },
			);

			const logs = await readFlatLogs();
			expect(logs.length).toBeLessThanOrEqual(1000);
		});

		it('should remove oldest logs when exceeding limit', async () => {
			const existingLogs: AdminActivityLog[] = Array.from({ length: 1000 }, (_, i) => ({
				id: `old-${i}`,
				admin_user_id: 'u1',
				admin_email: 'a@b.com',
				action: `action-${i}`,
				resource_type: null,
				resource_id: null,
				ip_address: '127.0.0.1',
				user_agent: null,
				details: null,
				created_at: new Date(Date.now() - (1000 - i) * 1000).toISOString(),
			}));
			await writeFlatLogs(existingLogs);

			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'new-action' },
			);

			const logs = await readFlatLogs();
			expect(logs.length).toBe(1000);
			
			expect(logs.find((l) => l.id === 'old-0')).toBeUndefined();
			
			expect(logs[logs.length - 1].action).toBe('new-action');
		});
	});

	describe('logAdminAction', () => {
		it('should log an action with request object', async () => {
			const mockRequest = new Request('http://localhost', {
				headers: { 'user-agent': 'TestAgent/1.0' },
			});
			await logAdminFlatAction('u1', 'user.create', 'user', 'u2', mockRequest);
			const logs = await readFlatLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].admin_user_id).toBe('u1');
			expect(logs[0].action).toBe('user.create');
			expect(logs[0].resource_type).toBe('user');
			expect(logs[0].resource_id).toBe('u2');
			expect(logs[0].user_agent).toBe('TestAgent/1.0');
		});

		it('should handle null targetType and targetId', async () => {
			const mockRequest = new Request('http://localhost');
			await logAdminFlatAction('u1', 'auth.login', null, null, mockRequest);
			const logs = await readFlatLogs();
			expect(logs[0].resource_type).toBeNull();
			expect(logs[0].resource_id).toBeNull();
		});

		it('should include metadata', async () => {
			const mockRequest = new Request('http://localhost');
			await logAdminFlatAction('u1', 'settings.update', null, null, mockRequest, { key: 'theme' });
			const logs = await readFlatLogs();
			expect(logs[0].details).toEqual({ key: 'theme' });
		});

		it('should default IP to 127.0.0.1', async () => {
			const mockRequest = new Request('http://localhost');
			await logAdminFlatAction('u1', 'test', null, null, mockRequest);
			const logs = await readFlatLogs();
			expect(logs[0].ip_address).toBe('127.0.0.1');
		});

		it('should default admin_email to empty string', async () => {
			const mockRequest = new Request('http://localhost');
			await logAdminFlatAction('u1', 'test', null, null, mockRequest);
			const logs = await readFlatLogs();
			expect(logs[0].admin_email).toBe('');
		});
	});

	describe('FlatAdminActions constants', () => {
		it('should have auth actions', () => {
			expect(FlatAdminActions.LOGIN).toBe('auth.login');
			expect(FlatAdminActions.LOGOUT).toBe('auth.logout');
			expect(FlatAdminActions.PASSWORD_RESET).toBe('auth.password_reset');
		});

		it('should have user management actions', () => {
			expect(FlatAdminActions.USER_CREATE).toBe('user.create');
			expect(FlatAdminActions.USER_UPDATE).toBe('user.update');
			expect(FlatAdminActions.USER_DELETE).toBe('user.delete');
			expect(FlatAdminActions.USER_INVITE).toBe('user.invite');
		});

		it('should have content management actions', () => {
			expect(FlatAdminActions.POST_CREATE).toBe('post.create');
			expect(FlatAdminActions.POST_PUBLISH).toBe('post.publish');
			expect(FlatAdminActions.EVENT_CREATE).toBe('event.create');
			expect(FlatAdminActions.PROFILE_CREATE).toBe('profile.create');
		});

		it('should have security actions', () => {
			expect(FlatAdminActions.IP_BAN_CREATE).toBe('security.ip_ban_create');
			expect(FlatAdminActions.IP_BAN_REMOVE).toBe('security.ip_ban_remove');
			expect(FlatAdminActions.SECURITY_SETTINGS_UPDATE).toBe('security.settings_update');
		});

		it('should have system actions', () => {
			expect(FlatAdminActions.SETTINGS_UPDATE).toBe('system.settings_update');
			expect(FlatAdminActions.BACKUP_CREATE).toBe('system.backup_create');
			expect(FlatAdminActions.MAINTENANCE_MODE_TOGGLE).toBe('system.maintenance_toggle');
		});
	});

	describe('getRecentAdminActivities', () => {
		it('should return empty array when no logs exist', async () => {
			const result = await getRecentAdminFlatActivities();
			expect(result).toEqual([]);
		});

		it('should return logs sorted by date descending', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'first' },
			);
			await new Promise((r) => setTimeout(r, 10));
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'second' },
			);
			const result = await getRecentAdminFlatActivities();
			expect(result[0].action).toBe('second');
			expect(result[1].action).toBe('first');
		});

		it('should respect limit parameter', async () => {
			for (let i = 0; i < 5; i++) {
				await logAdminFlatActivity(
					{ id: 'u1', email: 'a@b.com' },
					'127.0.0.1',
					null,
					{ action: `action-${i}` },
				);
			}
			const result = await getRecentAdminFlatActivities(3);
			expect(result).toHaveLength(3);
		});

		it('should respect offset parameter', async () => {
			for (let i = 0; i < 5; i++) {
				await logAdminFlatActivity(
					{ id: 'u1', email: 'a@b.com' },
					'127.0.0.1',
					null,
					{ action: `action-${i}` },
				);
			}
			const result = await getRecentAdminFlatActivities(50, 2);
			expect(result).toHaveLength(3);
		});

		it('should default limit to 50', async () => {
			const result = await getRecentAdminFlatActivities();
			expect(result.length).toBeLessThanOrEqual(50);
		});
	});

	describe('getAdminActivitiesByUser', () => {
		it('should filter logs by user id', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'user1-action' },
			);
			await logAdminFlatActivity(
				{ id: 'u2', email: 'c@d.com' },
				'127.0.0.1',
				null,
				{ action: 'user2-action' },
			);
			const result = await getAdminFlatActivitiesByUser('u1');
			expect(result).toHaveLength(1);
			expect(result[0].action).toBe('user1-action');
		});

		it('should return empty array for non-existent user', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'test' },
			);
			const result = await getAdminFlatActivitiesByUser('nonexistent');
			expect(result).toEqual([]);
		});

		it('should sort by date descending', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'first' },
			);
			await new Promise((r) => setTimeout(r, 10));
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'second' },
			);
			const result = await getAdminFlatActivitiesByUser('u1');
			expect(result[0].action).toBe('second');
		});

		it('should respect limit', async () => {
			for (let i = 0; i < 5; i++) {
				await logAdminFlatActivity(
					{ id: 'u1', email: 'a@b.com' },
					'127.0.0.1',
					null,
					{ action: `action-${i}` },
				);
			}
			const result = await getAdminFlatActivitiesByUser('u1', 3);
			expect(result).toHaveLength(3);
		});
	});

	describe('getAdminActivitiesByResource', () => {
		it('should filter by resource type and id', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'post.update', resourceType: 'post', resourceId: 'p1' },
			);
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'post.update', resourceType: 'post', resourceId: 'p2' },
			);
			const result = await getAdminFlatActivitiesByResource('post', 'p1');
			expect(result).toHaveLength(1);
			expect(result[0].resource_id).toBe('p1');
		});

		it('should return empty for non-matching resource', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'post.update', resourceType: 'post', resourceId: 'p1' },
			);
			const result = await getAdminFlatActivitiesByResource('event', 'e1');
			expect(result).toEqual([]);
		});

		it('should sort by date descending', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'first', resourceType: 'post', resourceId: 'p1' },
			);
			await new Promise((r) => setTimeout(r, 10));
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'second', resourceType: 'post', resourceId: 'p1' },
			);
			const result = await getAdminFlatActivitiesByResource('post', 'p1');
			expect(result[0].action).toBe('second');
		});
	});

	describe('getRecentAdminActivity', () => {
		it('should return logs within the time window', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'recent' },
			);
			const result = await getRecentAdminFlatActivity(7);
			expect(result).toHaveLength(1);
		});

		it('should filter out old logs', async () => {
			
			await writeFlatLogs([{
				id: 'old',
				admin_user_id: 'u1',
				admin_email: 'a@b.com',
				action: 'old-action',
				resource_type: null,
				resource_id: null,
				ip_address: '127.0.0.1',
				user_agent: null,
				details: null,
				created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
			}]);
			const result = await getRecentAdminFlatActivity(7);
			expect(result).toHaveLength(0);
		});

		it('should default to 7 days', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'within-7-days' },
			);
			const result = await getRecentAdminFlatActivity();
			expect(result).toHaveLength(1);
		});

		it('should sort by date descending', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'first' },
			);
			await new Promise((r) => setTimeout(r, 10));
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'second' },
			);
			const result = await getRecentAdminFlatActivity();
			expect(result[0].action).toBe('second');
		});
	});

	describe('rotateAdminLogs', () => {
		it('should remove logs older than specified days', async () => {
			await writeFlatLogs([
				{
					id: 'old',
					admin_user_id: 'u1',
					admin_email: 'a@b.com',
					action: 'old',
					resource_type: null,
					resource_id: null,
					ip_address: '127.0.0.1',
					user_agent: null,
					details: null,
					created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
				},
				{
					id: 'recent',
					admin_user_id: 'u1',
					admin_email: 'a@b.com',
					action: 'recent',
					resource_type: null,
					resource_id: null,
					ip_address: '127.0.0.1',
					user_agent: null,
					details: null,
					created_at: new Date().toISOString(),
				},
			]);
			const deleted = await rotateAdminLogs(7);
			expect(deleted).toBe(1);
			const logs = await readFlatLogs();
			expect(logs).toHaveLength(1);
			expect(logs[0].id).toBe('recent');
		});

		it('should return count of deleted logs', async () => {
			await writeFlatLogs(
				Array.from({ length: 5 }, (_, i) => ({
					id: `old-${i}`,
					admin_user_id: 'u1',
					admin_email: 'a@b.com',
					action: `action-${i}`,
					resource_type: null,
					resource_id: null,
					ip_address: '127.0.0.1',
					user_agent: null,
					details: null,
					created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
				})),
			);
			const deleted = await rotateAdminLogs(7);
			expect(deleted).toBe(5);
		});

		it('should return 0 when no logs to rotate', async () => {
			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'fresh' },
			);
			const deleted = await rotateAdminLogs(7);
			expect(deleted).toBe(0);
		});

		it('should default to 7 days', async () => {
			await writeFlatLogs([{
				id: 'old',
				admin_user_id: 'u1',
				admin_email: 'a@b.com',
				action: 'old',
				resource_type: null,
				resource_id: null,
				ip_address: '127.0.0.1',
				user_agent: null,
				details: null,
				created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
			}]);
			const deleted = await rotateAdminLogs();
			expect(deleted).toBe(1);
		});
	});

	describe('logsDir configuration', () => {
		it('should use configured logsDir', async () => {
			const customDir = await fs.mkdtemp(path.join('/tmp', 'custom-logs-'));
			configureLogging({ logsDir: customDir });

			await logAdminFlatActivity(
				{ id: 'u1', email: 'a@b.com' },
				'127.0.0.1',
				null,
				{ action: 'custom-dir-test' },
			);

			const filePath = path.join(customDir, 'content', 'auth', 'logs', 'admin-activity.json');
			const stat = await fs.stat(filePath);
			expect(stat.isFile()).toBe(true);

			await fs.rm(customDir, { recursive: true, force: true });
		});
	});
});
