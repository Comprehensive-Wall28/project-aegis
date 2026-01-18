import { memo, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    IconButton,
    alpha,
    useTheme,
    Button,
    TextField,
    InputAdornment,
    CircularProgress,
    Skeleton,
} from '@mui/material';
import {
    Folder as CollectionIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    Link as LinkIcon,
} from '@mui/icons-material';
import { LinkCardSkeleton } from './SocialSkeletons';
import { LinkCard } from './LinkCard';
import { SocialErrorBoundary } from './SocialErrorBoundary';
import type { LinkPost } from '@/services/socialService';
import { useDecryptedCollectionMetadata } from '@/hooks/useDecryptedMetadata';

import type { LinksContainerProps } from './types';

export const LinksContainer = memo(({
    linksContainerRef,
    isMobile,
    currentCollectionId,
    collections,
    setMobileDrawerOpen,
    searchQuery,
    setSearchQuery,
    isLoadingContent,
    isLoadingLinks,
    filteredLinks,
    deleteLink,
    setDraggedLinkId,
    markLinkViewed,
    unmarkLinkViewed,
    setCommentsLink,
    viewedLinkIds,
    commentCounts,
    currentUserId,
    hasMoreLinks,
    loadMoreLinks,
    loadAllLinks,
    onMoveLink,
}: LinksContainerProps) => {
    const theme = useTheme();

    const currentCollection = useMemo(() =>
        collections.find(c => c._id === currentCollectionId) || null
        , [collections, currentCollectionId]);

    const { name: decryptedName, isDecrypting } = useDecryptedCollectionMetadata(currentCollection);

    const handleDelete = useCallback((id: string) => deleteLink(id), [deleteLink]);
    const handleDragStart = useCallback((id: string | null) => setDraggedLinkId(id), [setDraggedLinkId]);
    const handleView = useCallback((id: string) => markLinkViewed(id), [markLinkViewed]);
    const handleUnview = useCallback((id: string) => unmarkLinkViewed(id), [unmarkLinkViewed]);
    const handleCommentsClick = useCallback((link: LinkPost) => setCommentsLink(link), [setCommentsLink]);
    const handleLoadMore = useCallback(() => loadMoreLinks(), [loadMoreLinks]);
    const handleLoadAll = useCallback(() => loadAllLinks(), [loadAllLinks]);
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), [setSearchQuery]);
    const handleClearSearch = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setSearchQuery('');
    }, [setSearchQuery]);
    const handleMoveClick = useCallback((link: LinkPost) => onMoveLink?.(link), [onMoveLink]);

    return (
        <Box
            ref={linksContainerRef}
            sx={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                overflowX: 'hidden',
                overflowY: 'auto',
                pr: 1,
                pt: 1,
                px: 1,
                pb: isMobile ? 12 : 2,
            }}>
            {isMobile && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CollectionIcon />}
                        onClick={() => setMobileDrawerOpen(true)}
                        sx={{
                            borderRadius: '12px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            borderColor: alpha(theme.palette.divider, 0.2),
                            color: 'text.primary',
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            maxWidth: '45%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            justifyContent: 'flex-start',
                            '& .MuiButton-startIcon': { flexShrink: 0 },
                        }}
                    >
                        <Typography variant="button" noWrap sx={{ textTransform: 'none' }}>
                            {isDecrypting ? <Skeleton width={60} /> : (decryptedName || 'Collections')}
                        </Typography>
                    </Button>
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
                                        <IconButton size="small" onClick={handleClearSearch}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined
                            }
                        }}
                        sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                bgcolor: alpha(theme.palette.background.paper, 0.5),
                                '& fieldset': {
                                    borderColor: alpha(theme.palette.divider, 0.2),
                                },
                            }
                        }}
                    />
                </Box>
            )}

            {(isLoadingContent || (isLoadingLinks && filteredLinks.length === 0)) ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 2,
                    }}
                >
                    {Array.from({ length: 12 }).map((_, i) => (
                        <LinkCardSkeleton key={`link-skel-${i}`} />
                    ))}
                </Box>
            ) : filteredLinks.length > 0 ? (
                <>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 2,
                        }}
                    >
                        {filteredLinks.map((link: LinkPost) => (
                            <SocialErrorBoundary key={link._id} componentName="Link Card">
                                <LinkCard
                                    link={link}
                                    onDelete={handleDelete}
                                    onDragStart={handleDragStart}
                                    onView={handleView}
                                    onUnview={handleUnview}
                                    onCommentsClick={handleCommentsClick}
                                    isViewed={viewedLinkIds.has(link._id)}
                                    commentCount={commentCounts[link._id] || 0}
                                    canDelete={
                                        currentUserId === (typeof link.userId === 'object' ? link.userId._id : link.userId)
                                    }
                                    onMoveClick={handleMoveClick}
                                />
                            </SocialErrorBoundary>
                        ))}
                    </Box>

                    {hasMoreLinks && (
                        <Box sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleLoadAll}
                                disabled={isLoadingLinks}
                                sx={{
                                    borderRadius: '12px',
                                    px: 4,
                                    bgcolor: alpha(theme.palette.primary.main, 0.9),
                                    '&:hover': {
                                        bgcolor: theme.palette.primary.main,
                                    }
                                }}
                            >
                                {isLoadingLinks ? <CircularProgress size={20} color="inherit" /> : 'Load All'}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleLoadMore}
                                disabled={isLoadingLinks}
                                startIcon={isLoadingLinks ? <CircularProgress size={20} /> : null}
                                sx={{
                                    borderRadius: '12px',
                                    px: 4,
                                    borderColor: alpha(theme.palette.primary.main, 0.3),
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    }
                                }}
                            >
                                {isLoadingLinks ? 'Loading...' : 'Load More'}
                            </Button>
                        </Box>
                    )}
                </>
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 300,
                        gap: 2,
                    }}
                >
                    <LinkIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                    <Typography color="text.secondary">
                        No links shared yet. Be the first!
                    </Typography>
                </Box>
            )}
        </Box>
    );
});
