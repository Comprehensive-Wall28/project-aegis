import { useMemo } from 'react';
import { useContextMenu } from '@/components/useContextMenu';
import { CreateFolderIcon, RenameIcon, DeleteIcon } from '@/components/vault/contextMenuIcons';
import {
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Share as ShareIcon,
    Palette as PaletteIcon,
    Wallpaper as WallpaperIcon,
} from '@mui/icons-material';
import type { FileMetadata } from '@/services/vaultService';
import type { Folder } from '@/services/folderService';
import type { ContextMenuTarget } from '../types';
import authService from '@/services/authService';
import { usePreferenceStore } from '@/stores/preferenceStore';

interface UseFileContextMenuProps {
    files: FileMetadata[];
    folders: Folder[];
    selectedIds: Set<string>;
    setFilesToMove: (ids: string[]) => void;
    setMoveToFolderDialog: (open: boolean) => void;
    setShareDialog: (state: { open: boolean; item: FileMetadata | Folder | null; type: 'file' | 'folder' }) => void;
    setNewFolderName: (name: string) => void;
    setRenameFolderDialog: (state: { open: boolean; folder: Folder | null }) => void;
    setColorPickerFolderId: (id: string | null) => void;
    setNewFolderDialog: (open: boolean) => void;
    handleDelete: (id: string) => void;
    handleDeleteFolder: (id: string) => void;
    navigateToFolder: (folder: Folder | null) => void;
    setNotification: (state: { open: boolean; message: string; type: 'success' | 'error' }) => void;
}

export function useFileContextMenu({
    files,
    folders,
    selectedIds,
    setFilesToMove,
    setMoveToFolderDialog,
    setShareDialog,
    setNewFolderName,
    setRenameFolderDialog,
    setColorPickerFolderId,
    setNewFolderDialog,
    handleDelete,
    handleDeleteFolder,
    navigateToFolder,
    setNotification
}: UseFileContextMenuProps) {
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

    const isImageFile = (file: FileMetadata) => file.mimeType?.startsWith('image/');

    const menuItems = useMemo(() => {
        const target = contextMenu.target as ContextMenuTarget | null;
        const targetId = target?.id;
        const targetType = target?.type;

        // File context menu
        if (targetType === 'file' && targetId) {
            return [
                {
                    label: 'Move to Folder',
                    icon: <FolderIcon fontSize="small" />,
                    onClick: () => {
                        const ids = new Set(selectedIds);
                        ids.add(targetId);
                        setFilesToMove(Array.from(ids));
                        setMoveToFolderDialog(true);
                    }
                },
                {
                    label: 'Share', icon: <ShareIcon fontSize="small" />, onClick: () => {
                        const file = files.find(f => f._id === targetId);
                        if (file) setShareDialog({ open: true, item: file, type: 'file' });
                    }
                },
                ...(isImageFile(files.find(f => f._id === targetId)!) ? [{
                    label: 'Set as Background',
                    icon: <WallpaperIcon fontSize="small" />,
                    onClick: async () => {
                        const file = files.find(f => f._id === targetId);
                        if (file) {
                            try {
                                await authService.updateProfile({ preferences: { backgroundImage: file._id } });
                                usePreferenceStore.getState().setBackgroundImage(file._id);
                                setNotification({ open: true, message: 'Background image updated successfully', type: 'success' });
                            } catch (error) {
                                console.error('Failed to set background:', error);
                                setNotification({ open: true, message: 'Failed to update background image', type: 'error' });
                            }
                        }
                    }
                }] : []),
                {
                    label: 'Delete', icon: <DeleteIcon fontSize="small" />, onClick: () => {
                        handleDelete(targetId);
                    }
                },
            ];
        }
        // Folder context menu
        if (contextMenu.target?.type === 'folder') {
            return [
                {
                    label: 'Open', icon: <FolderOpenIcon fontSize="small" />, onClick: () => {
                        const folder = folders.find(f => f._id === target?.id);
                        if (folder) navigateToFolder(folder);
                    }
                },
                {
                    label: 'Rename', icon: <RenameIcon fontSize="small" />, onClick: () => {
                        const folder = folders.find(f => f._id === target?.id);
                        if (folder) {
                            setNewFolderName(folder.name);
                            setRenameFolderDialog({ open: true, folder });
                        }
                    }
                },
                {
                    label: 'Share', icon: <ShareIcon fontSize="small" />, onClick: () => {
                        const folder = folders.find(f => f._id === target?.id);
                        if (folder) setShareDialog({ open: true, item: folder, type: 'folder' });
                    }
                },
                {
                    label: 'Change Color', icon: <PaletteIcon fontSize="small" />, onClick: () => {
                        if (target?.id) {
                            setColorPickerFolderId(target.id);
                        }
                    }
                },
                {
                    label: 'Delete', icon: <DeleteIcon fontSize="small" />, onClick: () => {
                        if (target?.id) handleDeleteFolder(target.id);
                    }
                },
            ];
        }

        // Empty area context menu
        return [
            { label: 'New Folder', icon: <CreateFolderIcon fontSize="small" />, onClick: () => setNewFolderDialog(true) },
        ];
    }, [
        contextMenu.target,
        files,
        folders,
        selectedIds,
        setFilesToMove,
        setMoveToFolderDialog,
        setShareDialog,
        setNewFolderName,
        setRenameFolderDialog,
        setColorPickerFolderId,
        setNewFolderDialog,
        handleDelete,
        handleDeleteFolder,
        navigateToFolder,
        setNotification
    ]);

    return {
        contextMenu,
        handleContextMenu,
        closeContextMenu,
        menuItems
    };
}
