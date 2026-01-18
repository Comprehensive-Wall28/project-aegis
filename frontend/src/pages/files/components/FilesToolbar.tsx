import { Box, Stack, TextField, InputAdornment, Button, useTheme, alpha } from '@mui/material';
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

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flexWrap: 'wrap', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
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
