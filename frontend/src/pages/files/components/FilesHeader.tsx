import { useCallback } from 'react';
import { Box, Typography, Stack, Button, useTheme, alpha } from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    Delete as TrashIcon,
    CreateNewFolder as CreateFolderIcon,
    FileUpload as UploadIcon,
    DriveFileMove as MoveIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface FilesHeaderProps {
    fileCount: number;
    selectedCount: number;
    showUpload: boolean;
    onMassDelete: () => void;
    onNewFolder: () => void;
    onToggleUpload: () => void;
    onMove: () => void;
}

export function FilesHeader({
    fileCount,
    selectedCount,
    showUpload,
    onMassDelete,
    onNewFolder,
    onToggleUpload,
    onMove,
}: FilesHeaderProps) {
    const theme = useTheme();

    const handleMassDeleteClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onMassDelete();
    }, [onMassDelete]);

    const handleNewFolderClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onNewFolder();
    }, [onNewFolder]);

    const handleToggleUploadClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onToggleUpload();
    }, [onToggleUpload]);

    const handleMoveClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onMove();
    }, [onMove]);

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box>
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    <FolderOpenIcon color="primary" sx={{ fontSize: { xs: 24, sm: 32 } }} />
                    <span>Encrypted Files</span>
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {fileCount} file{fileCount !== 1 ? 's' : ''} in your vault
                </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                <AnimatePresence>
                    {selectedCount > 0 && (
                        <Stack component={motion.div} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} direction="row" spacing={1}>
                            <Button
                                variant="contained"
                                color="warning"
                                size="small"
                                startIcon={<MoveIcon />}
                                onClick={handleMoveClick}
                                sx={{
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.3)}`
                                }}
                            >
                                Move ({selectedCount})
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                size="small"
                                startIcon={<TrashIcon />}
                                onClick={handleMassDeleteClick}
                                sx={{ fontWeight: 700, borderRadius: '8px', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                            >
                                Delete
                            </Button>
                        </Stack>
                    )}
                </AnimatePresence>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CreateFolderIcon />}
                    onClick={handleNewFolderClick}
                    sx={{
                        fontWeight: 700,
                        borderRadius: '8px',
                        borderColor: alpha(theme.palette.warning.main, 0.3),
                        color: theme.palette.warning.main,
                        height: { xs: 32, sm: 36 },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        px: { xs: 1.5, sm: 2 },
                        '&:hover': { borderColor: theme.palette.warning.main, bgcolor: alpha(theme.palette.warning.main, 0.05) }
                    }}
                >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>New </Box>Folder
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    onClick={handleToggleUploadClick}
                    sx={{
                        fontWeight: 700,
                        borderRadius: '8px',
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                        height: { xs: 32, sm: 36 },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        px: { xs: 1.5, sm: 2 },
                        '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }
                    }}
                >
                    {showUpload ? 'Close' : 'Upload'}
                </Button>
            </Stack>
        </Box>
    );
}
