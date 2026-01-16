import { memo } from 'react';
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
} from '@mui/material';
import {
    Add as AddIcon,
    Folder as CollectionIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { CollectionSkeleton } from './SocialSkeletons';

interface SocialSidebarProps {
    isMobile: boolean;
    mobileDrawerOpen: boolean;
    setMobileDrawerOpen: (open: boolean) => void;
    collections: any[];
    selectCollection: (id: string) => void;
    currentCollectionId: string | null;
    handleCollectionContextMenu: (event: React.MouseEvent, id: string) => void;
    handleCollectionTouchStart: (id: string) => void;
    handleCollectionTouchEnd: () => void;
    isLoadingContent: boolean;
    decryptedCollections: Map<string, string>;
    dropTargetId: string | null;
    setDropTargetId: (id: string | null) => void;
    handleDrop: (id: string) => void;
    getUnviewedCountByCollection: (id: string) => number;
    setShowCollectionDialog: (show: boolean) => void;
}

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
    decryptedCollections,
    dropTargetId,
    setDropTargetId,
    handleDrop,
    getUnviewedCountByCollection,
    setShowCollectionDialog,
}: SocialSidebarProps) => {
    const theme = useTheme();

    const renderCollectionItem = (collection: any, isMobileView = false) => {
        const isActive = currentCollectionId === collection._id;
        const isTarget = dropTargetId === collection._id;
        const unviewedCount = getUnviewedCountByCollection(collection._id);

        return (
            <Box
                key={collection._id}
                onClick={() => {
                    selectCollection(collection._id);
                    if (isMobileView) setMobileDrawerOpen(false);
                }}
                onContextMenu={(e) => handleCollectionContextMenu(e, collection._id)}
                onTouchStart={() => handleCollectionTouchStart(collection._id)}
                onTouchEnd={handleCollectionTouchEnd}
                onTouchMove={handleCollectionTouchEnd}
                onDragOver={(e) => {
                    if (!isMobileView) {
                        e.preventDefault();
                        setDropTargetId(collection._id);
                    }
                }}
                onDragLeave={() => !isMobileView && setDropTargetId(null)}
                onDrop={(e) => {
                    if (!isMobileView) {
                        e.preventDefault();
                        handleDrop(collection._id);
                    }
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.15s ease',
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
                        {decryptedCollections.get(collection._id) || (collection.type === 'links' ? 'Links' : 'Collection')}
                    </Typography>
                </Box>
            </Box>
        );
    };

    if (isMobile) {
        return (
            <Drawer
                anchor="left"
                open={mobileDrawerOpen}
                onClose={() => setMobileDrawerOpen(false)}
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
                    <IconButton size="small" onClick={() => setMobileDrawerOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {collections.map((collection) => renderCollectionItem(collection, true))}
                    <Divider sx={{ my: 1 }} />
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setShowCollectionDialog(true);
                            setMobileDrawerOpen(false);
                        }}
                        sx={{ justifyContent: 'flex-start' }}
                    >
                        New Collection
                    </Button>
                </Box>
            </Drawer>
        );
    }

    return (
        <Paper
            variant="glass"
            sx={{
                width: 200,
                flexShrink: 0,
                borderRadius: '20px',
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
                    collections.map((collection) => renderCollectionItem(collection))
                )}
            </Box>
        </Paper>
    );
});
