
import { memo } from 'react';
import type { LinkPost, Collection } from '@/services/socialService'; // Adjust import if needed
import { CreateRoomDialog, CreateCollectionDialog, PostLinkDialog, MoveLinkDialog } from './SocialDialogs';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface SocialPageDialogsProps {
    // Visibility (driven by URL sync usually)
    showCreateDialog: boolean;
    showCollectionDialog: boolean;
    showPostLinkDialog: boolean;
    showMoveDialog: boolean;

    // Data State
    linkToMove: LinkPost | null;

    // Actions (Closing)
    onCloseCreateDialog: () => void;
    onCloseCollectionDialog: () => void;
    onClosePostLinkDialog: () => void;
    onCloseMoveDialog: () => void;

    // Actions (Submit)
    onCreateRoom: (name: string, description: string) => void;
    onCreateCollection: (name: string) => void;
    onPostLink: (url: string) => void;
    onMoveLink: (collectionId: string) => void;

    // Delete Confirmation
    deleteConfirmOpen: boolean;
    onCloseDeleteConfirm: () => void;
    onConfirmDeleteCollection: () => void;

    // Loading/Error States
    isCreatingRoom: boolean;
    isCreatingCollection: boolean;
    isPostingLink: boolean;
    isMovingLink: boolean;
    isDeletingCollection: boolean;

    postLinkError: string | null;
    collections: Collection[];
}

export const SocialPageDialogs = memo(({
    showCreateDialog,
    showCollectionDialog,
    showPostLinkDialog,
    showMoveDialog,
    linkToMove,
    onCloseCreateDialog,
    onCloseCollectionDialog,
    onClosePostLinkDialog,
    onCloseMoveDialog,
    onCreateRoom,
    onCreateCollection,
    onPostLink,
    onMoveLink,
    deleteConfirmOpen,
    onCloseDeleteConfirm,
    onConfirmDeleteCollection,
    isCreatingRoom,
    isCreatingCollection,
    isPostingLink,
    isMovingLink,
    isDeletingCollection,
    postLinkError,
    collections
}: SocialPageDialogsProps) => {
    return (
        <>
            <CreateRoomDialog
                open={showCreateDialog}
                onClose={onCloseCreateDialog}
                onSubmit={onCreateRoom}
                isLoading={isCreatingRoom}
            />

            <CreateCollectionDialog
                open={showCollectionDialog}
                onClose={onCloseCollectionDialog}
                onSubmit={onCreateCollection}
                isLoading={isCreatingCollection}
            />

            <PostLinkDialog
                open={showPostLinkDialog}
                onClose={onClosePostLinkDialog}
                onSubmit={onPostLink}
                isLoading={isPostingLink}
                error={postLinkError}
            />

            <MoveLinkDialog
                open={showMoveDialog}
                onClose={onCloseMoveDialog}
                onSubmit={onMoveLink}
                collections={collections}
                currentCollectionId={linkToMove?.collectionId || null}
                isLoading={isMovingLink}
            />

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Delete Collection"
                message="Are you sure you want to delete this collection? All links in this collection will be permanently deleted."
                confirmText="Delete"
                onConfirm={onConfirmDeleteCollection}
                onCancel={onCloseDeleteConfirm}
                isLoading={isDeletingCollection}
                variant="danger"
            />
        </>
    );
});
