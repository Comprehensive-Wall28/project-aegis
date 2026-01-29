import { forwardRef, memo, useDeferredValue } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    useTheme,
    InputBase,
    alpha,
    LinearProgress,
    CircularProgress,
    IconButton,
    Fab,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Menu as MenuIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { SOCIAL_RADIUS_XLARGE, SOCIAL_RADIUS_MEDIUM, SOCIAL_URL_REGEX } from './constants';
import { LinkCard } from './LinkCard';
import { SocialErrorBoundary } from './SocialErrorBoundary';
import { LinkCardSkeleton } from './SocialSkeletons';
import { useSocial } from '@/hooks/useSocial';
import { useDecryptedCollectionMetadata } from '@/hooks/useDecryptedMetadata';
import type { Collection } from '@/services/socialService';

const CollectionName = memo(({ collection }: { collection: Collection }) => {
    const { name, isDecrypting } = useDecryptedCollectionMetadata(collection);
    if (!collection) return null;
    return isDecrypting ? '...' : (name || collection.name);
});

import type { LinksContainerProps } from './types';

export const LinksContainer = memo(forwardRef<HTMLDivElement, LinksContainerProps>(({ noContainer, menuZIndex }, ref) => {
    const theme = useTheme();
    const {
        isMobile,
        collections,
        currentCollectionId,
        setMobileDrawerOpen,
        searchQuery,
        setSearchQuery,
        effectiveIsLoadingContent,
        filteredLinks,
        handleDeleteLink,
        setDraggedLinkId,
        markLinkViewed,
        unmarkLinkViewed,
        toggleOverlay,
        viewedLinkIds,
        commentCounts,
        currentUserId,
        handleOpenMoveDialog,
        previewLink,
        effectiveIsLoadingLinks,
        loadAllLinks,
        hasMoreLinks,
    } = useSocial();

    // Use React 18 useDeferredValue for deferred search display
    const debouncedSearchQuery = useDeferredValue(searchQuery);

    return (
        <Paper
            elevation={noContainer ? 0 : 1}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: noContainer ? 0 : SOCIAL_RADIUS_XLARGE,
                bgcolor: noContainer ? 'transparent' : 'background.paper',
                border: noContainer ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <AnimatePresence>
                {(effectiveIsLoadingLinks) && (
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
                            zIndex: 10,
                        }}
                    >
                        <LinearProgress
                            sx={{
                                height: 3,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                }
                            }}
                        />
                    </Box>
                )}
            </AnimatePresence>
            {isMobile && !noContainer && (
                <Box sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: alpha(theme.palette.background.default, 0.5)
                }}>
                    <Button
                        onClick={() => setMobileDrawerOpen(true)}
                        variant="text"
                        size="small"
                        startIcon={<MenuIcon />}
                        sx={{
                            minWidth: 0,
                            maxWidth: '45%',
                            color: 'text.primary',
                            px: 1,
                            borderRadius: SOCIAL_RADIUS_MEDIUM,
                            '& .MuiButton-startIcon': { mr: 0.5 },
                            '& .MuiTypography-root': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                            }
                        }}
                    >
                        <Typography variant="body2">
                            {currentCollectionId && collections.find(c => c._id === currentCollectionId) ? (
                                <CollectionName collection={collections.find(c => c._id === currentCollectionId)!} />
                            ) : 'All Links'}
                        </Typography>
                    </Button>

                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: alpha(theme.palette.text.primary, 0.05),
                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                        px: 1.5,
                        py: 0.5,
                        minWidth: 0,
                    }}>
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 18, mr: 1 }} />
                        <InputBase
                            placeholder="Search links..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ flex: 1, fontSize: '0.875rem' }}
                        />
                        {searchQuery && (
                            <IconButton
                                size="small"
                                onClick={() => setSearchQuery('')}
                                sx={{ p: 0.5, color: 'text.secondary' }}
                                aria-label="Clear search"
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        )}

                    </Box>
                </Box>
            )}


            {/* Links Grid */}
            <Box
                ref={ref}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: noContainer ? 0 : (isMobile ? 0.5 : 1),
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'minmax(0, 1fr)',
                        sm: 'repeat(auto-fill, minmax(280px, 1fr))',
                        lg: 'repeat(auto-fill, minmax(320px, 1fr))',
                    },
                    gap: 1,
                    alignContent: 'start',
                    minHeight: 0,
                    position: 'relative',
                }}
            >
                <AnimatePresence mode="wait">
                    {effectiveIsLoadingContent ? (
                        <Box
                            key="links-loading-skeleton"
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'minmax(0, 1fr)',
                                    sm: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    lg: 'repeat(auto-fill, minmax(320px, 1fr))',
                                },
                                gap: 'inherit',
                                gridColumn: '1 / -1'
                            }}
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <LinkCardSkeleton key={`link-skeleton-${i}`} />
                            ))}
                        </Box>
                    ) : filteredLinks.length > 0 ? (
                        <Box
                            key="links-grid-content"
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'inherit',
                                gap: 'inherit',
                                gridColumn: '1 / -1',
                                alignContent: 'start',
                                position: 'relative',
                            }}
                        >
                            {filteredLinks.map((link) => (
                                <Box
                                    key={link._id}
                                    sx={{ height: '100%' }}
                                >
                                    <SocialErrorBoundary componentName="Link Card">
                                        <LinkCard
                                            link={link}
                                            isViewed={viewedLinkIds.has(link._id)}
                                            commentCount={commentCounts[link._id] || 0}
                                            canDelete={currentUserId === (typeof link.userId === 'object' ? link.userId._id : link.userId)}
                                            onView={markLinkViewed}
                                            onUnview={unmarkLinkViewed}
                                            onDelete={handleDeleteLink}
                                            onDragStart={setDraggedLinkId}
                                            onMoveClick={() => handleOpenMoveDialog(link)}
                                            onCommentsClick={(l) => toggleOverlay('comments', l._id)}
                                            onReaderClick={(l) => toggleOverlay('reader', l._id)}
                                            onPreviewClick={(l) => toggleOverlay('preview', l?._id || null)}
                                            showPreview={previewLink?._id === link._id}
                                            menuZIndex={menuZIndex}
                                        />
                                    </SocialErrorBoundary>
                                </Box>
                            ))}
                            {hasMoreLinks && (
                                <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', py: 2, width: '100%' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => loadAllLinks()}
                                        disabled={effectiveIsLoadingLinks}
                                        startIcon={effectiveIsLoadingLinks ? <CircularProgress size={20} color="inherit" /> : undefined}
                                        sx={{ borderRadius: SOCIAL_RADIUS_MEDIUM }}
                                    >
                                        {effectiveIsLoadingLinks ? 'Loading...' : 'Load all links'}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box
                            key="links-empty-state"
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                justifyContent: 'center',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <Typography variant="h6" color="text.secondary">
                                {(debouncedSearchQuery && !SOCIAL_URL_REGEX.test(debouncedSearchQuery) && debouncedSearchQuery.trim().length >= 2)
                                    ? 'No links found matching your search'
                                    : 'This collection is empty'}
                            </Typography>
                            {(!debouncedSearchQuery || SOCIAL_URL_REGEX.test(debouncedSearchQuery) || debouncedSearchQuery.trim().length < 2) && (
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    onClick={() => toggleOverlay('post', true)}
                                    sx={{ borderRadius: SOCIAL_RADIUS_MEDIUM }}
                                >
                                    Share the first link
                                </Button>
                            )}
                        </Box>
                    )}
                </AnimatePresence>
            </Box>
            {isMobile && !noContainer && (
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => toggleOverlay('post', true)}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 100,
                    }}
                >
                    <AddIcon />
                </Fab>
            )
            }
        </Paper >
    );
}));
