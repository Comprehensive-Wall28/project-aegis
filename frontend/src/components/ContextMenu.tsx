import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    alpha,
    useTheme
} from '@mui/material';


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
                        borderRadius: '16px',
                        bgcolor: theme.palette.background.paper,
                        backgroundImage: 'none',
                        boxShadow: theme.shadows[20],
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
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
                                bgcolor: alpha(theme.palette.primary.main, 0.12),
                            }
                        }}
                    >
                        <ListItemIcon sx={{ color: 'text.secondary', minWidth: 36 }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.label}
                            slotProps={{
                                primary: {
                                    fontSize: '13px',
                                    fontWeight: 600
                                }
                            }}
                        />
                    </MenuItem>
                    {item.dividerAfter && <Divider sx={{ my: 0.5, opacity: 0.1 }} />}
                </div>
            ))}
        </Menu>
    );
}
