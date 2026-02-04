import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    alpha,
    useTheme,
    Badge,
    Skeleton,
    Drawer,
    Tooltip,
    Menu,
    MenuItem,
    Fade,
} from '@mui/material';
import {
    Add as AddIcon,
    FolderOpenOutlined as CollectionIcon,
    NavigateBefore as CollapseIcon,
    NavigateNext as ExpandIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SOCIAL_RADIUS_XLARGE, SOCIAL_RADIUS_MEDIUM } from './constants';
import { useSocial } from '@/hooks/useSocial';
import { useDecryptedCollectionMetadata } from '@/hooks/useDecryptedMetadata';
import type { Collection } from '@/services/socialService';

interface CollectionItemProps {
    collection: Collection;
    isSelected: boolean;
    isTarget: boolean;
    unviewedCount: number;
    isCollapsed: boolean;
    onSelect: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onTouchStart: (id: string) => void;
    onTouchEnd: () => void;
    onDrop: (id: string) => void;
    onDragOver: (id: string) => void;
    onDragLeave: () => void;
}

const CollectionItem = memo(({
    collection,
    isSelected,
    isTarget,
    unviewedCount,
    isCollapsed,
    onSelect,
    onContextMenu,
    onTouchStart,
    onTouchEnd,
    onDrop,
    onDragOver,
    onDragLeave
}: CollectionItemProps) => {
    const theme = useTheme();
    const { name: decryptedName, isDecrypting } = useDecryptedCollectionMetadata(collection);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: collection._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Tooltip
            title={isCollapsed ? (isDecrypting ? 'Decrypting...' : (decryptedName || collection.name)) : ''}
            placement="right"
            arrow
        >
            <Box
                component={motion.div}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onDragOver={(e: React.DragEvent) => {
                    e.preventDefault();
                    onDragOver(collection._id);
                }}
                onDragLeave={onDragLeave}
                onDrop={(e: React.DragEvent) => {
                    e.preventDefault();
                    onDrop(collection._id);
                }}
                ref={setNodeRef}
                style={style}
                sx={{ mb: 0.5, position: 'relative' }}
            >
                <ListItemButton
                    {...attributes}
                    {...listeners}
                    onClick={() => onSelect(collection._id)}
                    onContextMenu={(e) => onContextMenu(e, collection._id)}
                    onTouchStart={() => onTouchStart(collection._id)}
                    onTouchEnd={onTouchEnd}
                    selected={isSelected}
                    sx={{
                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                        minHeight: 48,
                        px: isCollapsed ? 1.5 : 2,
                        bgcolor: isTarget ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                        border: isTarget ? `1px dashed ${theme.palette.primary.main}` : '1px solid transparent',
                        '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                            },
                        },
                    }}
                >
                    <ListItemIcon
                        sx={{
                            minWidth: isCollapsed ? 0 : 40,
                            color: isSelected ? 'primary.main' : 'text.secondary',
                        }}
                    >
                        <Badge
                            badgeContent={unviewedCount}
                            color="primary"
                            variant="dot"
                            invisible={unviewedCount === 0 || isCollapsed}
                        >
                            <CollectionIcon fontSize="small" />
                        </Badge>
                    </ListItemIcon>
                    <AnimatePresence mode="wait">
                        {!isCollapsed && (
                            <Box
                                component={motion.div}
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 'auto', opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                            >
                                <ListItemText
                                    primary={isDecrypting ? '...' : (decryptedName || collection.name)}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        fontWeight: isSelected ? 600 : 500,
                                        noWrap: true,
                                    }}
                                />
                            </Box>
                        )}
                    </AnimatePresence>
                    {!isCollapsed && (
                        <DragHandleIcon
                            sx={{
                                ml: 'auto',
                                opacity: 0.3,
                                fontSize: '1rem',
                                color: isSelected ? 'primary.main' : 'text.secondary',
                                '&:hover': { opacity: 0.6 }
                            }}
                        />
                    )}
                    {isCollapsed && unviewedCount > 0 && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                border: `2px solid ${theme.palette.background.paper}`,
                            }}
                        />
                    )}
                </ListItemButton>
            </Box>
        </Tooltip>
    );
});

export const SocialSidebar = memo(() => {
    const theme = useTheme();
    const {
        isMobile,
        mobileDrawerOpen,
        setMobileDrawerOpen,
        collections,
        handleSelectCollection,
        currentCollectionId,
        handleCollectionContextMenu,
        handleCollectionTouchStart,
        handleCollectionTouchEnd,
        effectiveIsLoadingRoom,
        dropTargetId,
        setDropTargetId,
        handleDrop,
        getUnviewedCountByCollection,
        toggleOverlay,
        collectionContextMenu,
        setCollectionContextMenu,
        setCollectionToRename,
        setCollectionToDelete,
        setDeleteConfirmOpen,
        reorderCollections,
    } = useSocial();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = collections.findIndex((c) => c._id === active.id);
            const newIndex = collections.findIndex((c) => c._id === over.id);

            const newOrder = arrayMove(collections, oldIndex, newIndex);
            reorderCollections(newOrder.map((c) => c._id));
        }
    };

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    const activeCollection = collections.find(c => c._id === activeId);

    const sidebarContent = (
        <Box
            sx={{
                width: isCollapsed ? 64 : (isMobile ? 240 : 220),
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: theme.transitions.create(['width'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                overflow: 'hidden',
                bgcolor: 'background.paper',
                position: 'relative',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    minHeight: 64,
                }}
            >
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <Box
                            component={motion.div}
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                        >
                            <Typography variant="h6" fontWeight="bold" noWrap>
                                Collections
                            </Typography>
                        </Box>
                    )}
                </AnimatePresence>
                {!isMobile && (
                    <IconButton size="small" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
                    </IconButton>
                )}
            </Box>

            {/* Collections List */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
                <List disablePadding>
                    <AnimatePresence mode="popLayout">
                        {effectiveIsLoadingRoom ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <Box key={`skeleton-${i}`} sx={{ px: 1, py: 0.5 }}>
                                    <Skeleton
                                        variant="rounded"
                                        width="100%"
                                        height={48}
                                        sx={{ borderRadius: SOCIAL_RADIUS_MEDIUM }}
                                    />
                                </Box>
                            ))
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDragCancel={() => setActiveId(null)}
                            >
                                <SortableContext
                                    items={collections.map(c => c._id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {collections.map((collection) => (
                                        <CollectionItem
                                            key={collection._id}
                                            collection={collection}
                                            isSelected={currentCollectionId === collection._id}
                                            isTarget={dropTargetId === collection._id}
                                            unviewedCount={getUnviewedCountByCollection(collection._id)}
                                            isCollapsed={isCollapsed}
                                            onSelect={(id) => {
                                                handleSelectCollection(id);
                                                if (isMobile) setMobileDrawerOpen(false);
                                            }}
                                            onContextMenu={handleCollectionContextMenu}
                                            onTouchStart={handleCollectionTouchStart}
                                            onTouchEnd={handleCollectionTouchEnd}
                                            onDrop={handleDrop}
                                            onDragOver={(id) => {
                                                if (dropTargetId !== id) {
                                                    setDropTargetId(id);
                                                }
                                            }}
                                            onDragLeave={() => setDropTargetId(null)}
                                        />
                                    ))}
                                </SortableContext>
                                {createPortal(
                                    <DragOverlay
                                        dropAnimation={{
                                            sideEffects: defaultDropAnimationSideEffects({
                                                styles: {
                                                    active: {
                                                        opacity: '0.5',
                                                    },
                                                },
                                            }),
                                        }}
                                    >
                                        {activeCollection ? (
                                            <CollectionItem
                                                collection={activeCollection}
                                                isSelected={currentCollectionId === activeCollection._id}
                                                isTarget={false}
                                                unviewedCount={getUnviewedCountByCollection(activeCollection._id)}
                                                isCollapsed={isCollapsed}
                                                onSelect={() => { }}
                                                onContextMenu={() => { }}
                                                onTouchStart={() => { }}
                                                onTouchEnd={() => { }}
                                                onDrop={() => { }}
                                                onDragOver={() => { }}
                                                onDragLeave={() => { }}
                                            />
                                        ) : null}
                                    </DragOverlay>,
                                    document.body
                                )}
                            </DndContext>
                        )}
                    </AnimatePresence>
                </List>
            </Box>

            {/* Footer Actions */}
            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Tooltip title="Create Collection" placement={isCollapsed ? 'right' : 'top'}>
                    <ListItemButton
                        onClick={() => toggleOverlay('createCol', true)}
                        sx={{
                            borderRadius: SOCIAL_RADIUS_MEDIUM,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            color: 'primary.main',
                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, color: 'inherit' }}>
                            <AddIcon fontSize="small" />
                        </ListItemIcon>
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <Box
                                    component={motion.div}
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                                >
                                    <ListItemText
                                        primary="Add Collection"
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    />
                                </Box>
                            )}
                        </AnimatePresence>
                    </ListItemButton>
                </Tooltip>
            </Box>
        </Box>
    );

    const handleCloseContextMenu = () => {
        setCollectionContextMenu(null);
    };

    const handleRenameClick = () => {
        if (collectionContextMenu) {
            setCollectionToRename(collectionContextMenu.collectionId);
        }
        handleCloseContextMenu();
    };

    const handleDeleteClick = () => {
        if (collectionContextMenu) {
            setCollectionToDelete(collectionContextMenu.collectionId);
            setDeleteConfirmOpen(true);
        }
        handleCloseContextMenu();
    };

    return (
        <>
            {isMobile ? (
                <Drawer
                    anchor="left"
                    open={mobileDrawerOpen}
                    onClose={() => setMobileDrawerOpen(false)}
                    PaperProps={{
                        sx: {
                            width: 240,
                            bgcolor: 'background.paper',
                        },
                    }}
                >
                    {sidebarContent}
                </Drawer>
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: SOCIAL_RADIUS_XLARGE,
                        overflow: 'hidden',
                        height: '100%',
                        bgcolor: 'background.paper',
                    }}
                >
                    {sidebarContent}
                </Paper>
            )}

            <Menu
                open={collectionContextMenu !== null}
                onClose={handleCloseContextMenu}
                TransitionComponent={Fade}
                anchorReference="anchorPosition"
                anchorPosition={
                    collectionContextMenu !== null
                        ? { top: collectionContextMenu.mouseY, left: collectionContextMenu.mouseX }
                        : undefined
                }
                PaperProps={{
                    sx: {
                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                        minWidth: 160,
                        boxShadow: theme.shadows[10],
                        border: `1px solid ${theme.palette.divider}`,
                    }
                }}
            >
                <MenuItem onClick={handleRenameClick} sx={{ gap: 1.5, py: 1.5 }}>
                    <EditIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={500}>Rename</Typography>
                </MenuItem>
                <MenuItem
                    onClick={handleDeleteClick}
                    sx={{
                        gap: 1.5,
                        py: 1.5,
                        color: 'error.main',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.08),
                        }
                    }}
                >
                    <DeleteIcon fontSize="small" color="error" />
                    <Typography variant="body2" fontWeight={500}>Delete</Typography>
                </MenuItem>
            </Menu>
        </>
    );
});
