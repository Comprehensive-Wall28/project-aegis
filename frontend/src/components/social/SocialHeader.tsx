import { memo, useCallback, useState, useRef, useEffect, type ChangeEvent } from 'react';
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
    Add as AddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';
import type { SocialHeaderProps } from './types';
import { SocialFilterMenu } from './SocialFilterMenu';
import {
    SOCIAL_HEADER_HEIGHT,
    SOCIAL_RADIUS_XLARGE,
    SOCIAL_RADIUS_MEDIUM,
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
    isSearchingLinks,
    isZenModeOpen,
    onToggleZenMode,
    onCreateRoom,
}: SocialHeaderProps) => {
    const theme = useTheme();
    const { name: decryptedName, isDecrypting } = useDecryptedRoomMetadata(currentRoom);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus search input when expanded
    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), [setSearchQuery]);
    const handleClearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);
    const handleSearchFocus = useCallback(() => setIsSearchExpanded(true), []);
    const handleSearchBlur = useCallback(() => {
        if (!searchQuery) setIsSearchExpanded(false);
    }, [searchQuery]);
    const handleNewLinkChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setNewLinkUrl(e.target.value), [setNewLinkUrl]);
    const handlePostKeyDown = useCallback((e: React.KeyboardEvent) => e.key === 'Enter' && handlePostLink(), [handlePostLink]);

    const showSkeleton = isDecrypting ||
        (viewMode === 'room-content' && !currentRoom) ||
        (optimisticRoomId && currentRoom?._id !== optimisticRoomId);

    return (
        <Paper
            elevation={1}
            sx={{
                p: isMobile ? 1.5 : 2,
                borderRadius: SOCIAL_RADIUS_XLARGE,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                minHeight: isMobile ? (SOCIAL_HEADER_HEIGHT - 8) : (SOCIAL_HEADER_HEIGHT + 32),
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 1, minWidth: 0 }}>
                <AnimatePresence mode="wait">
                    {viewMode === 'room-content' ? (
                        <Box
                            key="room-header-title-area"
                            component={motion.div}
                            initial={{ opacity: 0, x: -2 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -2, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 1, minWidth: 0 }}
                        >
                            <IconButton onClick={handleExitRoom} edge="start" sx={{ mr: 1 }} aria-label="Exit room">
                                <ArrowBackIcon />
                            </IconButton>
                            <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center' }}>
                                <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                                    {showSkeleton
                                        ? <Skeleton width={120} />
                                        : (decryptedName || '...')}
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            key="social-rooms-title-area"
                            component={motion.div}
                            initial={{ opacity: 0, x: -2 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -2, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}
                        >
                            <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: -0.5 }}>
                                <GroupIcon sx={{ color: 'primary.main' }} />
                            </Box>
                            <Box sx={{ flexShrink: 0 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Social Rooms
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </AnimatePresence>
            </Box>

            <Box sx={{ flex: 1, display: 'grid', justifyItems: 'end', alignItems: 'center', minWidth: 0 }}>
                <AnimatePresence mode="wait">
                    {viewMode === 'rooms' ? (
                        <Box
                            key="rooms-actions"
                            component={motion.div}
                            initial={{ opacity: 0, x: 2 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 2, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, gridArea: '1/1' }}
                        >
                            {onCreateRoom && (
                                isMobile ? (
                                    <IconButton
                                        onClick={onCreateRoom}
                                        sx={{
                                            bgcolor: 'primary.main',
                                            color: 'primary.contrastText',
                                            '&:hover': {
                                                bgcolor: 'primary.dark',
                                            },
                                            boxShadow: theme.shadows[2],
                                            width: 32,
                                            height: 32,
                                        }}
                                        aria-label="Create Room"
                                    >
                                        <AddIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                ) : (
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={onCreateRoom}
                                        sx={{
                                            borderRadius: SOCIAL_RADIUS_MEDIUM,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            boxShadow: theme.shadows[2],
                                        }}
                                    >
                                        Create Room
                                    </Button>
                                )
                            )}
                        </Box>
                    ) : (viewMode === 'room-content' && (optimisticRoomId || currentRoom)) ? (
                        <Box
                            key="header-actions"
                            component={motion.div}
                            initial={{ opacity: 0, x: 2 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 2, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.2 }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 2, gridArea: '1/1' }}
                        >
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                {!isMobile && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', transition: 'all 0.3s' }}>
                                        <AnimatePresence mode="wait">
                                            {isSearchExpanded || searchQuery ? (
                                                <Box
                                                    key="search-input"
                                                    component={motion.div}
                                                    initial={{ width: 0, opacity: 0 }}
                                                    animate={{ width: 280, opacity: 1 }}
                                                    exit={{ width: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <TextField
                                                        ref={searchInputRef}
                                                        placeholder="Search links..."
                                                        value={searchQuery}
                                                        onChange={handleSearchChange}
                                                        size="small"
                                                        autoFocus={!searchQuery}
                                                        onFocus={handleSearchFocus}
                                                        onBlur={handleSearchBlur}
                                                        disabled={!currentRoom}
                                                        slotProps={{
                                                            input: {
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        <SearchIcon fontSize="small" color="action" />
                                                                    </InputAdornment>
                                                                ),
                                                                endAdornment: (searchQuery || isSearchingLinks) ? (
                                                                    <InputAdornment position="end">
                                                                        {isSearchingLinks && <CircularProgress size={16} sx={{ mr: 1, color: 'primary.main' }} />}
                                                                        {searchQuery && (
                                                                            <IconButton size="small" onClick={handleClearSearch} aria-label="Clear search">
                                                                                <CloseIcon fontSize="small" />
                                                                            </IconButton>
                                                                        )}
                                                                    </InputAdornment>
                                                                ) : undefined,
                                                            }
                                                        }}
                                                        sx={{
                                                            width: '100%',
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: SOCIAL_RADIUS_MEDIUM,
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                            ) : (
                                                <IconButton
                                                    key="search-button"
                                                    onClick={() => setIsSearchExpanded(true)}
                                                    sx={{
                                                        color: 'text.secondary',
                                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                        bgcolor: 'transparent', // Match header standard
                                                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                                                        '&:hover': {
                                                            bgcolor: alpha(theme.palette.text.primary, 0.05),
                                                            color: 'primary.main'
                                                        }
                                                    }}
                                                >
                                                    <SearchIcon />
                                                </IconButton>
                                            )}
                                        </AnimatePresence>
                                    </Box>
                                )}

                                <Tooltip title="Filter Links">
                                    <span>
                                        <IconButton
                                            onClick={handleFilterClick}
                                            disabled={!currentRoom}
                                            sx={{
                                                color: (selectedUploader || viewFilter !== 'all') ? 'primary.main' : 'text.secondary',
                                                bgcolor: (selectedUploader || viewFilter !== 'all') ? alpha(theme.palette.primary.main, 0.1) : 'transparent', // Consistent transparent bg
                                                border: (selectedUploader || viewFilter !== 'all') ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`, // Add border to match others when inactive
                                                borderRadius: SOCIAL_RADIUS_MEDIUM, // Consistent radius
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
                                                border: isZenModeOpen ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                borderRadius: SOCIAL_RADIUS_MEDIUM,
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
                                            minWidth: 200, // Prevent squishing
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
            </Box>
        </Paper >
    );
});
