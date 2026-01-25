import React from 'react';
import {
    Box,
    Typography,
    LinearProgress,
    Button,
    useTheme,
    alpha
} from '@mui/material';
import { Add, NoteAlt, ArrowBack, UnfoldLess, UnfoldMore } from '@mui/icons-material';
import type { DecryptedNote } from '../../hooks/useNotesCrud';

interface NoteDetailViewProps {
    selectedNote: DecryptedNote | null;
    isLoadingContent: boolean;
    onCreateNote: () => void;
    isMobile: boolean;
    onMobileBack: () => void;
    onToggleFullscreen?: () => void;
    containerRef?: (node: HTMLElement | null) => void;
    editorInstance?: React.ReactNode;
    isZenMode: boolean;
    onToggleZenMode: () => void;
}

export const NoteDetailView: React.FC<NoteDetailViewProps> = ({
    selectedNote,
    isLoadingContent,
    onCreateNote,
    isMobile,
    onMobileBack,
    containerRef,
    editorInstance,
    isZenMode,
    onToggleZenMode
}) => {
    // Local state removed, using props

    const theme = useTheme();

    if (isLoadingContent) {
        return (
            <Box sx={{
                flex: 1,
                bgcolor: 'background.paper',
                width: '100%'
            }}>
                <LinearProgress />
            </Box>
        );
    }

    if (!selectedNote) {
        return (
            <Box sx={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'background.paper',
                color: 'text.secondary',
                p: 3,
            }}>
                <NoteAlt sx={{ fontSize: 80, mb: 2, opacity: 0.15 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Select a note or create a new one
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                    Your notes are end-to-end encrypted
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={onCreateNote}
                    sx={{
                        mt: 3,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                    }}
                >
                    Create Note
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{
            flex: 1,
            height: '100%',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            position: 'relative'
        }}>
            {isMobile && !isZenMode && (
                <Box sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: alpha(theme.palette.divider, 0.08)
                }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={onMobileBack}
                    >
                        Back
                    </Button>
                    <Button
                        startIcon={<UnfoldMore />}
                        onClick={onToggleZenMode}
                        color="inherit"
                        size="small"
                        sx={{ opacity: 0.7 }}
                    >
                        Zen Mode
                    </Button>
                </Box>
            )}

            {isMobile && isZenMode && (
                <>

                    <Box sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        zIndex: 10
                    }}>
                        <Button
                            onClick={onToggleZenMode}
                            variant="contained"
                            size="small"
                            sx={{
                                borderRadius: '50%',
                                minWidth: '40px',
                                width: '40px',
                                height: '40px',
                                p: 0,
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                boxShadow: 2,
                                opacity: 0.6,
                                '&:hover': {
                                    bgcolor: 'background.paper',
                                    opacity: 1
                                }
                            }}
                        >
                            <UnfoldLess />
                        </Button>
                    </Box>
                </>
            )}

            <Box
                key={selectedNote.metadata._id}
                sx={{ flex: 1, height: '100%', overflow: 'hidden' }}
            >
                {editorInstance ? (
                    editorInstance
                ) : (
                    <div
                        ref={containerRef}
                        style={{ width: '100%', height: '100%' }}
                    />
                )}
            </Box>
        </Box>
    );
};
