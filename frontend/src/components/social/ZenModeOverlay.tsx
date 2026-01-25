import { memo, useEffect, useRef, useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    alpha,
    useTheme,
    Select,
    MenuItem,
    FormControl,
    Skeleton,
    Tooltip,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Close as CloseIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogPortal } from './DialogPortal';
import { SOCIAL_DIALOG_Z_INDEX } from './constants';
import { LinksContainer } from './LinksContainer';
import { SocialFilterMenu } from './SocialFilterMenu';
import type { Collection, LinkPost } from '@/services/socialService';
import { useDecryptedCollectionMetadata } from '@/hooks/useDecryptedMetadata';

interface ZenModeOverlayProps {
    open: boolean;
    onClose: () => void;
    collections: Collection[];
    currentCollectionId: string | null;
    selectCollection: (id: string) => void;
    linksContainerRef: React.RefObject<HTMLDivElement | null>;
    isMobile: boolean;
    effectiveIsLoadingContent: boolean;
    isLoadingLinks: boolean;
    isSearchingLinks: boolean;
    filteredLinks: LinkPost[];
    handleDeleteLink: (id: string) => void;
    setDraggedLinkId: (id: string | null) => void;
    markLinkViewed: (id: string) => void;
    unmarkLinkViewed: (id: string) => void;
    toggleOverlay: (key: string, value: string | boolean | null) => void;
    previewLink: LinkPost | null;
    viewedLinkIds: Set<string>;
    commentCounts: Record<string, number>;
    currentUserId: string | undefined;
    hasMoreLinks: boolean;
    loadAllLinks: () => void;
    handleOpenMoveDialog: (link: LinkPost) => void;
    sortOrder: 'latest' | 'oldest';
    onSortOrderChange: (order: 'latest' | 'oldest') => void;
    viewFilter: 'all' | 'viewed' | 'unviewed';
    onViewFilterChange: (filter: 'all' | 'viewed' | 'unviewed') => void;
    selectedUploader: string | null;
    onSelectUploader: (id: string | null) => void;
    uniqueUploaders: { id: string, username: string }[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const CollectionName = memo(({ collection }: { collection: Collection }) => {
    const { name, isDecrypting } = useDecryptedCollectionMetadata(collection);
    return isDecrypting ? <Skeleton width={60} /> : <>{name || 'Unnamed Collection'}</>;
});

CollectionName.displayName = 'CollectionName';

export const ZenModeOverlay = memo(({
    open,
    onClose,
    collections,
    currentCollectionId,
    selectCollection,
    linksContainerRef,
    isMobile,
    effectiveIsLoadingContent,
    isLoadingLinks,
    isSearchingLinks,
    filteredLinks,
    handleDeleteLink,
    setDraggedLinkId,
    markLinkViewed,
    unmarkLinkViewed,
    toggleOverlay,
    previewLink,
    viewedLinkIds,
    commentCounts,
    currentUserId,
    hasMoreLinks,
    loadAllLinks,
    handleOpenMoveDialog,
    sortOrder,
    onSortOrderChange,
    viewFilter,
    onViewFilterChange,
    selectedUploader,
    onSelectUploader,
    uniqueUploaders,
    searchQuery,
    setSearchQuery,
}: ZenModeOverlayProps) => {
    const theme = useTheme();
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
    };

    // Auto-focus search on open
    useEffect(() => {
        if (open) {
            // Slight delay to ensure animation/mounting is done
            const timer = setTimeout(() => {
                searchRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };

        if (open) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    return (
        <DialogPortal>
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            sx={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: SOCIAL_DIALOG_Z_INDEX - 1,
                                bgcolor: 'rgba(0, 0, 0, 0.85)',
                                backdropFilter: 'blur(10px)',
                            }}
                        />

                        {/* Fullscreen Content */}
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            sx={{
                                position: 'fixed',
                                inset: isMobile ? 0 : 20,
                                zIndex: SOCIAL_DIALOG_Z_INDEX,
                                bgcolor: alpha(theme.palette.background.default, 0.95),
                                borderRadius: isMobile ? 0 : '24px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                border: isMobile ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            {/* Header */}
                            <Box
                                sx={{
                                    p: 2,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: { xs: 1, md: 3 },
                                    flexShrink: 0,
                                    background: alpha(theme.palette.background.paper, 0.5),
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton onClick={onClose} aria-label="Close zen mode">
                                        <CloseIcon />
                                    </IconButton>
                                    {!isMobile && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                bgcolor: alpha(theme.palette.text.primary, 0.1),
                                                px: 0.8,
                                                py: 0.2,
                                                borderRadius: '4px',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                color: theme.palette.text.secondary,
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                height: 20
                                            }}
                                        >
                                            ESC
                                        </Typography>
                                    )}
                                </Box>

                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, display: { xs: 'none', md: 'block' } }}>
                                        Zen Mode
                                    </Typography>

                                    {!isMobile && (
                                        <TextField
                                            placeholder="Search links..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            size="small"
                                            inputRef={searchRef}
                                            autoComplete="off"
                                            slotProps={{
                                                input: {
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <SearchIcon fontSize="small" color="action" />
                                                        </InputAdornment>
                                                    ),
                                                    endAdornment: searchQuery ? (
                                                        <InputAdornment position="end">
                                                            <IconButton size="small" onClick={() => setSearchQuery('')} aria-label="Clear search">
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ) : undefined,
                                                }
                                            }}
                                            sx={{
                                                flex: 1,
                                                maxWidth: 400,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '12px',
                                                    bgcolor: theme.palette.background.paper,
                                                }
                                            }}
                                        />
                                    )}

                                    <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 180 } }}>
                                        <Select
                                            value={currentCollectionId || ''}
                                            onChange={(e) => selectCollection(e.target.value as string)}
                                            MenuProps={{
                                                style: { zIndex: SOCIAL_DIALOG_Z_INDEX + 10 },
                                                variant: 'selectedMenu',
                                                PaperProps: {
                                                    sx: {
                                                        bgcolor: theme.palette.background.paper,
                                                        backgroundImage: 'none',
                                                        borderRadius: '16px',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                                    }
                                                }
                                            }}
                                            sx={{
                                                borderRadius: '12px',
                                                bgcolor: theme.palette.background.paper,
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: alpha(theme.palette.divider, 0.1),
                                                },
                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: theme.palette.primary.main,
                                                }
                                            }}
                                        >
                                            {collections.map((col) => (
                                                <MenuItem key={col._id} value={col._id}>
                                                    <CollectionName collection={col} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <Tooltip title="Filter Links">
                                        <span>
                                            <IconButton
                                                onClick={handleFilterClick}
                                                disabled={effectiveIsLoadingContent}
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
                                </Box>

                                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    {filteredLinks.length} items
                                </Typography>
                            </Box>

                            {/* Main Grid */}
                            <Box sx={{ flex: 1, overflow: 'hidden', p: { xs: 1, md: 3 } }}>
                                <LinksContainer
                                    linksContainerRef={linksContainerRef}
                                    isMobile={isMobile}
                                    currentCollectionId={currentCollectionId}
                                    collections={collections}
                                    setMobileDrawerOpen={() => { }} // Not needed in Zen mode
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    isLoadingContent={effectiveIsLoadingContent}
                                    isLoadingLinks={isLoadingLinks}
                                    isSearchingLinks={isSearchingLinks}
                                    filteredLinks={filteredLinks}
                                    deleteLink={handleDeleteLink}
                                    setDraggedLinkId={setDraggedLinkId}
                                    markLinkViewed={markLinkViewed}
                                    unmarkLinkViewed={unmarkLinkViewed}
                                    setCommentsLink={(link) => toggleOverlay('comments', link?._id || null)}
                                    setReaderLink={(link) => toggleOverlay('reader', link?._id || null)}
                                    previewLinkId={previewLink?._id || null}
                                    setPreviewLink={(link) => toggleOverlay('preview', link?._id || null)}
                                    viewedLinkIds={viewedLinkIds}
                                    commentCounts={commentCounts}
                                    currentUserId={currentUserId}
                                    hasMoreLinks={hasMoreLinks}
                                    loadAllLinks={loadAllLinks}
                                    onMoveLink={handleOpenMoveDialog}
                                    hideCollectionSelector={true}
                                />
                            </Box>
                        </Box>
                    </>
                )}
            </AnimatePresence>

            <SocialFilterMenu
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={handleFilterClose}
                sortOrder={sortOrder}
                onSortOrderChange={onSortOrderChange}
                viewFilter={viewFilter}
                onViewFilterChange={onViewFilterChange}
                selectedUploader={selectedUploader}
                onSelectUploader={onSelectUploader}
                uniqueUploaders={uniqueUploaders}
                zIndex={SOCIAL_DIALOG_Z_INDEX + 100}
            />
        </DialogPortal>
    );
});

ZenModeOverlay.displayName = 'ZenModeOverlay';
