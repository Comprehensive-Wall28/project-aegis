import { memo, useCallback, type ChangeEvent } from 'react';
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
} from '@mui/icons-material';
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
    getUniqueUploaders,
    newLinkUrl,
    setNewLinkUrl,
    handlePostLink,
    isPostingLink,
    sortOrder,
    handleSortOrderChange,
}: SocialHeaderProps) => {
    const theme = useTheme();
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {viewMode === 'room-content' && (optimisticRoomId || currentRoom) ? (
                    <IconButton onClick={handleExitRoom} edge="start" sx={{ mr: -0.5 }} aria-label="Exit room">
                        <ArrowBackIcon />
                    </IconButton>
                ) : (
                    <GroupIcon sx={{ color: 'primary.main' }} />
                )}
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {viewMode === 'room-content' && (optimisticRoomId || currentRoom)
                            ? (isLoadingContent || isDecrypting || (optimisticRoomId && currentRoom && optimisticRoomId !== currentRoom._id)
                                ? <Skeleton width={120} />
                                : (decryptedName || '...'))
                            : 'Social Rooms'}
                    </Typography>
                    {viewMode === 'room-content' && (optimisticRoomId || currentRoom) && (
                        isLoadingContent || (optimisticRoomId && currentRoom && optimisticRoomId !== currentRoom._id) ? (
                            <Skeleton width={80} height={20} />
                        ) : currentRoom && (
                            <Typography variant="caption" color="text.secondary">
                                {currentRoom.memberCount || 1} member{(currentRoom.memberCount || 1) > 1 ? 's' : ''}
                            </Typography>
                        )
                    )}
                </Box>
            </Box>

            {viewMode === 'room-content' && currentRoom && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' }}>
                    {!isMobile && (
                        <Box sx={{ width: 250, display: 'flex', overflow: 'hidden' }}>
                            <TextField
                                placeholder="Search links..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                size="small"
                                fullWidth
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
                        <IconButton
                            onClick={handleFilterClick}
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
                    </Tooltip>

                    {isMobile && (
                        <Tooltip title="Copy Invite Link">
                            <IconButton onClick={handleCopyInvite} color="primary" aria-label="Copy invite link">
                                <ShareIcon />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Menu
                        anchorEl={filterAnchorEl}
                        open={Boolean(filterAnchorEl)}
                        onClose={handleFilterClose}
                        PaperProps={{
                            variant: 'solid',
                            elevation: 8,
                            sx: {
                                minWidth: 220,
                                mt: 1,
                                bgcolor: theme.palette.background.paper,
                                backgroundImage: 'none',
                                border: `1px solid ${theme.palette.divider}`,
                                '& .MuiList-root': {
                                    pt: 0,
                                }
                            }
                        }}
                    >
                        <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '36px' }}>
                            Sort Order
                        </ListSubheader>
                        <MenuItem
                            onClick={handleSortLatest}
                            selected={sortOrder === 'latest'}
                        >
                            Latest First
                        </MenuItem>
                        <MenuItem
                            onClick={handleSortOldest}
                            selected={sortOrder === 'oldest'}
                        >
                            Oldest First
                        </MenuItem>

                        <Divider sx={{ my: 1 }} />

                        <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '36px' }}>
                            View Status
                        </ListSubheader>
                        <MenuItem
                            onClick={handleViewFilterAll}
                            selected={viewFilter === 'all'}
                        >
                            All Links
                        </MenuItem>
                        <MenuItem
                            onClick={handleViewFilterViewed}
                            selected={viewFilter === 'viewed'}
                        >
                            Viewed
                        </MenuItem>
                        <MenuItem
                            onClick={handleViewFilterUnviewed}
                            selected={viewFilter === 'unviewed'}
                        >
                            Unviewed
                        </MenuItem>

                        <Divider sx={{ my: 1 }} />

                        <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '36px' }}>
                            Uploaders
                        </ListSubheader>
                        <MenuItem
                            onClick={() => handleSelectUploader(null)}
                            selected={selectedUploader === null}
                        >
                            All Uploaders
                        </MenuItem>
                        {getUniqueUploaders().map((uploader) => (
                            <MenuItem
                                key={uploader.id}
                                onClick={() => handleUploaderSelect(uploader.id)}
                                selected={selectedUploader === uploader.id}
                            >
                                {uploader.username}
                            </MenuItem>
                        ))}
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
                                sx={{ borderRadius: SOCIAL_RADIUS_MEDIUM, flexShrink: 0 }}
                                aria-label="Post link"
                            >
                                {isPostingLink ? <CircularProgress size={18} /> : 'Post'}
                            </Button>

                            <Button
                                variant="outlined"
                                startIcon={<CopyIcon />}
                                onClick={handleCopyInvite}
                                sx={{ borderRadius: SOCIAL_RADIUS_MEDIUM, flexShrink: 0 }}
                            >
                                Invite
                            </Button>
                        </>
                    )}
                </Box>
            )}
        </Paper>
    );
});
