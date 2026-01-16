import { memo, useState, useEffect } from 'react';
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
} from '@mui/material';
import {
    Add as AddIcon,
    Folder as CollectionIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { CollectionSkeleton } from './SocialSkeletons';
import { useSocialStore } from '@/stores/useSocialStore';

interface CollectionItemProps {
    collection: any;
    isActive: boolean;
    isTarget: boolean;
    unviewedCount: number;
    isMobileView: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
}

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
    const decryptCollectionMetadata = useSocialStore((state) => state.decryptCollectionMetadata);
    const [decryptedName, setDecryptedName] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);

    useEffect(() => {
        const decrypt = async () => {
            if (collection.type === 'links' && !collection.name) {
                setDecryptedName('Links');
                return;
            }
            setIsDecrypting(true);
            try {
                const { name } = await decryptCollectionMetadata(collection);
                setDecryptedName(name);
            } catch (err) {
                console.error('Failed to decrypt collection metadata:', err);
                setDecryptedName('Encrypted');
            } finally {
                setIsDecrypting(false);
            }
        };

        decrypt();
    }, [collection, decryptCollectionMetadata]);

    return (
        <Box
            onClick={onClick}
            onContextMenu={onContextMenu}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
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
                    {isDecrypting ? <Skeleton width="80%" /> : (decryptedName || '...')}
                </Typography>
            </Box>
        </Box>
    );
});

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
    dropTargetId,
    setDropTargetId,
    handleDrop,
    getUnviewedCountByCollection,
    setShowCollectionDialog,
}: SocialSidebarProps) => {

    const renderCollectionItem = (collection: any, isMobileView = false) => {
        return (
            <CollectionItem
                key={collection._id}
                collection={collection}
                isActive={currentCollectionId === collection._id}
                isTarget={dropTargetId === collection._id}
                unviewedCount={getUnviewedCountByCollection(collection._id)}
                isMobileView={isMobileView}
                onClick={() => {
                    selectCollection(collection._id);
                    if (isMobileView) setMobileDrawerOpen(false);
                }}
                onContextMenu={(e) => handleCollectionContextMenu(e, collection._id)}
                onTouchStart={() => handleCollectionTouchStart(collection._id)}
                onTouchEnd={handleCollectionTouchEnd}
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
            />
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
        </Paper >
    );
});
