import { useState, useEffect, useCallback } from 'react';
import {
    Popover,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    TextField,
    IconButton,
    InputAdornment,
    Typography,
    Box,
    alpha,
    useTheme,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    Folder as FolderIcon,
    Search as SearchIcon,
    ArrowBack as BackIcon,
    ChevronRight as NextIcon,
} from '@mui/icons-material';
import { getFileIconInfo } from '@/pages/files/utils';
import folderService, { type Folder } from '@/services/folderService';
import vaultService, { type FileMetadata } from '@/services/vaultService';

interface FileMentionPickerProps {
    onSelect: (file: FileMetadata) => void;
    onClose: () => void;
    anchorEl: HTMLElement | null;
}

export const FileMentionPicker = ({ onSelect, onClose, anchorEl }: FileMentionPickerProps) => {
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<Folder[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery, folders, files]);

    const fetchData = useCallback(async (folderId: string | null) => {
        setIsLoading(true);
        try {
            const [foldersData, filesData] = await Promise.all([
                folderService.getFolders(folderId),
                vaultService.getRecentFiles(folderId)
            ]);
            setFolders(foldersData);
            setFiles(filesData);
        } catch (err) {
            console.error('Failed to fetch picker data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (anchorEl) fetchData(currentFolderId);
    }, [currentFolderId, fetchData, anchorEl]);

    const handleFolderClick = (folder: Folder) => {
        setFolderPath(prev => [...prev, folder]);
        setCurrentFolderId(folder._id);
        setSearchQuery('');
    };

    const handleBack = () => {
        const newPath = [...folderPath];
        newPath.pop();
        setFolderPath(newPath);
        setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1]._id : null);
        setSearchQuery('');
    };

    const filteredFolders = folders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredFiles = files.filter(f =>
        f.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalItems = filteredFolders.length + filteredFiles.length;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (totalItems || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + (totalItems || 1)) % (totalItems || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation(); // Prevent bubbling to TaskDialog

            if (selectedIndex < filteredFolders.length) {
                const folder = filteredFolders[selectedIndex];
                if (folder) handleFolderClick(folder);
            } else {
                const file = filteredFiles[selectedIndex - filteredFolders.length];
                if (file) onSelect(file);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
                paper: {
                    onKeyDown: handleKeyDown,
                    sx: {
                        width: 320,
                        maxHeight: 400,
                        borderRadius: '16px',
                        mt: 1,
                        overflow: 'hidden',
                        bgcolor: theme.palette.background.paper,
                        backgroundImage: 'none',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: theme.shadows[10],
                    }
                }
            }}
        >
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                {currentFolderId && (
                    <IconButton size="small" onClick={handleBack}>
                        <BackIcon fontSize="small" />
                    </IconButton>
                )}
                <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    placeholder="Search files or folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                            e.preventDefault();
                        }
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            bgcolor: alpha(theme.palette.text.primary, 0.03),
                            transition: theme.transitions.create(['border-color', 'box-shadow']),
                            '& fieldset': {
                                borderColor: alpha(theme.palette.divider, 0.1),
                            },
                            '&:hover fieldset': {
                                borderColor: alpha(theme.palette.primary.main, 0.3),
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: theme.palette.primary.main,
                                borderWidth: '1px',
                            },
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <Divider />

            <Box sx={{
                py: 0.8,
                px: 1.5,
                bgcolor: alpha(theme.palette.text.primary, 0.02),
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`
            }}>
                <Typography variant="caption" sx={{
                    fontWeight: 700,
                    color: theme.palette.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '0.625rem',
                    display: 'block'
                }}>
                    {currentFolderId ? folderPath.map(f => f.name).join(' / ') : 'Root Directory'}
                </Typography>
            </Box>

            <List sx={{ flex: 1, overflowY: 'auto', py: 0, minHeight: 100 }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : totalItems === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">No files or folders found</Typography>
                    </Box>
                ) : (
                    <>
                        {filteredFolders.map((folder, index) => (
                            <ListItem
                                key={folder._id}
                                component="div"
                                dense
                                onClick={() => handleFolderClick(folder)}
                                sx={{
                                    cursor: 'pointer',
                                    bgcolor: selectedIndex === index ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <FolderIcon sx={{ color: folder.color || theme.palette.primary.main, fontSize: 20 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={folder.name}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                />
                                <NextIcon sx={{ fontSize: 16, opacity: 0.3 }} />
                            </ListItem>
                        ))}
                        {filteredFiles.map((file, index) => {
                            const i = index + filteredFolders.length;
                            const { icon: FileTypeIcon, color: iconColor } = getFileIconInfo(file.originalFileName);
                            return (
                                <ListItem
                                    key={file._id}
                                    component="div"
                                    dense
                                    onClick={() => onSelect(file)}
                                    sx={{
                                        cursor: 'pointer',
                                        bgcolor: selectedIndex === i ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <FileTypeIcon sx={{ color: iconColor, fontSize: 20 }} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={file.originalFileName}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                </ListItem>
                            );
                        })}
                    </>
                )}
            </List>
        </Popover>
    );
};
