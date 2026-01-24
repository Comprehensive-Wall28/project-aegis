import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Tabs,
    Tab,
    Box,
    IconButton,
    Typography,
    alpha,
} from '@mui/material';
import { Close as CloseIcon, Share as ShareIcon, Link as LinkIcon, Email as EmailIcon } from '@mui/icons-material';
import type { FileMetadata } from '@/services/vaultService';
import type { Folder } from '@/services/folderService';
import { ShareEmailTab } from './ShareEmailTab';
import { ShareLinkTab } from './ShareLinkTab';

interface ShareDialogProps {
    open: boolean;
    onClose: () => void;
    item: FileMetadata | Folder;
    type: 'file' | 'folder';
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose, item, type }) => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    const fileName = type === 'file' ? (item as FileMetadata).originalFileName : (item as Folder).name;

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

            <DialogContent sx={{ p: 0 }}>
                {type === 'file' ? (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                        <Tabs value={tabIndex} onChange={handleChange} aria-label="sharing tabs">
                            <Tab
                                icon={<EmailIcon fontSize="small" />}
                                iconPosition="start"
                                label="Email"
                                sx={{ fontWeight: 600, minHeight: 48, flex: 1 }}
                            />
                            <Tab
                                icon={<LinkIcon fontSize="small" />}
                                iconPosition="start"
                                label="Link"
                                sx={{ fontWeight: 600, minHeight: 48, flex: 1 }}
                            />
                        </Tabs>
                    </Box>
                ) : (
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 700, opacity: 0.8 }}>
                            Sharing Via Secure Email
                        </Typography>
                    </Box>
                )}

                <Box sx={{ p: 3, minHeight: 200 }}>
                    {type === 'folder' || tabIndex === 0 ? (
                        <ShareEmailTab item={item} type={type} />
                    ) : (
                        <ShareLinkTab item={item} type={type} />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};
