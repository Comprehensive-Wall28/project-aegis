import { memo, useCallback, useState, type ChangeEvent } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    TextField,
    Button,
    alpha,
    useTheme,
    CircularProgress,
    Tooltip,
    InputAdornment,
    Menu,
    MenuItem,
    Skeleton,
    Divider,
    ListSubheader,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Group as GroupIcon,
    Link as LinkIcon,
    ContentCopy as CopyIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    Share as ShareIcon,
    ArrowBack as ArrowBackIcon,
    AccessTime as TimeIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Person as PersonIcon,
    Check as CheckIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '@/stores/useSocialStore';
import { useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';
import type { SocialHeaderProps } from './types';
import {
    SOCIAL_HEADER_HEIGHT,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_MEDIUM,
    SOCIAL_RADIUS_SMALL
} from './constants';

export const SocialHeader = memo(({
    viewMode,
    isMobile,
    optimisticRoomId,
    currentRoom,
    handleExitRoom,
    searchQuery,
    setSearchQuery,
    handleFilterClick,
    selectedUploader,
    handleCopyInvite,
    filterAnchorEl,
    handleFilterClose,
    handleSelectUploader,
    viewFilter,
    handleViewFilterChange,
    uniqueUploaders,
    newLinkUrl,
    setNewLinkUrl,
    handlePostLink,
    isPostingLink,
    sortOrder,
    handleSortOrderChange,
}: SocialHeaderProps) => {
    const theme = useTheme();
    const [uploaderSearch, setUploaderSearch] = useState('');
    const isLoadingContent = useSocialStore((state) => state.isLoadingContent);
    const { name: decryptedName, isDecrypting } = useDecryptedRoomMetadata(currentRoom);

    const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), [setSearchQuery]);
    const handleClearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);
    const handleNewLinkChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setNewLinkUrl(e.target.value), [setNewLinkUrl]);
    const handlePostKeyDown = useCallback((e: React.KeyboardEvent) => e.key === 'Enter' && handlePostLink(), [handlePostLink]);
    const handleUploaderSelect = useCallback((id: string | null) => handleSelectUploader(id), [handleSelectUploader]);
    const handleViewFilterAll = useCallback(() => { handleViewFilterChange('all'); handleFilterClose(); }, [handleViewFilterChange, handleFilterClose]);
    const handleViewFilterViewed = useCallback(() => { handleViewFilterChange('viewed'); handleFilterClose(); }, [handleViewFilterChange, handleFilterClose]);
    const handleViewFilterUnviewed = useCallback(() => { handleViewFilterChange('unviewed'); handleFilterClose(); }, [handleViewFilterChange, handleFilterClose]);
    const handleSortLatest = useCallback(() => { handleSortOrderChange('latest'); handleFilterClose(); }, [handleSortOrderChange, handleFilterClose]);
    const handleSortOldest = useCallback(() => { handleSortOrderChange('oldest'); handleFilterClose(); }, [handleSortOrderChange, handleFilterClose]);

    // Pre-filter uploaders for the menu to keep main render lightweight
    const filteredUploaders = uniqueUploaders.filter((u: { id: string, username: string }) =>
        u.username.toLowerCase().includes(uploaderSearch.toLowerCase())
    );

    return (
        <Paper
            variant="glass"
            sx={{
                p: 2,
                borderRadius: isMobile ? SOCIAL_RADIUS_SMALL : SOCIAL_RADIUS_XLARGE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                minHeight: SOCIAL_HEADER_HEIGHT + 32, // Accommodating padding
            }}
        >
            <Box sx={{ display: 'grid', alignItems: 'center', justifyItems: 'start', gap: 2, flexShrink: 0 }}>
                <AnimatePresence>
                    {viewMode === 'room-content' && (optimisticRoomId || currentRoom) ? (
                        <Box
                            key="room-header-title-area"
                            component={motion.div}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5, transition: { duration: 0.05 } }}
                            transition={{ duration: 0.15 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, gridArea: '1/1', width: 'max-content' }}
                        >
                            <IconButton onClick={handleExitRoom} edge="start" sx={{ mr: -0.5 }} aria-label="Exit room">
                                <ArrowBackIcon />
                            </IconButton>
                            <Box sx={{ minWidth: 120 }}>
                                <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                                    {isLoadingContent || isDecrypting || (optimisticRoomId && currentRoom && optimisticRoomId !== currentRoom._id)
                                        ? <Skeleton width={120} />
                                        : (decryptedName || '...')}
                                </Typography>
                                <Box sx={{ height: 20 }}>
                                    {isLoadingContent || (optimisticRoomId && currentRoom && optimisticRoomId !== currentRoom._id) ? (
                                        <Skeleton width={80} height={20} />
                                    ) : currentRoom && (
                                        <Typography variant="caption" color="text.secondary">
                                            {currentRoom.memberCount || 1} member{(currentRoom.memberCount || 1) > 1 ? 's' : ''}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            key="social-rooms-title-area"
                            component={motion.div}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5, transition: { duration: 0.05 } }}
                            transition={{ duration: 0.15 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, gridArea: '1/1', width: 'max-content' }}
                        >
                            <GroupIcon sx={{ color: 'primary.main' }} />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Social Rooms
                            </Typography>
                        </Box>
                    )}
                </AnimatePresence>
            </Box>

            <AnimatePresence>
                {viewMode === 'room-content' && (optimisticRoomId || currentRoom) ? (
                    <Box
                        key="header-actions"
                        component={motion.div}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, transition: { duration: 0.05 } }}
                        transition={{ duration: 0.15 }}
                        sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}
                    >
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            {!isMobile && (
                                <Box sx={{ width: 250, display: 'flex', overflow: 'hidden' }}>
                                    <TextField
                                        placeholder="Search links..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        size="small"
                                        fullWidth
                                        disabled={!currentRoom}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon fontSize="small" color="action" />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: searchQuery ? (
                                                    <InputAdornment position="end">
                                                        <IconButton size="small" onClick={handleClearSearch} aria-label="Clear search">
                                                            <CloseIcon fontSize="small" />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ) : undefined,
                                            }
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: SOCIAL_RADIUS_MEDIUM,
                                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                            }
                                        }}
                                    />
                                </Box>
                            )}

                            <Tooltip title="Filter Links">
                                <span>
                                    <IconButton
                                        onClick={handleFilterClick}
                                        disabled={!currentRoom}
                                        sx={{
                                            color: (selectedUploader || viewFilter !== 'all') ? 'primary.main' : 'text.secondary',
                                            bgcolor: (selectedUploader || viewFilter !== 'all') ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                            '&:hover': {
                                                color: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            }
                                        }}
                                        aria-label="Filter links"
                                    >
                                        <FilterListIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            {isMobile && (
                                <Tooltip title="Copy Invite Link">
                                    <span>
                                        <IconButton onClick={handleCopyInvite} color="primary" disabled={!currentRoom} aria-label="Copy invite link">
                                            <ShareIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                        </Box>

                        <Menu
                            anchorEl={filterAnchorEl}
                            open={Boolean(filterAnchorEl)}
                            onClose={handleFilterClose}
                            disableScrollLock
                            PaperProps={{
                                variant: 'solid',
                                elevation: 8,
                                sx: {
                                    minWidth: 260,
                                    mt: 1,
                                    bgcolor: theme.palette.background.paper,
                                    backgroundImage: 'none',
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: SOCIAL_RADIUS_MEDIUM,
                                    '& .MuiList-root': {
                                        pt: 0,
                                    },
                                }
                            }}
                        >
                            <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '40px', color: 'primary.main', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Sort Order
                            </ListSubheader>

                            <MenuItem onClick={handleSortLatest} selected={sortOrder === 'latest'} sx={{ py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <HistoryIcon fontSize="small" color={sortOrder === 'latest' ? 'primary' : 'inherit'} />
                                </ListItemIcon>
                                <ListItemText primary="Latest First" primaryTypographyProps={{ variant: 'body2', fontWeight: sortOrder === 'latest' ? 600 : 400 }} />
                                {sortOrder === 'latest' && <CheckIcon fontSize="small" color="primary" />}
                            </MenuItem>

                            <MenuItem onClick={handleSortOldest} selected={sortOrder === 'oldest'} sx={{ py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <TimeIcon fontSize="small" color={sortOrder === 'oldest' ? 'primary' : 'inherit'} />
                                </ListItemIcon>
                                <ListItemText primary="Oldest First" primaryTypographyProps={{ variant: 'body2', fontWeight: sortOrder === 'oldest' ? 600 : 400 }} />
                                {sortOrder === 'oldest' && <CheckIcon fontSize="small" color="primary" />}
                            </MenuItem>

                            <Divider sx={{ my: 1, opacity: 0.6 }} />

                            <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '40px', color: 'primary.main', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                View Status
                            </ListSubheader>

                            <MenuItem onClick={handleViewFilterAll} selected={viewFilter === 'all'} sx={{ py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <FilterListIcon fontSize="small" color={viewFilter === 'all' ? 'primary' : 'inherit'} />
                                </ListItemIcon>
                                <ListItemText primary="All Links" primaryTypographyProps={{ variant: 'body2', fontWeight: viewFilter === 'all' ? 600 : 400 }} />
                                {viewFilter === 'all' && <CheckIcon fontSize="small" color="primary" />}
                            </MenuItem>

                            <MenuItem onClick={handleViewFilterViewed} selected={viewFilter === 'viewed'} sx={{ py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <VisibilityIcon fontSize="small" color={viewFilter === 'viewed' ? 'primary' : 'inherit'} />
                                </ListItemIcon>
                                <ListItemText primary="Viewed" primaryTypographyProps={{ variant: 'body2', fontWeight: viewFilter === 'viewed' ? 600 : 400 }} />
                                {viewFilter === 'viewed' && <CheckIcon fontSize="small" color="primary" />}
                            </MenuItem>

                            <MenuItem onClick={handleViewFilterUnviewed} selected={viewFilter === 'unviewed'} sx={{ py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <VisibilityOffIcon fontSize="small" color={viewFilter === 'unviewed' ? 'primary' : 'inherit'} />
                                </ListItemIcon>
                                <ListItemText primary="Unviewed" primaryTypographyProps={{ variant: 'body2', fontWeight: viewFilter === 'unviewed' ? 600 : 400 }} />
                                {viewFilter === 'unviewed' && <CheckIcon fontSize="small" color="primary" />}
                            </MenuItem>

                            <Divider sx={{ my: 1, opacity: 0.6 }} />

                            <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '40px', color: 'primary.main', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Uploaders
                            </ListSubheader>

                            {uniqueUploaders.length > 8 && (
                                <Box sx={{ px: 2, pb: 1 }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Filter uploaders..."
                                        value={uploaderSearch}
                                        onChange={(e) => setUploaderSearch(e.target.value)}
                                        autoFocus
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: SOCIAL_RADIUS_SMALL,
                                                height: 32,
                                                fontSize: '0.8125rem',
                                            }
                                        }}
                                    />
                                </Box>
                            )}

                            <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                                <MenuItem onClick={() => handleSelectUploader(null)} selected={selectedUploader === null} sx={{ py: 1 }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <GroupIcon fontSize="small" color={selectedUploader === null ? 'primary' : 'inherit'} />
                                    </ListItemIcon>
                                    <ListItemText primary="All Uploaders" primaryTypographyProps={{ variant: 'body2', fontWeight: selectedUploader === null ? 600 : 400 }} />
                                    {selectedUploader === null && <CheckIcon fontSize="small" color="primary" />}
                                </MenuItem>

                                {filteredUploaders
                                    .map((uploader) => (
                                        <MenuItem
                                            key={uploader.id}
                                            onClick={() => handleUploaderSelect(uploader.id)}
                                            selected={selectedUploader === uploader.id}
                                            sx={{ py: 1 }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <PersonIcon fontSize="small" color={selectedUploader === uploader.id ? 'primary' : 'inherit'} />
                                            </ListItemIcon>
                                            <ListItemText primary={uploader.username} primaryTypographyProps={{ variant: 'body2', fontWeight: selectedUploader === uploader.id ? 600 : 400 }} />
                                            {selectedUploader === uploader.id && <CheckIcon fontSize="small" color="primary" />}
                                        </MenuItem>
                                    ))}

                                {filteredUploaders.length === 0 && (
                                    <Box sx={{ py: 2, px: 3, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            No uploaders found
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Menu>

                        {!isMobile && (
                            <>
                                <TextField
                                    placeholder="Paste a link to share..."
                                    value={newLinkUrl}
                                    onChange={handleNewLinkChange}
                                    onKeyDown={handlePostKeyDown}
                                    size="small"
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LinkIcon color="action" sx={{ fontSize: 18 }} />
                                                </InputAdornment>
                                            ),
                                        }
                                    }}
                                    sx={{
                                        flex: 1,
                                        maxWidth: 400,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: SOCIAL_RADIUS_MEDIUM,
                                        },
                                    }}
                                />

                                <Button
                                    variant="contained"
                                    onClick={() => handlePostLink()}
                                    disabled={!newLinkUrl.trim() || isPostingLink}
                                    sx={{
                                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                                        flexShrink: 0,
                                        minWidth: 90,
                                        height: 40,
                                        boxShadow: theme.shadows[2],
                                    }}
                                    aria-label="Post link"
                                >
                                    {isPostingLink ? <CircularProgress size={20} color="inherit" /> : 'Post'}
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<CopyIcon />}
                                    onClick={handleCopyInvite}
                                    sx={{
                                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                                        flexShrink: 0,
                                        height: 40,
                                        px: 2,
                                    }}
                                >
                                    Invite
                                </Button>
                            </>
                        )}
                    </Box>
                ) : null}
            </AnimatePresence>
        </Paper>
    );
});
