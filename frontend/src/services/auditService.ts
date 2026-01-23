import apiClient from './api';

const PREFIX = '/audit-logs';

// Audit log action types (mirrors backend)
export type AuditAction =
    | 'LOGIN'
    | 'LOGOUT'
    | 'REGISTER'
    | 'LOGIN_FAILED'
    | 'GPA_UPDATE'
    | 'FILE_UPLOAD'
    | 'FILE_DELETE'
    | 'KEY_ROTATION'
    | 'PROFILE_UPDATE'
    | 'PREFERENCES_UPDATE'
    | 'COURSE_CREATE'
    | 'COURSE_DELETE'
    | 'CALENDAR_EVENT_CREATE'
    | 'CALENDAR_EVENT_UPDATE'
    | 'CALENDAR_EVENT_DELETE'
    | 'PASSKEY_REGISTER'
    | 'PASSKEY_LOGIN'
    | 'PASSKEY_REMOVE'
    | 'PASSWORD_REMOVE'
    | 'PASSWORD_UPDATE'
    | 'TASK_CREATE'
    | 'TASK_UPDATE'
    | 'TASK_DELETE'
    | 'TASK_REORDER'
    | 'NOTE_CREATE'
    | 'NOTE_UPDATE_METADATA'
    | 'NOTE_UPDATE_CONTENT'
    | 'NOTE_DELETE'
    | 'NOTE_FOLDER_CREATE'
    | 'NOTE_FOLDER_UPDATE'
    | 'NOTE_FOLDER_DELETE'
    | 'ROOM_CREATE'
    | 'ROOM_INVITE_CREATE'
    | 'ROOM_JOIN'
    | 'LINK_POST'
    | 'COLLECTION_DELETE';

export type AuditStatus = 'SUCCESS' | 'FAILURE';

export interface AuditLog {
    _id: string;
    userId: string;
    action: AuditAction;
    status: AuditStatus;
    ipAddress: string;
    metadata: Record<string, any>;
    recordHash: string;
    timestamp: string;
}

export interface AuditLogsResponse {
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
    limit: number;
    offset: number;
}

export interface RecentActivityResponse {
    logs: AuditLog[];
}

/**
 * Human-readable labels for audit actions
 */
export const ACTION_LABELS: Record<AuditAction, string> = {
    LOGIN: 'Logged In',
    LOGOUT: 'Logged Out',
    REGISTER: 'Account Created',
    LOGIN_FAILED: 'Login Failed',
    GPA_UPDATE: 'GPA Updated',
    FILE_UPLOAD: 'File Uploaded',
    FILE_DELETE: 'File Deleted',
    KEY_ROTATION: 'Keys Rotated',
    PROFILE_UPDATE: 'Profile Updated',
    PREFERENCES_UPDATE: 'Preferences Changed',
    COURSE_CREATE: 'Course Added',
    COURSE_DELETE: 'Course Removed',
    CALENDAR_EVENT_CREATE: 'Calendar Event Created',
    CALENDAR_EVENT_UPDATE: 'Calendar Event Updated',
    CALENDAR_EVENT_DELETE: 'Calendar Event Deleted',
    PASSKEY_REGISTER: 'Passkey Registered',
    PASSKEY_LOGIN: 'Passkey Login',
    PASSKEY_REMOVE: 'Passkey Removed',
    PASSWORD_REMOVE: 'Password Removed',
    PASSWORD_UPDATE: 'Password Updated',
    TASK_CREATE: 'Task Created',
    TASK_UPDATE: 'Task Updated',
    TASK_DELETE: 'Task Deleted',
    TASK_REORDER: 'Tasks Reordered',
    NOTE_CREATE: 'Note Created',
    NOTE_UPDATE_METADATA: 'Note Settings Updated',
    NOTE_UPDATE_CONTENT: 'Note Content Updated',
    NOTE_DELETE: 'Note Deleted',
    NOTE_FOLDER_CREATE: 'Note Folder Created',
    NOTE_FOLDER_UPDATE: 'Note Folder Updated',
    NOTE_FOLDER_DELETE: 'Note Folder Deleted',
    ROOM_CREATE: 'Room Created',
    ROOM_INVITE_CREATE: 'Room Invite Created',
    ROOM_JOIN: 'Room Joined',
    LINK_POST: 'Link Posted',
    COLLECTION_DELETE: 'Collection Deleted',
};

/**
 * Icon suggestions for each action type (can be used with lucide-react)
 */
export const ACTION_ICONS: Record<AuditAction, string> = {
    LOGIN: 'LogIn',
    LOGOUT: 'LogOut',
    REGISTER: 'UserPlus',
    LOGIN_FAILED: 'ShieldAlert',
    GPA_UPDATE: 'GraduationCap',
    FILE_UPLOAD: 'Upload',
    FILE_DELETE: 'Trash2',
    KEY_ROTATION: 'KeyRound',
    PROFILE_UPDATE: 'UserCog',
    PREFERENCES_UPDATE: 'Settings',
    COURSE_CREATE: 'BookPlus',
    COURSE_DELETE: 'BookMinus',
    CALENDAR_EVENT_CREATE: 'Calendar',
    CALENDAR_EVENT_UPDATE: 'Calendar',
    CALENDAR_EVENT_DELETE: 'Calendar',
    PASSKEY_REGISTER: 'Key',
    PASSKEY_LOGIN: 'LogIn',
    PASSKEY_REMOVE: 'Trash2',
    PASSWORD_REMOVE: 'Trash2',
    PASSWORD_UPDATE: 'KeyRound',
    TASK_CREATE: 'ClipboardList',
    TASK_UPDATE: 'ClipboardCheck',
    TASK_DELETE: 'Trash2',
    TASK_REORDER: 'ListOrdered',
    NOTE_CREATE: 'FilePlus',
    NOTE_UPDATE_METADATA: 'Settings',
    NOTE_UPDATE_CONTENT: 'FileText',
    NOTE_DELETE: 'FileMinus',
    NOTE_FOLDER_CREATE: 'FolderPlus',
    NOTE_FOLDER_UPDATE: 'Folder',
    NOTE_FOLDER_DELETE: 'FolderMinus',
    ROOM_CREATE: 'Home',
    ROOM_INVITE_CREATE: 'UserPlus',
    ROOM_JOIN: 'Users',
    LINK_POST: 'Link',
    COLLECTION_DELETE: 'Trash2',
};

const auditService = {
    /**
     * Get paginated audit logs for the current user.
     */
    getAuditLogs: async (limit = 50, offset = 0): Promise<AuditLogsResponse> => {
        const response = await apiClient.get<AuditLogsResponse>(PREFIX, {
            params: { limit, offset }
        });
        return response.data;
    },

    /**
     * Get the 5 most recent activities for dashboard widget.
     */
    getRecentActivity: async (): Promise<AuditLog[]> => {
        const response = await apiClient.get<RecentActivityResponse>(`${PREFIX}/recent`);
        return response.data.logs;
    },

    /**
     * Format a timestamp for display.
     */
    formatTimestamp: (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    },

    /**
     * Get human-readable label for an action.
     */
    getActionLabel: (action: AuditAction): string => {
        if (ACTION_LABELS[action]) return ACTION_LABELS[action];

        // Fallback: Convert UNDERSCORE_CASE to Title Case
        return action
            .toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },

    /**
     * Mask IP address for privacy display (show first and last octets).
     */
    maskIpAddress: (ip: string): string => {
        if (!ip || ip === 'unknown') return 'Unknown';

        // Handle IPv4
        if (ip.includes('.')) {
            const parts = ip.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.xxx.xxx.${parts[3]}`;
            }
        }

        // Handle IPv6 or localhost
        if (ip === '::1' || ip === '127.0.0.1') {
            return 'Localhost';
        }

        return ip.length > 10 ? `${ip.slice(0, 6)}...${ip.slice(-4)}` : ip;
    }
};

export default auditService;
