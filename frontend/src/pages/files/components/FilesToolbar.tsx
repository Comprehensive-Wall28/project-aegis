import React from 'react';
import { Box, TextField, InputAdornment, Button, useTheme, alpha, Stack } from '@mui/material';
import { StorageIndicator } from '@/components/vault/StorageIndicator';
import {
    Search as SearchIcon,
    CheckBox as CheckSquareIcon,
    CheckBoxOutlineBlank as SquareIcon,
    IndeterminateCheckBox as XSquareIcon,
} from '@mui/icons-material';

interface FilesToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
}

export function FilesToolbar({
    searchQuery,
    onSearchChange,
    selectedCount,
    totalCount,
    onSelectAll,
}: FilesToolbarProps) {
    const theme = useTheme();
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flexWrap: 'wrap', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <TextField
                inputRef={searchInputRef}
                placeholder="Search files (CTRL+F)..."
                size="small"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                sx={{
                    flex: 1,
                    maxWidth: { xs: '100%', md: 320 },
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                    }
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }
                }}
            />

            <Stack direction="row" spacing={3} alignItems="center">
                <StorageIndicator />

                {totalCount > 0 && (
                    <Button
                        size="small"
                        onClick={onSelectAll}
                        aria-label={selectedCount === totalCount ? "Deselect all files" : "Select all files"}
                        startIcon={
                            selectedCount === totalCount ? <CheckSquareIcon color="primary" /> :
                                selectedCount > 0 ? <XSquareIcon /> : <SquareIcon />
                        }
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: { xs: '12px', sm: '13px' },
                            alignSelf: { xs: 'flex-start', md: 'center' },
                            textTransform: 'none',
                            '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                        }}
                    >
                        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{selectedCount === totalCount ? 'Deselect All' : 'Select All'}</Box>
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{selectedCount === totalCount ? 'Deselect' : 'Select'}</Box>
                    </Button>
                )}
            </Stack>
        </Box>
    );
}
