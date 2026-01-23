import React from 'react';
import {
    Box,
    Typography,
    LinearProgress,
    Button
} from '@mui/material';
import { motion } from 'framer-motion';
import { Add, NoteAlt, ArrowBack } from '@mui/icons-material';
import AegisEditor from './AegisEditor';
import type { DecryptedNote } from '../../hooks/useNotesData';
import type { JSONContent } from '@tiptap/react';

interface NoteDetailViewProps {
    selectedNote: DecryptedNote | null;
    decryptedTitle?: string;
    isLoadingContent: boolean;
    onSaveContent: (content: JSONContent, title: string) => Promise<void>;
    onCreateNote: () => void;
    isMobile: boolean;
    onMobileBack: () => void;
    onToggleFullscreen?: () => void;
}

export const NoteDetailView: React.FC<NoteDetailViewProps> = ({
    selectedNote,
    decryptedTitle,
    isLoadingContent,
    onSaveContent,
    onCreateNote,
    isMobile,
    onMobileBack,
    onToggleFullscreen
}) => {

    // ... (existing helper logic or loading checks if any, though the block below is main render)

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
            {isMobile && (
                <Box sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: 1,
                    borderColor: 'divider'
                }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={onMobileBack}
                    >
                        Back
                    </Button>
                </Box>
            )}
            <Box
                component={motion.div}
                key={selectedNote.metadata._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                sx={{ flex: 1, height: '100%', overflow: 'hidden' }}
            >
                <AegisEditor
                    initialContent={selectedNote.content as JSONContent}
                    initialTitle={decryptedTitle || (selectedNote.metadata.encryptedTitle ? 'Loading...' : 'Untitled Note')}
                    onSave={onSaveContent}
                    onToggleFullscreen={onToggleFullscreen}
                />
            </Box>
        </Box>
    );
}
