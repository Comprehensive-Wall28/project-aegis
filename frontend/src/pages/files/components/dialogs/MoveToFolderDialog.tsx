import { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Stack, Typography, IconButton, Box, alpha, useTheme,
    Breadcrumbs, Link, CircularProgress
} from '@mui/material';
import {
    Home as HomeIcon,
    Folder as FolderIcon,
    ArrowForwardIos as ChevronIcon,
    ChevronLeft as BackIcon
} from '@mui/icons-material';
import folderService, { type Folder } from '@/services/folderService';

interface MoveToFolderDialogProps {
    open: boolean;
    onClose: () => void;
    currentFolderId: string | null;
    fileCount: number;
    onMove: (targetFolderId: string | null) => void;
}

export function MoveToFolderDialog({
    open,
    onClose,
    currentFolderId: initialFolderId,
    fileCount,
    onMove
}: MoveToFolderDialogProps) {
    const theme = useTheme();
    const [currentNavId, setCurrentNavId] = useState<string | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [path, setPath] = useState<{ id: string | null, name: string }[]>([{ id: null, name: 'Root' }]);
    const [isLoading, setIsLoading] = useState(false);

    const loadFolders = useCallback(async (parentId: string | null) => {
        try {
            setIsLoading(true);
            const data = await folderService.getFolders(parentId);
            setFolders(data);
        } catch (error) {
            console.error('Failed to load folders in move dialog:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            setCurrentNavId(null);
            setPath([{ id: null, name: 'Root' }]);
            loadFolders(null);
        }
    }, [open, loadFolders]);

    const navigateTo = async (folder: Folder) => {
        setCurrentNavId(folder._id);
        setPath(prev => [...prev, { id: folder._id, name: folder.name }]);
        loadFolders(folder._id);
    };

    const navigateUp = () => {
        if (path.length <= 1) return;
        const newPath = path.slice(0, -1);
        const parent = newPath[newPath.length - 1];
        setPath(newPath);
        setCurrentNavId(parent.id);
        loadFolders(parent.id);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === path.length - 1) return;
        const newPath = path.slice(0, index + 1);
        const target = newPath[newPath.length - 1];
        setPath(newPath);
        setCurrentNavId(target.id);
        loadFolders(target.id);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '24px',
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    }
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                Move {fileCount} item{fileCount !== 1 ? 's' : ''}
            </DialogTitle>

            <DialogContent>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {path.length > 1 && (
                        <IconButton size="small" onClick={navigateUp} sx={{ color: 'text.secondary' }}>
                            <BackIcon fontSize="small" />
                        </IconButton>
                    )}
                    <Breadcrumbs
                        separator={<ChevronIcon sx={{ fontSize: 10, opacity: 0.5 }} />}
                        sx={{ fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        {path.map((p, i) => (
                            <Link
                                key={p.id || 'root'}
                                underline="hover"
                                color={i === path.length - 1 ? 'text.primary' : 'text.secondary'}
                                sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                                onClick={() => handleBreadcrumbClick(i)}
                            >
                                {p.id === null && <HomeIcon sx={{ fontSize: 16 }} />}
                                {p.name}
                            </Link>
                        ))}
                    </Breadcrumbs>
                </Box>

                <Box sx={{
                    minHeight: 240,
                    maxHeight: 400,
                    overflow: 'auto',
                    bgcolor: theme.palette.background.default,
                    borderRadius: '16px',
                    p: 1
                }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : folders.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, opacity: 0.5 }}>
                            <FolderIcon sx={{ fontSize: 48, mb: 1, color: 'warning.main' }} />
                            <Typography variant="body2">No subfolders found</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={0.5}>
                            {folders.map(folder => (
                                <Button
                                    key={folder._id}
                                    fullWidth
                                    onClick={() => navigateTo(folder)}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        textTransform: 'none',
                                        py: 1.5,
                                        px: 2,
                                        borderRadius: '12px',
                                        color: 'text.primary',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                                        }
                                    }}
                                    startIcon={<FolderIcon sx={{ color: 'warning.main' }} />}
                                    endIcon={<ChevronIcon sx={{ fontSize: 12, opacity: 0.3, ml: 'auto' }} />}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {folder.name}
                                    </Typography>
                                </Button>
                            ))}
                        </Stack>
                    )}
                </Box>

                <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary', textAlign: 'center' }}>
                    Navigate to the target folder and click "Move Here"
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => onMove(currentNavId)}
                    disabled={currentNavId === initialFolderId}
                    sx={{
                        borderRadius: '12px',
                        fontWeight: 700,
                        px: 3,
                        boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                >
                    Move Here
                </Button>
            </DialogActions>
        </Dialog>
    );
}
