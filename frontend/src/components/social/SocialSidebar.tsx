import { memo, useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    alpha,
    useTheme,
    Drawer,
    Divider,
    Button,
    Badge,
    Skeleton,
    useMediaQuery,
} from '@mui/material';
import {
    Add as AddIcon,
    Folder as CollectionIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { CollectionSkeleton } from './SocialSkeletons';
import { Reorder, motion } from 'framer-motion';
import { useSocialStore } from '@/stores/useSocialStore';
import { useDecryptedCollectionMetadata } from '@/hooks/useDecryptedMetadata';

import type { SocialSidebarProps, CollectionItemProps } from './types';
import {
    SOCIAL_SIDEBAR_WIDTH,
    SOCIAL_RADIUS_LARGE,
    SOCIAL_RADIUS_XSMALL
} from './constants';


const CollectionItem = memo(({
    collection,
    isActive,
    isTarget,
    unviewedCount,
    onClick,
    onContextMenu,
    onTouchStart,
    onTouchEnd,
    onDragOver,
    onDragLeave,
    onDrop,
}: CollectionItemProps) => {
    const theme = useTheme();
    const { name, isDecrypting } = useDecryptedCollectionMetadata(collection);
    const decryptedName = name;

    return (
        <Reorder.Item
            value={collection}
            id={collection._id}
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            style={{ listStyle: 'none' }}
        >
            <Box
                onClick={() => onClick(collection._id)}
                onContextMenu={(e) => onContextMenu(e, collection._id)}
                onTouchStart={() => onTouchStart(collection._id)}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={(e) => {
                    e.preventDefault();
                    onDrop(collection._id);
                }}
                role="button"
                aria-label={`Select collection: ${decryptedName || '...'}`}
                aria-selected={isActive}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: SOCIAL_RADIUS_XSMALL,
                    cursor: 'grab',
                    position: 'relative',
                    transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    bgcolor: isActive
                        ? alpha(theme.palette.primary.main, 0.15)
                        : isTarget
                            ? alpha(theme.palette.primary.main, 0.25)
                            : 'transparent',
                    border: isTarget
                        ? `1px dashed ${theme.palette.primary.main}`
                        : '1px solid transparent',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                    '&:active': {
                        cursor: 'grabbing',
                    },
                    willChange: 'transform',
                }}
            >
                <Badge
                    variant="dot"
                    color="primary"
                    invisible={unviewedCount === 0}
                    sx={{
                        '& .MuiBadge-badge': {
                            border: `2px solid ${theme.palette.background.paper}`,
                            padding: '0 4px',
                        }
                    }}
                >
                    <CollectionIcon
                        sx={{
                            fontSize: 18,
                            color: isActive ? 'primary.main' : 'text.secondary',
                        }}
                    />
                </Badge>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        noWrap
                        sx={{
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'primary.main' : 'text.primary',
                            flex: 1,
                        }}
                    >
                        {isDecrypting ? <Skeleton width="80%" /> : (decryptedName || '...')}
                    </Typography>
                </Box>
            </Box>
        </Reorder.Item>
    );
});

export const SocialSidebar = memo(({
    isMobile,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    collections,
    selectCollection,
    currentCollectionId,
    handleCollectionContextMenu,
    handleCollectionTouchStart,
    handleCollectionTouchEnd,
    isLoadingContent,
    dropTargetId,
    setDropTargetId,
    handleDrop,
    getUnviewedCountByCollection,
    setShowCollectionDialog,
}: SocialSidebarProps) => {
    const theme = useTheme();
    const reorderCollections = useSocialStore(state => state.reorderCollections);
    const [localCollections, setLocalCollections] = useState(collections);
    const [isDragging, setIsDragging] = useState(false);
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    // Sync local state with props when NOT dragging
    useEffect(() => {
        if (!isDragging) {
            setLocalCollections(collections);
        }
    }, [collections, isDragging]);

    // Handle reorder locally for instant feedback
    const handleLocalReorder = useCallback((newOrder: any[]) => {
        setLocalCollections(newOrder);
        setIsDragging(true);
    }, []);

    const handleCreateCollectionClick = useCallback(() => {
        setShowCollectionDialog(true);
        if (isMobile) setMobileDrawerOpen(false);
    }, [isMobile, setMobileDrawerOpen, setShowCollectionDialog]);

    const handleCloseDrawer = useCallback(() => setMobileDrawerOpen(false), [setMobileDrawerOpen]);

    // Debounced sync to store/backend
    useEffect(() => {
        if (!isDragging) return;

        const timer = setTimeout(() => {
            reorderCollections(localCollections.map(c => c._id));
            setIsDragging(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [localCollections, isDragging, reorderCollections]);

    const handleItemClick = useCallback((id: string) => {
        selectCollection(id);
        if (isMobile) setMobileDrawerOpen(false);
    }, [isMobile, selectCollection, setMobileDrawerOpen]);

    const renderCollectionItem = useCallback((collection: any, isMobileView = false) => {
        return (
            <CollectionItem
                key={collection._id}
                collection={collection}
                isActive={currentCollectionId === collection._id}
                isTarget={dropTargetId === collection._id}
                unviewedCount={getUnviewedCountByCollection(collection._id)}
                isMobileView={isMobileView}
                onClick={handleItemClick}
                onContextMenu={handleCollectionContextMenu}
                onTouchStart={handleCollectionTouchStart}
                onTouchEnd={handleCollectionTouchEnd}
                onDragOver={(e) => {
                    if (!isMobileView) {
                        e.preventDefault();
                        setDropTargetId(collection._id);
                    }
                }}
                onDragLeave={() => !isMobileView && setDropTargetId(null)}
                onDrop={handleDrop}
            />
        );
    }, [currentCollectionId, dropTargetId, getUnviewedCountByCollection, handleCollectionContextMenu, handleCollectionTouchEnd, handleCollectionTouchStart, handleDrop, handleItemClick, setDropTargetId]);

    if (isMobile) {
        return (
            <Drawer
                anchor="left"
                open={mobileDrawerOpen}
                onClose={handleCloseDrawer}
                PaperProps={{
                    sx: {
                        bgcolor: 'background.default',
                        backgroundImage: 'none',
                        width: 240,
                        p: 2,
                    }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>Collections</Typography>
                    <IconButton size="small" onClick={handleCloseDrawer} aria-label="Close sidebar">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Reorder.Group
                        axis="y"
                        values={localCollections}
                        onReorder={handleLocalReorder}
                        style={{ padding: 0 }}
                        layoutId="sidebar-collections"
                    >
                        {localCollections.map((collection) => renderCollectionItem(collection, true))}
                    </Reorder.Group>
                    <Divider sx={{ my: 1 }} />
                    <Button
                        startIcon={<AddIcon />}
                        onClick={handleCreateCollectionClick}
                        sx={{ justifyContent: 'flex-start' }}
                    >
                        New Collection
                    </Button>
                </Box>
            </Drawer>
        );
    }

    return (
        <motion.div
            initial={isDesktop ? { opacity: 0, y: 10 } : false}
            animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Paper
                variant="glass"
                sx={{
                    width: SOCIAL_SIDEBAR_WIDTH,
                    flexShrink: 0,
                    borderRadius: SOCIAL_RADIUS_LARGE,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    height: '100%',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Collections
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => setShowCollectionDialog(true)}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main' }
                        }}
                        aria-label="Create collection"
                    >
                        <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>

            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                mx: -0.5,
                px: 0.5,
            }}>
                {isLoadingContent ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <CollectionSkeleton key={`col-skel-${i}`} />
                    ))
                ) : (
                    <Reorder.Group
                        axis="y"
                        values={localCollections}
                        onReorder={handleLocalReorder}
                        style={{ padding: 0 }}
                        layoutId="sidebar-collections"
                    >
                        {localCollections.map((collection) => renderCollectionItem(collection))}
                    </Reorder.Group>
                )}
            </Box>
            </Paper>
        </motion.div>
    );
});
