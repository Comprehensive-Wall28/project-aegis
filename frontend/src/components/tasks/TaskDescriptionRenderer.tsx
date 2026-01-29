import { useState, useRef, type ElementType } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link, Typography, alpha, Box, Popover, useTheme, Chip, Divider } from '@mui/material';
import {
    AssignmentOutlined as TaskIcon,
    EventOutlined as EventIcon,
    LocationOn as LocationIcon,
    Schedule as TimeIcon,
} from '@mui/icons-material';
import { getFileIconInfo, isPreviewable } from '@/pages/files/utils';
import { useTaskStore } from '@/stores/useTaskStore';
import { useCalendarStore } from '@/stores/useCalendarStore';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import PDFPreviewOverlay from '@/components/vault/PDFPreviewOverlay';
import ImagePreviewOverlay from '@/components/vault/ImagePreviewOverlay';
import dayjs from 'dayjs';

interface TaskDescriptionRendererProps {
    text: string;
    variant?: 'body1' | 'body2' | 'caption';
    sx?: Record<string, unknown>;
}

// Entity types and their prefixes/regex groups
const MENTION_REGEX = /\[([@#~])(.*?)\]\((aegis-\w+):\/\/([\w-/]+)\)/g;

const MentionHoverCard = ({ type, id, anchorEl, onClose }: { type: string; id: string; anchorEl: HTMLElement | null; onClose: () => void }) => {
    const theme = useTheme();
    const { tasks } = useTaskStore();
    const { events } = useCalendarStore();

    const data = type === 'aegis-task'
        ? tasks.find(t => t._id === id)
        : type === 'aegis-event'
            ? events.find(e => e._id === id)
            : null;

    if (!data) return null;

    return (
        <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={onClose}
            disableRestoreFocus
            sx={{ pointerEvents: 'none', mt: 1 }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
                paper: {
                    sx: {
                        p: 2,
                        width: 260,
                        borderRadius: '16px',
                        boxShadow: theme.shadows[10],
                        pointerEvents: 'auto',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(10px)',
                    }
                }
            }}
        >
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {type === 'aegis-task' ? (
                        <TaskIcon sx={{ color: theme.palette.secondary.main, fontSize: 18 }} />
                    ) : (
                        <EventIcon sx={{ color: theme.palette.warning.main, fontSize: 18 }} />
                    )}
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em' }}>
                        {type === 'aegis-task' ? 'TASK SUMMARY' : 'EVENT SUMMARY'}
                    </Typography>
                </Box>

                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, lineHeight: 1.3 }}>
                    {data.title}
                </Typography>

                <Divider sx={{ mb: 1.5, opacity: 0.5 }} />

                {type === 'aegis-task' && 'status' in data ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            <Chip
                                label={data.status.replace('_', ' ')}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main
                                }}
                            />
                        </Box>
                        {'dueDate' in data && data.dueDate && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {dayjs(data.dueDate).format('MMM D, YYYY')}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <TimeIcon sx={{ fontSize: 14, mt: 0.3, color: 'text.secondary' }} />
                            <Box>
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                                    {dayjs('startDate' in data && data.startDate ? data.startDate : '').format('MMM D, h:mm A')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Ends {dayjs('endDate' in data && data.endDate ? data.endDate : '').format('h:mm A')}
                                </Typography>
                            </Box>
                        </Box>
                        {'location' in data && data.location && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" sx={{ fontWeight: 500 }}>{data.location}</Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Popover>
    );
};

export const TaskDescriptionRenderer = ({ text, variant = 'body2', sx }: TaskDescriptionRendererProps) => {
    const theme = useTheme();
    const [hoverEntity, setHoverEntity] = useState<{ type: string; id: string; anchorEl: HTMLElement | null } | null>(null);
    const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!text) return null;

    const parts = [];
    let lastIndex = 0;
    let match;

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, type: string, id: string) => {
        const target = e.currentTarget;
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => {
            setHoverEntity({ type, id, anchorEl: target });
        }, 400);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setHoverEntity(null);
    };

    const handleFileClick = async (e: React.MouseEvent, type: string, path: string, label: string) => {
        if (type !== 'aegis-file' || !isPreviewable(label)) return;

        e.preventDefault();
        e.stopPropagation();

        const pathParts = path.split('/');
        const fileId = pathParts[1] || pathParts[0];

        try {
            const fileData = await vaultService.getFile(fileId);
            setPreviewFile(fileData);
            setIsPreviewOpen(true);
        } catch (err) {
            console.error('Failed to fetch file metadata for preview:', err);
        }
    };

    while ((match = MENTION_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const [, prefix, label, type, path] = match;

        let iconColor = theme.palette.primary.main;
        let targetPath = '';
        let EntityIcon: ElementType = TaskIcon;
        let entityId = path;

        if (type === 'aegis-file') {
            const pathParts = path.split('/');
            const folderId = pathParts[0];
            const fileId = pathParts[1];
            entityId = fileId;
            targetPath = folderId === 'root' ? `/dashboard/files?highlight=${fileId}` : `/dashboard/files/${folderId}?highlight=${fileId}`;
            const { icon, color } = getFileIconInfo(label);
            EntityIcon = icon;
            iconColor = color;
        } else if (type === 'aegis-task') {
            targetPath = `/dashboard/tasks?highlight=${path}`;
            EntityIcon = TaskIcon;
            iconColor = theme.palette.secondary.main;
        } else if (type === 'aegis-event') {
            targetPath = `/dashboard/calendar?highlight=${path}`;
            EntityIcon = EventIcon;
            iconColor = theme.palette.warning.main;
        }

        parts.push(
            <Link
                key={match.index}
                component={RouterLink}
                to={targetPath}
                onClick={(e) => handleFileClick(e, type, path, label)}
                onMouseEnter={(e) => handleMouseEnter(e, type, entityId)}
                onMouseLeave={handleMouseLeave}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: alpha(iconColor, 0.1),
                    color: iconColor,
                    px: 0.8,
                    py: 0.1,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9em',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        bgcolor: alpha(iconColor, 0.2),
                        textDecoration: 'none',
                    },
                    verticalAlign: 'middle',
                }}
            >
                <EntityIcon sx={{ fontSize: '1.1em', color: iconColor }} />
                {prefix}{label}
            </Link>
        );

        lastIndex = MENTION_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return (
        <>
            <Typography
                variant={variant}
                sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.5,
                    ...sx
                }}
            >
                {parts.length > 0 ? parts : text}
            </Typography>

            {hoverEntity && (
                <MentionHoverCard
                    type={hoverEntity.type}
                    id={hoverEntity.id}
                    anchorEl={hoverEntity.anchorEl}
                    onClose={() => setHoverEntity(null)}
                />
            )}

            {previewFile && isPreviewOpen && (
                previewFile.originalFileName.toLowerCase().endsWith('.pdf') ? (
                    <PDFPreviewOverlay
                        isOpen={isPreviewOpen}
                        onClose={() => setIsPreviewOpen(false)}
                        file={previewFile}
                    />
                ) : (
                    <ImagePreviewOverlay
                        isOpen={isPreviewOpen}
                        onClose={() => setIsPreviewOpen(false)}
                        files={[previewFile]}
                        initialFileId={previewFile._id}
                    />
                )
            )}
        </>
    );
};
