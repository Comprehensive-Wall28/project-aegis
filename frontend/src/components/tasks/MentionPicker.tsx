import { useState, useEffect, useCallback, useMemo } from 'react';
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
    Tab,
    Tabs,
} from '@mui/material';
import {
    Folder as FolderIcon,
    Search as SearchIcon,
    ArrowBack as BackIcon,
    ChevronRight as NextIcon,
    AssignmentOutlined as TaskIcon,
    EventOutlined as EventIcon,
} from '@mui/icons-material';
import { getFileIconInfo } from '@/pages/files/utils';
import folderService, { type Folder } from '@/services/folderService';
import vaultService, { type FileMetadata } from '@/services/vaultService';
import taskService from '@/services/taskService';
import calendarService from '@/services/calendarService';
import { useTaskEncryption } from '@/hooks/useTaskEncryption';
import { useCalendarEncryption } from '@/hooks/useCalendarEncryption';

export type MentionEntityType = 'file' | 'task' | 'event';

export interface MentionEntity {
    id: string;
    type: MentionEntityType;
    name: string;
    folderId?: string; // For files
    data: any;
}

interface MentionPickerProps {
    onSelect: (entity: MentionEntity) => void;
    onClose: () => void;
    anchorEl: HTMLElement | null;
}

export const MentionPicker = ({ onSelect, onClose, anchorEl }: MentionPickerProps) => {
    const theme = useTheme();

    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<number>(0);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<Folder[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const { decryptTasks } = useTaskEncryption();
    const { decryptEvents } = useCalendarEncryption();

    const [paginatedTasks, setPaginatedTasks] = useState<any[]>([]);
    const [tasksCursor, setTasksCursor] = useState<string | null>(null);
    const [paginatedEvents, setPaginatedEvents] = useState<any[]>([]);
    const [eventsCursor, setEventsCursor] = useState<string | null>(null);
    const [paginatedFiles, setPaginatedFiles] = useState<FileMetadata[]>([]);
    const [filesCursor, setFilesCursor] = useState<string | null>(null);

    const fetchPaginatedTasks = useCallback(async (cursor?: string, signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            const result = await taskService.getTasksPaginated({ limit: 20, cursor, signal });
            const decrypted = await decryptTasks(result.items);
            const items = 'tasks' in decrypted ? decrypted.tasks : decrypted;

            setPaginatedTasks(prev => cursor ? [...prev, ...items] : items);
            setTasksCursor(result.nextCursor);
        } catch (err: any) {
            // Ignore abort errors
            if (err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
                console.error('Failed to fetch paginated tasks:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [decryptTasks]);

    const fetchPaginatedEvents = useCallback(async (cursor?: string, signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            const result = await calendarService.getEventsPaginated({ limit: 20, cursor, signal });
            const decrypted = await decryptEvents(result.items);

            setPaginatedEvents(prev => cursor ? [...prev, ...decrypted] : decrypted);
            setEventsCursor(result.nextCursor);
        } catch (err: any) {
            // Ignore abort errors
            if (err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
                console.error('Failed to fetch paginated events:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [decryptEvents]);

    // Fetch data with AbortController for cancellation on close/tab change
    useEffect(() => {
        if (!anchorEl) return;

        const controller = new AbortController();

        if (activeTab === 1 && paginatedTasks.length === 0) {
            fetchPaginatedTasks(undefined, controller.signal);
        }
        if (activeTab === 2 && paginatedEvents.length === 0) {
            fetchPaginatedEvents(undefined, controller.signal);
        }

        return () => controller.abort();
    }, [activeTab, anchorEl, fetchPaginatedTasks, fetchPaginatedEvents, paginatedTasks.length, paginatedEvents.length]);

    // Reset selected index when results or tab change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery, activeTab, folders, paginatedFiles]);

    // Fetch folders and files for Files tab (with pagination for files)
    const fetchData = useCallback(async (folderId: string | null, signal?: AbortSignal) => {
        setIsLoading(true);
        try {
            // Folders are typically not paginated (usually few)
            const foldersData = await folderService.getFolders(folderId);
            setFolders(foldersData);

            // Paginated file fetch
            const filesResult = await vaultService.getFilesPaginated({ folderId, limit: 20, signal });
            setPaginatedFiles(filesResult.items);
            setFilesCursor(filesResult.nextCursor);
        } catch (err: any) {
            if (err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
                console.error('Failed to fetch picker data:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch files when Files tab is active and folder changes
    useEffect(() => {
        if (!anchorEl || activeTab !== 0) return;

        const controller = new AbortController();
        fetchData(currentFolderId, controller.signal);

        return () => controller.abort();
    }, [currentFolderId, fetchData, anchorEl, activeTab]);

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

    const filteredFilesEntities = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const f = paginatedFiles.filter(file => file.originalFileName.toLowerCase().includes(query));
        const foldersList = folders.filter(folder => folder.name.toLowerCase().includes(query));

        return { folders: foldersList, files: f };
    }, [paginatedFiles, folders, searchQuery]);

    const filteredTasks = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return paginatedTasks.filter(task => task.title.toLowerCase().includes(query));
    }, [paginatedTasks, searchQuery]);

    const filteredEvents = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return paginatedEvents.filter(event => event.title.toLowerCase().includes(query));
    }, [paginatedEvents, searchQuery]);

    const currentItemsCount = useMemo(() => {
        if (activeTab === 0) return filteredFilesEntities.folders.length + filteredFilesEntities.files.length;
        if (activeTab === 1) return filteredTasks.length;
        if (activeTab === 2) return filteredEvents.length;
        return 0;
    }, [activeTab, filteredFilesEntities, filteredTasks, filteredEvents]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (currentItemsCount || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + (currentItemsCount || 1)) % (currentItemsCount || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            if (activeTab === 0) {
                if (selectedIndex < filteredFilesEntities.folders.length) {
                    const folder = filteredFilesEntities.folders[selectedIndex];
                    if (folder) handleFolderClick(folder);
                } else {
                    const file = filteredFilesEntities.files[selectedIndex - filteredFilesEntities.folders.length];
                    if (file) onSelect({ id: file._id, type: 'file', name: file.originalFileName, folderId: file.folderId || undefined, data: file });
                }
            } else if (activeTab === 1) {
                const task = filteredTasks[selectedIndex];
                if (task) onSelect({ id: task._id, type: 'task', name: task.title, data: task });
            } else if (activeTab === 2) {
                const event = filteredEvents[selectedIndex];
                if (event) onSelect({ id: event._id, type: 'event', name: event.title, data: event });
            }
        } else if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            setActiveTab(prev => (prev + (e.shiftKey ? -1 : 1) + 3) % 3);
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
                        maxHeight: 450,
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
            <Box sx={{ p: 1.5, pb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {activeTab === 0 && currentFolderId && (
                        <IconButton size="small" onClick={handleBack}>
                            <BackIcon fontSize="small" />
                        </IconButton>
                    )}
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        placeholder="Search..."
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
                                '& fieldset': { borderColor: alpha(theme.palette.divider, 0.1) },
                                '&:hover fieldset': { borderColor: alpha(theme.palette.primary.main, 0.3) },
                                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: '1px' },
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
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="fullWidth"
                    sx={{
                        minHeight: 32,
                        '& .MuiTab-root': {
                            minHeight: 32,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            color: theme.palette.text.secondary,
                            '&.Mui-selected': { color: theme.palette.primary.main }
                        },
                        '& .MuiTabs-indicator': { height: 2, borderRadius: '2px' }
                    }}
                >
                    <Tab label="Files" />
                    <Tab label="Tasks" />
                    <Tab label="Events" />
                </Tabs>
            </Box>

            <Divider />

            <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5, minHeight: 150 }}>
                {isLoading && (
                    (activeTab === 0 && folders.length === 0 && paginatedFiles.length === 0) ||
                    (activeTab === 1 && paginatedTasks.length === 0) ||
                    (activeTab === 2 && paginatedEvents.length === 0)
                ) ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : currentItemsCount === 0 && !isLoading ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">No items found</Typography>
                    </Box>
                ) : (
                    <List sx={{ py: 0 }}>
                        {activeTab === 0 && (
                            <>
                                {filteredFilesEntities.folders.map((folder, index) => (
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
                                {filteredFilesEntities.files.map((file, index) => {
                                    const i = index + filteredFilesEntities.folders.length;
                                    const { icon: FileTypeIcon, color: iconColor } = getFileIconInfo(file.originalFileName);
                                    return (
                                        <ListItem
                                            key={file._id}
                                            component="div"
                                            dense
                                            onClick={() => onSelect({ id: file._id, type: 'file', name: file.originalFileName, folderId: file.folderId || undefined, data: file })}
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
                                {filesCursor && (
                                    <ListItem
                                        component="div"
                                        dense
                                        onClick={async () => {
                                            if (isLoading) return;
                                            setIsLoading(true);
                                            try {
                                                const result = await vaultService.getFilesPaginated({
                                                    folderId: currentFolderId,
                                                    limit: 20,
                                                    cursor: filesCursor
                                                });
                                                setPaginatedFiles(prev => [...prev, ...result.items]);
                                                setFilesCursor(result.nextCursor);
                                            } catch (err) {
                                                console.error('Failed to load more files:', err);
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        }}
                                        sx={{
                                            cursor: isLoading ? 'default' : 'pointer',
                                            textAlign: 'center',
                                            py: 1,
                                            '&:hover': { bgcolor: isLoading ? 'transparent' : alpha(theme.palette.primary.main, 0.04) }
                                        }}
                                    >
                                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                            {isLoading ? (
                                                <CircularProgress size={16} />
                                            ) : (
                                                <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                                                    Load more files...
                                                </Typography>
                                            )}
                                        </Box>
                                    </ListItem>
                                )}
                            </>
                        )}
                        {activeTab === 1 && filteredTasks.map((task, index) => (
                            <ListItem
                                key={task._id}
                                component="div"
                                dense
                                onClick={() => onSelect({ id: task._id, type: 'task', name: task.title, data: task })}
                                sx={{
                                    cursor: 'pointer',
                                    bgcolor: selectedIndex === index ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <TaskIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={task.title}
                                    secondary={task.status.replace('_', ' ')}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    secondaryTypographyProps={{ variant: 'caption', sx: { textTransform: 'capitalize' } }}
                                />
                            </ListItem>
                        ))}
                        {activeTab === 1 && tasksCursor && (
                            <ListItem
                                component="div"
                                dense
                                onClick={() => !isLoading && fetchPaginatedTasks(tasksCursor)}
                                sx={{
                                    cursor: isLoading ? 'default' : 'pointer',
                                    textAlign: 'center',
                                    py: 1,
                                    '&:hover': { bgcolor: isLoading ? 'transparent' : alpha(theme.palette.primary.main, 0.04) }
                                }}
                            >
                                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    {isLoading ? (
                                        <CircularProgress size={16} />
                                    ) : (
                                        <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                                            Load more tasks...
                                        </Typography>
                                    )}
                                </Box>
                            </ListItem>
                        )}
                        {activeTab === 2 && filteredEvents.map((event, index) => (
                            <ListItem
                                key={event._id}
                                component="div"
                                dense
                                onClick={() => onSelect({ id: event._id, type: 'event', name: event.title, data: event })}
                                sx={{
                                    cursor: 'pointer',
                                    bgcolor: selectedIndex === index ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <EventIcon sx={{ color: event.color || theme.palette.warning.main, fontSize: 20 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={event.title}
                                    secondary={new Date(event.startDate).toLocaleDateString()}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    secondaryTypographyProps={{ variant: 'caption' }}
                                />
                            </ListItem>
                        ))}
                        {activeTab === 2 && eventsCursor && (
                            <ListItem
                                component="div"
                                dense
                                onClick={() => !isLoading && fetchPaginatedEvents(eventsCursor)}
                                sx={{
                                    cursor: isLoading ? 'default' : 'pointer',
                                    textAlign: 'center',
                                    py: 1,
                                    '&:hover': { bgcolor: isLoading ? 'transparent' : alpha(theme.palette.primary.main, 0.04) }
                                }}
                            >
                                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    {isLoading ? (
                                        <CircularProgress size={16} />
                                    ) : (
                                        <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                                            Load more events...
                                        </Typography>
                                    )}
                                </Box>
                            </ListItem>
                        )}
                    </List>
                )}
            </Box>
        </Popover>
    );
};
