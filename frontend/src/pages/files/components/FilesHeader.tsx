import { useCallback } from 'react';
import { Box, Typography, Stack, Button, useTheme, alpha, IconButton, TextField, InputAdornment, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    Delete as TrashIcon,
    CreateNewFolder as CreateFolderIcon,
    FileUpload as UploadIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    CheckBox as CheckSquareIcon,
    CheckBoxOutlineBlank as SquareIcon,
    IndeterminateCheckBox as XSquareIcon,
    ViewList as ViewListIcon,
    GridView as GridViewIcon,
    DriveFileMove as DriveFileMoveIcon,
} from '@mui/icons-material';
import { StorageIndicator } from '@/components/vault/StorageIndicator';
import type { ViewPreset } from '../types';

interface FilesHeaderProps {
    fileCount: number;
    selectedCount: number;
    showUpload: boolean;
    onMassDelete: () => void;
    onNewFolder: () => void;
    onToggleUpload: () => void;
    onMove: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    // New props for toolbar integration
    totalCount: number;
    onSelectAll: () => void;
    viewPreset: ViewPreset;
    onViewPresetChange: (preset: ViewPreset) => void;
}

export function FilesHeader({
    fileCount,
    selectedCount,
    showUpload,
    onMassDelete,
    onNewFolder,
    onToggleUpload,
    onMove,
    searchQuery,
    onSearchChange,
    totalCount,
    onSelectAll,
    viewPreset,
    onViewPresetChange
}: FilesHeaderProps) {
    const theme = useTheme();

    const handleMassDeleteClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onMassDelete();
    }, [onMassDelete]);

    const handleNewFolderClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onNewFolder();
    }, [onNewFolder]);

    const handleToggleUploadClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onToggleUpload();
    }, [onToggleUpload]);

    const handleMoveClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
        onMove();
    }, [onMove]);

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                {/* Title Area */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 'fit-content' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            flexShrink: 0
                        }}
                    >
                        <FolderOpenIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            Files
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {fileCount} item{fileCount !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>

                {/* Actions Area */}
                <Stack direction={{ xs: 'column-reverse', md: 'row' }} spacing={2} alignItems="center" sx={{ flex: 1, width: '100%' }}>
                    {/* Search Bar - Flex 1 on desktop to take available space */}
                    <Box sx={{ flex: { xs: 'none', md: 1 }, width: { xs: '100%', md: 'auto' } }}>
                        <TextField
                            placeholder="Search files..."
                            size="small"
                            fullWidth
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    bgcolor: 'background.paper',
                                    '& fieldset': { borderColor: alpha(theme.palette.divider, 0.5) }
                                }
                            }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.7 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchQuery && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => onSearchChange('')}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }
                            }}
                        />
                    </Box>

                    {/* Integrated Toolbar & Actions */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-end' }, flexWrap: 'wrap', gap: 1 }}>

                        {/* Storage Indicator (Hide on very small screens if needed, but keep for now) */}
                        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                            <StorageIndicator />
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                            {/* Selection Controls */}
                            {totalCount > 0 && (
                                <IconButton
                                    onClick={onSelectAll}
                                    size="small"
                                    sx={{
                                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                        borderRadius: '8px',
                                        color: selectedCount === totalCount ? 'primary.main' : 'text.secondary'
                                    }}
                                >
                                    {selectedCount === totalCount ? <CheckSquareIcon fontSize="small" /> :
                                        selectedCount > 0 ? <XSquareIcon fontSize="small" /> : <SquareIcon fontSize="small" />}
                                </IconButton>
                            )}

                            {/* View Toggle */}
                            <ToggleButtonGroup
                                value={viewPreset}
                                exclusive
                                onChange={(_, value) => value && onViewPresetChange(value)}
                                size="small"
                                sx={{
                                    height: 32,
                                    '& .MuiToggleButton-root': {
                                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                        color: 'text.secondary',
                                        py: 0,
                                        px: 1,
                                        borderRadius: '8px !important',
                                        '&:first-of-type': { mr: 0.5 },
                                        '&.Mui-selected': {
                                            color: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            borderColor: alpha(theme.palette.primary.main, 0.5)
                                        }
                                    }
                                }}
                            >
                                <ToggleButton value="list" aria-label="List view">
                                    <ViewListIcon fontSize="small" />
                                </ToggleButton>
                                <ToggleButton value="standard" aria-label="Grid view">
                                    <GridViewIcon fontSize="small" />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>

                        <Box sx={{ width: '1px', height: 24, bgcolor: 'divider', mx: 1, display: { xs: 'none', md: 'block' } }} />

                        {/* Action Buttons */}
                        <Stack direction="row" spacing={1}>
                            <Box sx={{ minWidth: { md: 290 }, display: 'flex', justifyContent: 'flex-end' }}>
                                {selectedCount > 0 ? (
                                    <Stack
                                        key="selection-actions"
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ width: '100%', justifyContent: 'flex-end' }}
                                    >
                                        <Button
                                            variant="outlined"
                                            color="warning"
                                            onClick={handleMoveClick}
                                            startIcon={<DriveFileMoveIcon />}
                                            sx={{
                                                width: { xs: 'auto', md: 140 },
                                                minWidth: { xs: 100, md: 140 }, // Ensure consistent width
                                                borderRadius: '8px',
                                                height: 36,
                                                fontWeight: 600,
                                                boxShadow: 'none',
                                                textTransform: 'none',
                                                border: '1px solid',
                                                borderColor: alpha(theme.palette.warning.main, 0.5),
                                                bgcolor: alpha(theme.palette.warning.main, 0.05),
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                                    borderColor: theme.palette.warning.main
                                                }
                                            }}
                                        >
                                            Move ({selectedCount})
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={handleMassDeleteClick}
                                            startIcon={<TrashIcon />}
                                            sx={{
                                                width: { xs: 'auto', md: 140 },
                                                minWidth: { xs: 100, md: 140 },
                                                borderRadius: '8px',
                                                height: 36,
                                                fontWeight: 600,
                                                boxShadow: 'none',
                                                textTransform: 'none',
                                                border: '1px solid',
                                                borderColor: alpha(theme.palette.error.main, 0.5),
                                                bgcolor: alpha(theme.palette.error.main, 0.05),
                                                color: 'error.main',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                                    borderColor: theme.palette.error.main
                                                }
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </Stack>
                                ) : (
                                    <Stack
                                        key="default-actions"
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ width: '100%', justifyContent: 'flex-end' }}
                                    >
                                        <Button
                                            variant="contained"
                                            startIcon={<UploadIcon />}
                                            onClick={handleToggleUploadClick}
                                            sx={{
                                                fontWeight: 700,
                                                borderRadius: '8px',
                                                boxShadow: 'none',
                                                textTransform: 'none',
                                                height: 36,
                                                width: { xs: 'auto', md: 140 },
                                                minWidth: { xs: 100, md: 140 }
                                            }}
                                        >
                                            {showUpload ? 'Close' : 'Upload'}
                                        </Button>
                                        <Button
                                            onClick={handleNewFolderClick}
                                            startIcon={<CreateFolderIcon />}
                                            sx={{
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                color: 'primary.main',
                                                borderRadius: '8px',
                                                height: 36,
                                                width: { xs: 'auto', md: 140 },
                                                minWidth: { xs: 100, md: 140 },
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                                            }}
                                        >
                                            New Folder
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    </Stack>
                </Stack>
            </Box>
            {/* Mobile Storage Indicator - Show only on mobile below everything */}
            <Box sx={{ display: { xs: 'block', lg: 'none' }, pt: 1 }}>
                <StorageIndicator />
            </Box>
        </Stack>
    );
}
