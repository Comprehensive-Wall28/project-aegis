import { Link as RouterLink } from 'react-router-dom';
import { Link, Typography, alpha } from '@mui/material';
import { getFileIconInfo } from '@/pages/files/utils';

interface TaskDescriptionRendererProps {
    text: string;
    variant?: 'body1' | 'body2' | 'caption';
    sx?: any;
}

const MENTION_REGEX = /\[@(.*?)\]\(aegis-file:\/\/([\w-]+)\/([\w-]+)\)/g;

export const TaskDescriptionRenderer = ({ text, variant = 'body2', sx }: TaskDescriptionRendererProps) => {

    if (!text) return null;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = MENTION_REGEX.exec(text)) !== null) {
        // Push text before match
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const [_fullMatch, fileName, folderId, fileId] = match;
        const targetPath = folderId === 'root' ? `/dashboard/files?highlight=${fileId}` : `/dashboard/files/${folderId}?highlight=${fileId}`;

        const { icon: FileTypeIcon, color: iconColor } = getFileIconInfo(fileName);

        parts.push(
            <Link
                key={match.index}
                component={RouterLink}
                to={targetPath}
                onClick={(e) => e.stopPropagation()}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: alpha(iconColor, 0.1),
                    color: iconColor,
                    px: 0.8,
                    py: 0.2,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9em',
                    '&:hover': {
                        bgcolor: alpha(iconColor, 0.2),
                        textDecoration: 'none',
                    },
                    verticalAlign: 'middle',
                }}
            >
                <FileTypeIcon sx={{ fontSize: '1.1em', color: iconColor }} />
                @{fileName}
            </Link>
        );

        lastIndex = MENTION_REGEX.lastIndex;
    }

    // Push remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return (
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
    );
};
