import { memo } from 'react';
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
}: SocialHeaderProps) => {
    const theme = useTheme();
    const isLoadingContent = useSocialStore((state) => state.isLoadingContent);
    const { name: decryptedName, isDecrypting } = useDecryptedRoomMetadata(currentRoom);

    return (
        <Paper
            variant="glass"
            sx={{
                p: 2,
                borderRadius: isMobile ? '12px' : '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                minHeight: 88,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {viewMode === 'room-content' && (optimisticRoomId || currentRoom) ? (
                    <IconButton onClick={handleExitRoom} edge="start" sx={{ mr: -0.5 }}>
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
                                onChange={(e) => setSearchQuery(e.target.value)}
                                size="small"
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchQuery ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchQuery('')}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '14px',
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
                        >
                            <FilterListIcon />
                        </IconButton>
                    </Tooltip>

                    {isMobile && (
                        <Tooltip title="Copy Invite Link">
                            <IconButton onClick={handleCopyInvite} color="primary">
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
                            View Status
                        </ListSubheader>
                        <MenuItem
                            onClick={() => { handleViewFilterChange('all'); handleFilterClose(); }}
                            selected={viewFilter === 'all'}
                        >
                            All Links
                        </MenuItem>
                        <MenuItem
                            onClick={() => { handleViewFilterChange('viewed'); handleFilterClose(); }}
                            selected={viewFilter === 'viewed'}
                        >
                            Viewed
                        </MenuItem>
                        <MenuItem
                            onClick={() => { handleViewFilterChange('unviewed'); handleFilterClose(); }}
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
                                onClick={() => handleSelectUploader(uploader.id)}
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
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostLink()}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LinkIcon color="action" sx={{ fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    flex: 1,
                                    maxWidth: 400,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '14px',
                                    },
                                }}
                            />

                            <Button
                                variant="contained"
                                onClick={() => handlePostLink()}
                                disabled={!newLinkUrl.trim() || isPostingLink}
                                sx={{ borderRadius: '14px', flexShrink: 0 }}
                            >
                                {isPostingLink ? <CircularProgress size={18} /> : 'Post'}
                            </Button>

                            <Button
                                variant="outlined"
                                startIcon={<CopyIcon />}
                                onClick={handleCopyInvite}
                                sx={{ borderRadius: '14px', flexShrink: 0 }}
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
