import { Box, Stack, TextField, InputAdornment, Typography, FormControl, Select, MenuItem, Button, useTheme, alpha } from '@mui/material';
import {
    Search as SearchIcon,
    GridView as GridViewIcon,
    CheckBox as CheckSquareIcon,
    CheckBoxOutlineBlank as SquareIcon,
    IndeterminateCheckBox as XSquareIcon,
} from '@mui/icons-material';
import type { ViewPreset } from '../types';

interface FilesToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewPreset: ViewPreset;
    onViewPresetChange: (preset: ViewPreset) => void;
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
}

export function FilesToolbar({
    searchQuery,
    onSearchChange,
    viewPreset,
    onViewPresetChange,
    selectedCount,
    totalCount,
    onSelectAll,
}: FilesToolbarProps) {
    const theme = useTheme();

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flexWrap: 'wrap', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flex: 1, minWidth: { xs: 'auto', md: 300 } }}>
                <TextField
                    placeholder="Search files..."
                    size="small"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    sx={{
                        flex: 1,
                        maxWidth: { xs: '100%', md: 320 },
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                            backdropFilter: 'blur(8px)',
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
                        VIEW SIZE
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 130 }, flex: { xs: 1, sm: 'none' } }}>
                        <Select
                            value={viewPreset}
                            onChange={(e) => onViewPresetChange(e.target.value as ViewPreset)}
                            sx={{
                                borderRadius: '10px',
                                bgcolor: alpha(theme.palette.background.paper, 0.4),
                                fontSize: '13px',
                                fontWeight: 700,
                                '& .MuiSelect-select': { py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }
                            }}
                            renderValue={(value) => (
                                <>
                                    <GridViewIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                    {value.charAt(0).toUpperCase() + value.slice(1)}
                                </>
                            )}
                        >
                            <MenuItem value="compact" sx={{ fontSize: '13px', fontWeight: 600 }}>Compact</MenuItem>
                            <MenuItem value="standard" sx={{ fontSize: '13px', fontWeight: 600 }}>Standard</MenuItem>
                            <MenuItem value="comfort" sx={{ fontSize: '13px', fontWeight: 600 }}>Comfort</MenuItem>
                            <MenuItem value="detailed" sx={{ fontSize: '13px', fontWeight: 600 }}>Detailed</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Stack>

            {totalCount > 0 && (
                <Button
                    size="small"
                    onClick={onSelectAll}
                    startIcon={
                        selectedCount === totalCount ? <CheckSquareIcon color="primary" /> :
                            selectedCount > 0 ? <XSquareIcon /> : <SquareIcon />
                    }
                    sx={{ color: 'text.secondary', fontWeight: 600, fontSize: { xs: '12px', sm: '13px' }, alignSelf: { xs: 'flex-start', md: 'center' } }}
                >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{selectedCount === totalCount ? 'Deselect All' : 'Select All'}</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{selectedCount === totalCount ? 'Deselect' : 'Select'}</Box>
                </Button>
            )}
        </Box>
    );
}
