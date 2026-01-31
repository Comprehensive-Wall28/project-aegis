import { memo, useState, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    useTheme,
    InputAdornment,
    Menu,
    MenuItem,
    Divider,
    ListSubheader,
    ListItemIcon,
    ListItemText,
    Fade,
} from '@mui/material';
import {
    Group as GroupIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    Check as CheckIcon,
    History as HistoryIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Person as PersonIcon,
    AccessTime as TimeIcon,
} from '@mui/icons-material';
import { SOCIAL_RADIUS_MEDIUM, SOCIAL_RADIUS_SMALL } from './constants';

interface SocialFilterMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    sortOrder: 'latest' | 'oldest';
    onSortOrderChange: (order: 'latest' | 'oldest') => void;
    viewFilter: 'all' | 'viewed' | 'unviewed';
    onViewFilterChange: (filter: 'all' | 'viewed' | 'unviewed') => void;
    selectedUploader: string | null;
    onSelectUploader: (id: string | null) => void;
    uniqueUploaders: { id: string, username: string }[];
    zIndex?: number;
}

export const SocialFilterMenu = memo(({
    anchorEl,
    open,
    onClose,
    sortOrder,
    onSortOrderChange,
    viewFilter,
    onViewFilterChange,
    selectedUploader,
    onSelectUploader,
    uniqueUploaders,
    zIndex,
}: SocialFilterMenuProps) => {
    const theme = useTheme();
    const [uploaderSearch, setUploaderSearch] = useState('');

    const filteredUploaders = useMemo(() => {
        if (!uploaderSearch.trim()) return uniqueUploaders;
        return uniqueUploaders.filter(u =>
            u.username.toLowerCase().includes(uploaderSearch.toLowerCase())
        );
    }, [uniqueUploaders, uploaderSearch]);

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            disableScrollLock
            TransitionComponent={Fade}
            sx={{ zIndex: zIndex || 1300 }}
            slotProps={{
                paper: {
                    variant: 'solid',
                    elevation: 8,
                    sx: {
                        minWidth: 260,
                        mt: 1,
                        bgcolor: theme.palette.background.paper,
                        backgroundImage: 'none',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: SOCIAL_RADIUS_MEDIUM,
                        '& .MuiList-root': {
                            pt: 0,
                        },
                    }
                }
            }}
        >
            <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '40px', color: 'primary.main', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sort Order
            </ListSubheader>

            <MenuItem onClick={() => { onSortOrderChange('latest'); onClose(); }} selected={sortOrder === 'latest'} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <HistoryIcon fontSize="small" color={sortOrder === 'latest' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Latest First" slotProps={{ primary: { variant: 'body2', fontWeight: sortOrder === 'latest' ? 600 : 400 } }} />
                {sortOrder === 'latest' && <CheckIcon fontSize="small" color="primary" />}
            </MenuItem>

            <MenuItem onClick={() => { onSortOrderChange('oldest'); onClose(); }} selected={sortOrder === 'oldest'} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <TimeIcon fontSize="small" color={sortOrder === 'oldest' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Oldest First" slotProps={{ primary: { variant: 'body2', fontWeight: sortOrder === 'oldest' ? 600 : 400 } }} />
                {sortOrder === 'oldest' && <CheckIcon fontSize="small" color="primary" />}
            </MenuItem>

            <Divider sx={{ my: 1, opacity: 0.6 }} />

            <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '40px', color: 'primary.main', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                View Status
            </ListSubheader>

            <MenuItem onClick={() => { onViewFilterChange('all'); onClose(); }} selected={viewFilter === 'all'} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <FilterListIcon fontSize="small" color={viewFilter === 'all' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="All Links" slotProps={{ primary: { variant: 'body2', fontWeight: viewFilter === 'all' ? 600 : 400 } }} />
                {viewFilter === 'all' && <CheckIcon fontSize="small" color="primary" />}
            </MenuItem>

            <MenuItem onClick={() => { onViewFilterChange('viewed'); onClose(); }} selected={viewFilter === 'viewed'} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <VisibilityIcon fontSize="small" color={viewFilter === 'viewed' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Viewed" slotProps={{ primary: { variant: 'body2', fontWeight: viewFilter === 'viewed' ? 600 : 400 } }} />
                {viewFilter === 'viewed' && <CheckIcon fontSize="small" color="primary" />}
            </MenuItem>

            <MenuItem onClick={() => { onViewFilterChange('unviewed'); onClose(); }} selected={viewFilter === 'unviewed'} sx={{ py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                    <VisibilityOffIcon fontSize="small" color={viewFilter === 'unviewed' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Unviewed" slotProps={{ primary: { variant: 'body2', fontWeight: viewFilter === 'unviewed' ? 600 : 400 } }} />
                {viewFilter === 'unviewed' && <CheckIcon fontSize="small" color="primary" />}
            </MenuItem>

            <Divider sx={{ my: 1, opacity: 0.6 }} />

            <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600, lineHeight: '40px', color: 'primary.main', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Uploaders
            </ListSubheader>

            <Box sx={{ px: 2, pb: 1 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Filter uploaders..."
                    value={uploaderSearch}
                    onChange={(e) => setUploaderSearch(e.target.value)}
                    autoFocus
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: SOCIAL_RADIUS_SMALL,
                            height: 32,
                            fontSize: '0.8125rem',
                        }
                    }}
                />
            </Box>

            <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                <MenuItem onClick={() => { onSelectUploader(null); onClose(); }} selected={selectedUploader === null} sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        <GroupIcon fontSize="small" color={selectedUploader === null ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText primary="All Uploaders" slotProps={{ primary: { variant: 'body2', fontWeight: selectedUploader === null ? 600 : 400 } }} />
                    {selectedUploader === null && <CheckIcon fontSize="small" color="primary" />}
                </MenuItem>

                {filteredUploaders.map((uploader) => (
                    <MenuItem
                        key={uploader.id}
                        onClick={() => { onSelectUploader(uploader.id); onClose(); }}
                        selected={selectedUploader === uploader.id}
                        sx={{ py: 1 }}
                    >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                            <PersonIcon fontSize="small" color={selectedUploader === uploader.id ? 'primary' : 'inherit'} />
                        </ListItemIcon>
                        <ListItemText primary={uploader.username} slotProps={{ primary: { variant: 'body2', fontWeight: selectedUploader === uploader.id ? 600 : 400 } }} />
                        {selectedUploader === uploader.id && <CheckIcon fontSize="small" color="primary" />}
                    </MenuItem>
                ))}

                {filteredUploaders.length === 0 && (
                    <Box sx={{ py: 2, px: 3, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            No uploaders found
                        </Typography>
                    </Box>
                )}
            </Box>
        </Menu>
    );
});

SocialFilterMenu.displayName = 'SocialFilterMenu';
