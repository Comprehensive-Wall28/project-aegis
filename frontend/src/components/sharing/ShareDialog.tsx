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
            PaperProps={{
                sx: { borderRadius: '16px' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ShareIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Share "{fileName}"</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
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
                                label="Via Email"
                                sx={{ fontWeight: 600, minHeight: 48 }}
                            />
                            <Tab
                                icon={<LinkIcon fontSize="small" />}
                                iconPosition="start"
                                label="Via Link"
                                sx={{ fontWeight: 600, minHeight: 48 }}
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
