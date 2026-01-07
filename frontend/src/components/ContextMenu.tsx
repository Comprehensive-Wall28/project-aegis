import { useState } from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    alpha,
    useTheme
} from '@mui/material';
import {
    CreateNewFolder as CreateFolderIcon,
    DriveFileRenameOutline as RenameIcon,
    Delete as DeleteIcon,
    FolderOpen as FolderIcon,
    ContentCut as MoveIcon
} from '@mui/icons-material';

interface ContextMenuItem {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    dividerAfter?: boolean;
}

interface ContextMenuProps {
    open: boolean;
    anchorPosition: { x: number; y: number } | null;
    onClose: () => void;
    items: ContextMenuItem[];
}

export function ContextMenu({ open, anchorPosition, onClose, items }: ContextMenuProps) {
    const theme = useTheme();

    if (!anchorPosition) return null;

    return (
        <Menu
            open={open}
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={{ top: anchorPosition.y, left: anchorPosition.x }}
            slotProps={{
                paper: {
                    sx: {
                        minWidth: 180,
                        borderRadius: '12px',
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(16px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}`,
                    }
                }
            }}
        >
            {items.map((item, index) => (
                <div key={index}>
                    <MenuItem
                        onClick={() => {
                            item.onClick();
                            onClose();
                        }}
                        disabled={item.disabled}
                        sx={{
                            py: 1,
                            px: 2,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                            }
                        }}
                    >
                        <ListItemIcon sx={{ color: 'text.secondary', minWidth: 36 }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                                fontSize: '13px',
                                fontWeight: 600
                            }}
                        />
                    </MenuItem>
                    {item.dividerAfter && <Divider sx={{ my: 0.5, opacity: 0.1 }} />}
                </div>
            ))}
        </Menu>
    );
}

// Hook for managing context menu state
export function useContextMenu() {
    const [contextMenu, setContextMenu] = useState<{
        open: boolean;
        position: { x: number; y: number } | null;
        target: { type: 'file' | 'folder' | 'empty'; id?: string } | null;
    }>({
        open: false,
        position: null,
        target: null,
    });

    const handleContextMenu = (
        e: React.MouseEvent,
        target: { type: 'file' | 'folder' | 'empty'; id?: string }
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            open: true,
            position: { x: e.clientX, y: e.clientY },
            target,
        });
    };

    const closeContextMenu = () => {
        setContextMenu({ open: false, position: null, target: null });
    };

    return {
        contextMenu,
        handleContextMenu,
        closeContextMenu,
    };
}

export { CreateFolderIcon, RenameIcon, DeleteIcon, FolderIcon, MoveIcon };
