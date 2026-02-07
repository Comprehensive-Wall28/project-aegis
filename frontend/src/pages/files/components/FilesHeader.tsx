import { useCallback } from 'react';
import { Box, Typography, Stack, Button, useTheme, alpha, IconButton, TextField, InputAdornment, ToggleButton, ToggleButtonGroup, Tooltip, useMediaQuery } from '@mui/material';
import {
    Delete as TrashIcon,
    FileUpload as UploadIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    CheckBox as CheckSquareIcon,
    CheckBoxOutlineBlank as SquareIcon,
    IndeterminateCheckBox as XSquareIcon,
    ViewList as ViewListIcon,
    GridView as GridViewIcon,
    DriveFileMove as DriveFileMoveIcon,
    Add as AddIcon,
    FolderOpen as FolderIcon
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
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        <Stack spacing={2} sx={{ mb: 1 }}>
            {/* Main Header Row */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    p: { xs: 1, md: 2 },
                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                    borderRadius: { xs: '20px', md: '24px' },
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    backdropFilter: 'blur(10px)'
                }}
            >
                {/* Left Section: Title & Stats */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <FolderIcon sx={{ color: 'primary.main', fontSize: '1.75rem', opacity: 0.9 }} />
                            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                                Files
                            </Typography>
                        </Stack>
                        <Box
                            sx={{
                                px: 1.25,
                                py: 0.25,
                                borderRadius: '8px',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 28
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    fontFamily: 'JetBrains Mono, monospace'
                                }}
                            >
                                {fileCount}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Mobile Storage Indicator */}
                    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                        <StorageIndicator />
                    </Box>
                </Box>

                {/* Middle/Right Section: Controls */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}
                >
                    {/* Search Bar */}
                    <Box sx={{ flex: { xs: 'none', md: 1 }, maxWidth: { md: 400 } }}>
                        <TextField
                            placeholder="Search..."
                            size="small"
                            fullWidth
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    bgcolor: alpha(theme.palette.background.default, 0.5),
                                    transition: 'all 0.2s',
                                    '& fieldset': {
                                        borderColor: alpha(theme.palette.divider, 0.2),
                                    },
                                    '&:hover fieldset': {
                                        borderColor: alpha(theme.palette.divider, 0.3),
                                    },
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.background.default, 0.8),
                                    },
                                    '&.Mui-focused': {
                                        bgcolor: theme.palette.background.default,
                                        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                                        '& fieldset': { borderColor: 'primary.main' }
                                    }
                                }
                            }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
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

                    {/* Actions Toolbar */}
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'space-between', sm: 'flex-end' }}>

                        {/* View & Selection Group */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                borderRadius: '10px',
                                p: 0.5,
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                            }}
                        >
                            <ToggleButtonGroup
                                value={viewPreset}
                                exclusive
                                onChange={(_, value) => value && onViewPresetChange(value)}
                                size="small"
                                sx={{
                                    '& .MuiToggleButton-root': {
                                        border: 'none',
                                        borderRadius: '8px !important',
                                        width: 32,
                                        height: 32,
                                        color: 'text.secondary',
                                        '&.Mui-selected': {
                                            bgcolor: 'background.paper',
                                            color: 'primary.main',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }
                                    }
                                }}
                            >
                                <ToggleButton value="list">
                                    <ViewListIcon fontSize="small" />
                                </ToggleButton>
                                <ToggleButton value="standard">
                                    <GridViewIcon fontSize="small" />
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <Box sx={{ width: 1, height: 20, bgcolor: 'divider', mx: 1 }} />

                            <Tooltip title={selectedCount === totalCount ? "Deselect All" : "Select All"}>
                                <IconButton
                                    onClick={onSelectAll}
                                    size="small"
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        color: selectedCount > 0 ? 'primary.main' : 'text.secondary',
                                        bgcolor: selectedCount > 0 ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                        '&:hover': {
                                            bgcolor: selectedCount > 0 ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.text.secondary, 0.1)
                                        }
                                    }}
                                >
                                    {selectedCount === totalCount ? <CheckSquareIcon fontSize="small" /> :
                                        selectedCount > 0 ? <XSquareIcon fontSize="small" /> : <SquareIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {/* Primary Actions */}
                        <Stack direction="row" spacing={1}>
                            {selectedCount > 0 ? (
                                <>
                                    <Button
                                        variant="text"
                                        color="warning"
                                        onClick={handleMoveClick}
                                        startIcon={isMobile ? undefined : <DriveFileMoveIcon />}
                                        sx={{
                                            borderRadius: '10px',
                                            px: isMobile ? 0 : 2,
                                            width: { xs: 40, md: 140 },
                                            minWidth: { xs: 40, md: 140 },
                                            height: 40,
                                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                                            color: 'warning.main',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.warning.main, 0.2),
                                            }
                                        }}
                                    >
                                        {isMobile ? <DriveFileMoveIcon /> : 'Move'}
                                    </Button>
                                    <Button
                                        variant="text"
                                        color="error"
                                        onClick={handleMassDeleteClick}
                                        startIcon={isMobile ? undefined : <TrashIcon />}
                                        sx={{
                                            borderRadius: '10px',
                                            px: isMobile ? 0 : 2,
                                            width: { xs: 40, md: 140 },
                                            minWidth: { xs: 40, md: 140 },
                                            height: 40,
                                            bgcolor: alpha(theme.palette.error.main, 0.1),
                                            color: 'error.main',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.error.main, 0.2),
                                            }
                                        }}
                                    >
                                        {isMobile ? <TrashIcon /> : 'Delete'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        onClick={handleNewFolderClick}
                                        startIcon={isMobile ? undefined : <AddIcon />}
                                        sx={{
                                            borderRadius: '10px',
                                            color: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            width: { xs: 40, md: 140 },
                                            minWidth: { xs: 40, md: 140 },
                                            height: 40,
                                            px: isMobile ? 0 : 2,
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                            }
                                        }}
                                    >
                                        {isMobile ? <AddIcon /> : 'New Folder'}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        startIcon={isMobile ? undefined : <UploadIcon />}
                                        onClick={handleToggleUploadClick}
                                        sx={{
                                            borderRadius: '10px',
                                            boxShadow: 'none',
                                            width: { xs: 40, md: 140 },
                                            minWidth: { xs: 40, md: 140 },
                                            height: 40,
                                            px: isMobile ? 0 : 2,
                                            fontWeight: 600,
                                            '&:hover': {
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                            }
                                        }}
                                    >
                                        {isMobile ? (showUpload ? <CloseIcon /> : <UploadIcon />) : (showUpload ? 'Close' : 'Upload')}
                                    </Button>
                                </>
                            )}
                        </Stack>
                    </Stack>
                </Stack>

                {/* Desktop Storage Indicator */}
                <Box sx={{ display: { xs: 'none', md: 'block' }, borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`, pl: 2 }}>
                    <StorageIndicator />
                </Box>
            </Box>
        </Stack>
    );
}
