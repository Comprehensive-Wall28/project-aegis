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
    Skeleton,
} from '@mui/material';
import {
    Group as GroupIcon,
    Link as LinkIcon,
    ContentCopy as CopyIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    FitScreen as ZenModeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';
import type { SocialHeaderProps } from './types';
import { SocialFilterMenu } from './SocialFilterMenu';
import {
    SOCIAL_HEADER_HEIGHT,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_MEDIUM,
    SOCIAL_RADIUS_SMALL,
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
    isZenModeOpen,
    onToggleZenMode,
}: SocialHeaderProps) => {
    const theme = useTheme();
    const { name: decryptedName, isDecrypting } = useDecryptedRoomMetadata(currentRoom);

    const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), [setSearchQuery]);
    const handleClearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);
    const handleNewLinkChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setNewLinkUrl(e.target.value), [setNewLinkUrl]);
    const handlePostKeyDown = useCallback((e: React.KeyboardEvent) => e.key === 'Enter' && handlePostLink(), [handlePostLink]);

    const showSkeleton = isDecrypting ||
        (viewMode === 'room-content' && !currentRoom) ||
        (optimisticRoomId && currentRoom?._id !== optimisticRoomId);

    return (
        <Paper
            elevation={1}
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
                    {viewMode === 'room-content' ? (
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
                                    {showSkeleton
                                        ? <Skeleton width={120} />
                                        : (decryptedName || '...')}
                                </Typography>
                                <Box sx={{ height: 20 }}>
                                    {showSkeleton ? (
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
                                                bgcolor: theme.palette.background.default,
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



                            <Tooltip title={isZenModeOpen ? "Exit Zen Mode (Ctrl+F)" : "Zen Mode (Ctrl+F)"}>
                                <span>
                                    <IconButton
                                        onClick={onToggleZenMode}
                                        disabled={!currentRoom}
                                        sx={{
                                            color: isZenModeOpen ? 'primary.main' : 'text.secondary',
                                            bgcolor: isZenModeOpen ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                            '&:hover': {
                                                color: 'primary.main',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            }
                                        }}
                                        aria-label="Toggle Zen Mode"
                                    >
                                        <ZenModeIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>

                        <SocialFilterMenu
                            anchorEl={filterAnchorEl}
                            open={Boolean(filterAnchorEl)}
                            onClose={handleFilterClose}
                            sortOrder={sortOrder}
                            onSortOrderChange={handleSortOrderChange}
                            viewFilter={viewFilter}
                            onViewFilterChange={handleViewFilterChange}
                            selectedUploader={selectedUploader}
                            onSelectUploader={handleSelectUploader}
                            uniqueUploaders={uniqueUploaders}
                        />

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
                ) : null
                }
            </AnimatePresence >
        </Paper >
    );
});
