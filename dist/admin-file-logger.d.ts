import type { AdminUser, AdminLogOptions } from './types.js';
export declare function logAdminActivity(user: AdminUser, ipAddress: string, userAgent: string | null, options: AdminLogOptions): Promise<void>;
export declare const AdminActions: {
    readonly LOGIN: "auth.login";
    readonly LOGOUT: "auth.logout";
    readonly PASSWORD_RESET: "auth.password_reset";
    readonly TOTP_ENABLE: "auth.totp_enable";
    readonly TOTP_DISABLE: "auth.totp_disable";
    readonly USER_CREATE: "user.create";
    readonly USER_UPDATE: "user.update";
    readonly USER_DELETE: "user.delete";
    readonly USER_INVITE: "user.invite";
    readonly USER_RESET_PASSWORD: "user.reset_password";
    readonly POST_CREATE: "post.create";
    readonly POST_UPDATE: "post.update";
    readonly POST_DELETE: "post.delete";
    readonly POST_PUBLISH: "post.publish";
    readonly POST_UNPUBLISH: "post.unpublish";
    readonly EVENT_CREATE: "event.create";
    readonly EVENT_UPDATE: "event.update";
    readonly EVENT_DELETE: "event.delete";
    readonly EVENT_CANCEL: "event.cancel";
    readonly PROFILE_CREATE: "profile.create";
    readonly PROFILE_UPDATE: "profile.update";
    readonly PROFILE_DELETE: "profile.delete";
    readonly IP_BAN_CREATE: "security.ip_ban_create";
    readonly IP_BAN_REMOVE: "security.ip_ban_remove";
    readonly SECURITY_SETTINGS_UPDATE: "security.settings_update";
    readonly SETTINGS_UPDATE: "system.settings_update";
    readonly BACKUP_CREATE: "system.backup_create";
    readonly MAINTENANCE_MODE_TOGGLE: "system.maintenance_toggle";
};
export declare function getRecentAdminActivities(limit?: number, offset?: number): Promise<Record<string, unknown>[]>;
export declare function getAdminActivitiesByUser(userId: string, limit?: number): Promise<Record<string, unknown>[]>;
export declare function getAdminActivitiesByResource(resourceType: string, resourceId: string): Promise<Record<string, unknown>[]>;
export declare const adminFileLogger: {
    log: (options: {
        adminId: string;
        actionType: string;
        actionDescription: string;
        targetType?: string;
        targetId?: string;
        metadata?: Record<string, unknown>;
    }) => Promise<void>;
};
//# sourceMappingURL=admin-file-logger.d.ts.map