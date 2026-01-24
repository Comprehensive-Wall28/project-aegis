import React from 'react';
import {
    Box,
    Typography,
    Chip,
    alpha,
    useTheme,
    Divider
} from '@mui/material';
import {
    Description,
    AccessTime,
    Tag
} from '@mui/icons-material';
import type { NoteMetadata } from '../../services/noteService';

interface NotePreviewPanelProps {
    previewNote: NoteMetadata | null;
    decryptedTitles: Map<string, string>;
}

export const NotePreviewPanel: React.FC<NotePreviewPanelProps> = ({
    previewNote,
    decryptedTitles
}) => {
    const theme = useTheme();

    if (!previewNote) {
        return (
            <Box sx={{
                width: '100%',
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: '16px',
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                color: 'text.secondary'
            }}>
                <Description sx={{ fontSize: 48, mb: 2, opacity: 0.2 }} />
                <Typography variant="body2" align="center">
                    Hover over a note to view details
                </Typography>
            </Box>
        );
    }

    const title = decryptedTitles.get(previewNote._id) || 'Untitled Note';

    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <Box sx={{
                p: 2.5,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.3 }}>
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.7 }}>
                        ID: {previewNote._id.slice(-6)}
                    </Typography>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2.5, flex: 1, overflowY: 'auto' }}>
                <SectionLabel icon={<AccessTime fontSize="small" />} label="Timestamps" />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    <MetadataRow
                        label="Modified"
                        value={new Date(previewNote.updatedAt).toLocaleString()}
                    />
                    <MetadataRow
                        label="Created"
                        value={new Date(previewNote.createdAt).toLocaleString()}
                    />
                </Box>

                <Divider sx={{ my: 2, opacity: 0.5 }} />

                <SectionLabel icon={<Tag fontSize="small" />} label="Tags" />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {previewNote.tags.length > 0 ? (
                        previewNote.tags.map(tag => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                    borderRadius: '8px',
                                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                    color: theme.palette.secondary.main,
                                    fontWeight: 600,
                                    border: 'none'
                                }}
                            />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            No tags
                        </Typography>
                    )}
                </Box>

                <Box sx={{ mt: 4, p: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: '12px' }}>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ fontSize: '0.8rem' }}>
                        Click the note to open full editor
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

// Helper Components
const SectionLabel = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'primary.main' }}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
            {label}
        </Typography>
    </Box>
);

const MetadataRow = ({ label, value }: { label: string, value: string }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {value}
        </Typography>
    </Box>
);
