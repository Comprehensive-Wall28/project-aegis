import { Box, Typography, alpha, useTheme, Chip, Tooltip, type Theme } from '@mui/material';
import {
    LogIn,
    LogOut,
    UserPlus,
    ShieldAlert,
    GraduationCap,
    Upload,
    Trash2,
    KeyRound,
    UserCog,
    Settings,
    BookPlus,
    BookMinus,
    Calendar,
    Key,
    ClipboardList,
    ClipboardCheck,
    ListOrdered,
    FilePlus,
    FileText,
    FileMinus,
    FolderPlus,
    Folder,
    FolderMinus,
    Home,
    Users,
    Link as LinkIcon,
    type LucideIcon,
} from 'lucide-react';
import type { AuditLog, AuditAction } from '@/services/auditService';
import auditService from '@/services/auditService';

// Map action to icon component
const ACTION_ICON_MAP: Record<AuditAction, LucideIcon> = {
    LOGIN: LogIn,
    LOGOUT: LogOut,
    REGISTER: UserPlus,
    LOGIN_FAILED: ShieldAlert,
    GPA_UPDATE: GraduationCap,
    FILE_UPLOAD: Upload,
    FILE_DELETE: Trash2,
    KEY_ROTATION: KeyRound,
    PROFILE_UPDATE: UserCog,
    PREFERENCES_UPDATE: Settings,
    COURSE_CREATE: BookPlus,
    COURSE_DELETE: BookMinus,
    CALENDAR_EVENT_CREATE: Calendar,
    CALENDAR_EVENT_UPDATE: Calendar,
    CALENDAR_EVENT_DELETE: Calendar,
    PASSKEY_REGISTER: Key,
    PASSKEY_LOGIN: LogIn,
    PASSKEY_REMOVE: Trash2,
    PASSWORD_REMOVE: Trash2,
    PASSWORD_UPDATE: KeyRound,
    TASK_CREATE: ClipboardList,
    TASK_UPDATE: ClipboardCheck,
    TASK_DELETE: Trash2,
    TASK_REORDER: ListOrdered,
    NOTE_CREATE: FilePlus,
    NOTE_UPDATE_METADATA: Settings,
    NOTE_UPDATE_CONTENT: FileText,
    NOTE_DELETE: FileMinus,
    NOTE_FOLDER_CREATE: FolderPlus,
    NOTE_FOLDER_UPDATE: Folder,
    NOTE_FOLDER_DELETE: FolderMinus,
    ROOM_CREATE: Home,
    ROOM_INVITE_CREATE: UserPlus,
    ROOM_JOIN: Users,
    LINK_POST: LinkIcon,
    COLLECTION_DELETE: Trash2,
};

// Color scheme for different action categories
const getActionColor = (action: AuditAction, status: 'SUCCESS' | 'FAILURE', theme: Theme) => {
    if (status === 'FAILURE') {
        return theme.palette.error.main;
    }

    switch (action) {
        case 'LOGIN':
        case 'REGISTER':
            return theme.palette.success.main;
        case 'LOGOUT':
            return theme.palette.warning.main;
        case 'FILE_UPLOAD':
        case 'FILE_DELETE':
            return theme.palette.info.main;
        case 'PROFILE_UPDATE':
        case 'PREFERENCES_UPDATE':
            return '#8b5cf6'; // Purple
        case 'COURSE_CREATE':
        case 'COURSE_DELETE':
        case 'GPA_UPDATE':
            return theme.palette.primary.main;
        case 'KEY_ROTATION':
            return '#f59e0b'; // Amber
        default:
            return theme.palette.text.secondary;
    }
};

interface ActivityItemProps {
    log: AuditLog;
    variant?: 'compact' | 'detailed';
    showIp?: boolean;
}

export function ActivityItem({ log, variant = 'compact', showIp = false }: ActivityItemProps) {
    const theme = useTheme();
    const IconComponent = ACTION_ICON_MAP[log.action] || Settings;
    const actionColor = getActionColor(log.action, log.status, theme);
    const isCompact = variant === 'compact';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: isCompact ? 1.5 : 2,
                borderRadius: '24px',
                bgcolor: alpha(theme.palette.background.paper, 0.3),
                border: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    borderColor: alpha(theme.palette.common.white, 0.1),
                }
            }}
        >
            {/* Icon */}
            <Box
                sx={{
                    width: isCompact ? 32 : 40,
                    height: isCompact ? 32 : 40,
                    borderRadius: '10px',
                    bgcolor: alpha(actionColor, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: actionColor,
                    flexShrink: 0,
                }}
            >
                <IconComponent size={isCompact ? 16 : 20} />
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant={isCompact ? 'body2' : 'body1'}
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {auditService.getActionLabel(log.action)}
                    </Typography>
                    {log.status === 'FAILURE' && (
                        <Chip
                            label="Failed"
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: '10px',
                                fontWeight: 700,
                                bgcolor: alpha(theme.palette.error.main, 0.15),
                                color: theme.palette.error.main,
                                border: 'none',
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: '11px' }}
                    >
                        {auditService.formatTimestamp(log.timestamp)}
                    </Typography>
                    {showIp && log.ipAddress && (
                        <Tooltip title={`IP: ${log.ipAddress}`}>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    fontSize: '10px',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    opacity: 0.7,
                                }}
                            >
                                • {auditService.maskIpAddress(log.ipAddress)}
                            </Typography>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {/* Detailed variant extras */}
            {!isCompact && log.metadata && Object.keys(log.metadata).length > 0 && (
                <Tooltip title={JSON.stringify(log.metadata, null, 2)}>
                    <Box
                        sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '8px',
                            bgcolor: alpha(theme.palette.common.white, 0.05),
                            cursor: 'pointer',
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontSize: '10px',
                                fontFamily: '"JetBrains Mono", monospace',
                            }}
                        >
                            +{Object.keys(log.metadata).length} details
                        </Typography>
                    </Box>
                </Tooltip>
            )}
        </Box>
    );
}

export default ActivityItem;
