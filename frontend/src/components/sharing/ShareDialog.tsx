import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    IconButton,
    Typography,
    alpha,
} from '@mui/material';
import { Close as CloseIcon, Share as ShareIcon } from '@mui/icons-material';
import type { FileMetadata } from '@/services/vaultService';
import { ShareLinkTab } from './ShareLinkTab';

interface ShareDialogProps {
    open: boolean;
    onClose: () => void;
    item: FileMetadata;
    type: 'file';
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose, item, type }) => {
    const fileName = (item as FileMetadata).originalFileName;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '24px',
                        backgroundImage: 'none',
                        bgcolor: 'background.paper',
                        overflow: 'hidden'
                    }
                }
            }}
        >
            <DialogTitle sx={{
                p: { xs: 2, sm: 3 },
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                pr: { xs: 6, sm: 8 } // Make space for the absolute close button
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    bgcolor: alpha('#2196F3', 0.1),
                    color: '#2196F3',
                    flexShrink: 0
                }}>
                    <ShareIcon />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1.5 }}>
                        Share Resource
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 700,
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                            lineHeight: 1.3,
                            color: 'text.primary',
                            wordBreak: 'break-all',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}
                    >
                        {fileName}
                    </Typography>
                </Box>

                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: { xs: 16, sm: 24 },
                        right: { xs: 16, sm: 24 },
                        color: 'text.secondary',
                        '&:hover': { bgcolor: alpha('#fff', 0.05) }
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <ShareLinkTab item={item} type={type} />
            </DialogContent>
        </Dialog>
    );
};
