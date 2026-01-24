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
    useMediaQuery,
    LinearProgress,
} from '@mui/material';
import {
    Folder as CollectionIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    Link as LinkIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
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
    isSearchingLinks,
    filteredLinks,
    deleteLink,
    setDraggedLinkId,
    markLinkViewed,
    unmarkLinkViewed,
    setCommentsLink,
    setReaderLink,
    viewedLinkIds,
    commentCounts,
    currentUserId,
    hasMoreLinks,
    loadAllLinks,
    onMoveLink,
    previewLinkId,
    setPreviewLink,
}: LinksContainerProps) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const currentCollection = useMemo(() =>
        collections.find(c => c._id === currentCollectionId) || null
        , [collections, currentCollectionId]);

    const { name: decryptedName, isDecrypting } = useDecryptedCollectionMetadata(currentCollection);

    const handleDelete = useCallback((id: string) => deleteLink(id), [deleteLink]);
    const handleDragStart = useCallback((id: string | null) => setDraggedLinkId(id), [setDraggedLinkId]);
    const handleView = useCallback((id: string) => markLinkViewed(id), [markLinkViewed]);
    const handleUnview = useCallback((id: string) => unmarkLinkViewed(id), [unmarkLinkViewed]);
    const handleCommentsClick = useCallback((link: LinkPost) => setCommentsLink(link), [setCommentsLink]);
    const handleReaderClick = useCallback((link: LinkPost) => setReaderLink(link), [setReaderLink]);
    const handlePreviewClick = useCallback((link: LinkPost | null) => setPreviewLink(link), [setPreviewLink]);
    const handleLoadAll = useCallback(() => loadAllLinks(), [loadAllLinks]);
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), [setSearchQuery]);
    const handleClearSearch = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setSearchQuery('');
    }, [setSearchQuery]);
    const handleMoveClick = useCallback((link: LinkPost) => onMoveLink?.(link), [onMoveLink]);

    return (
        <motion.div
            initial={isDesktop ? { opacity: 0 } : false}
            animate={isDesktop ? { opacity: 1 } : undefined}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
        >
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
                    position: 'relative'
                }}>
                {/* Background Load Progress - Absolutely positioned to prevent layout shift */}
                <AnimatePresence>
                    {(isSearchingLinks || isLoadingLinks || isLoadingContent) && (
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                zIndex: 10,
                                overflow: 'hidden',
                                borderRadius: '0 0 4px 4px'
                            }}
                        >
                            <LinearProgress />
                        </Box>
                    )}
                </AnimatePresence>
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

                <AnimatePresence initial={false}>
                    {filteredLinks.length > 0 ? (
                        <Box
                            key="links-grid"
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.1 } }}
                            transition={{
                                duration: 0.15,
                                ease: 'easeOut'
                            }}
                        >
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
                                            onReaderClick={handleReaderClick}
                                            onPreviewClick={handlePreviewClick}
                                            showPreview={previewLinkId === link._id}
                                            isViewed={viewedLinkIds.has(link._id)}
                                            commentCount={commentCounts[link._id] || 0}
                                            canDelete={
                                                currentUserId === (typeof link.userId === 'object' ? link.userId._id : link.userId)
                                            }
                                            onMoveClick={handleMoveClick}
                                            highlight={searchQuery}
                                        />
                                    </SocialErrorBoundary>
                                ))}
                            </Box>

                            {hasMoreLinks && (
                                <Box
                                    sx={{ mt: 3, mb: 2, display: 'flex', justifyContent: 'center', gap: 2 }}
                                >
                                    <Button
                                        variant="contained"
                                        onClick={handleLoadAll}
                                        disabled={isLoadingLinks}
                                        sx={{
                                            borderRadius: '12px',
                                            px: 6,
                                            py: 1,
                                            minWidth: '200px', // Ensure enough width for text
                                            height: '42px',    // Ensure fixed height
                                            bgcolor: alpha(theme.palette.primary.main, 0.9),
                                            '&:hover': {
                                                bgcolor: theme.palette.primary.main,
                                            },
                                            textTransform: 'none',
                                            fontWeight: 600
                                        }}
                                    >
                                        {isLoadingLinks ? <CircularProgress size={20} color="inherit" /> : 'Load All Links'}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    ) : (isLoadingLinks || isLoadingContent) && !searchQuery ? (
                        <Box
                            key="loading-skeletons"
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.15 }}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 2,
                            }}
                        >
                            {Array.from({ length: 6 }).map((_, i) => (
                                <LinkCardSkeleton key={`link-skel-${i}`} />
                            ))}
                        </Box>
                    ) : (
                        <Box
                            key="empty-state"
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            transition={{ duration: 0.15 }}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 300,
                                gap: 2,
                            }}
                        >
                            {!(isLoadingContent || isLoadingLinks || isSearchingLinks) && filteredLinks.length === 0 && (
                                <>
                                    <LinkIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                                    <Typography color="text.secondary" variant="body1">
                                        {searchQuery.trim()
                                            ? `No results found for "${searchQuery}"`
                                            : "No links shared yet. Be the first!"
                                        }
                                    </Typography>
                                </>
                            )}
                        </Box>
                    )}
                </AnimatePresence>
            </Box>
        </motion.div>
    );
});
