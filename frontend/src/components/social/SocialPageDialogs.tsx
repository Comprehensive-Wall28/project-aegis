import { memo } from 'react';
import { CreateRoomDialog, CreateCollectionDialog, PostLinkDialog, MoveLinkDialog } from './SocialDialogs';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useSocial } from '@/hooks/useSocial';

export const SocialPageDialogs = memo(() => {
    const {
        showCreateDialog,
        toggleOverlay,
        handleCreateRoom,
        isCreating,
        showCollectionDialog,
        handleCreateCollection,
        isCreatingCollection,
        showPostLinkDialog,
        handlePostLink,
        isPostingLink,
        postLinkError,
        showMoveDialog,
        handleMoveLink,
        collections,
        linkToMove,
        isMovingLink,
        deleteConfirmOpen,
        setDeleteConfirmOpen,
        handleDeleteCollection,
        isDeletingCollection
    } = useSocial();

    return (
        <>
            <CreateRoomDialog
                open={showCreateDialog}
                onClose={() => toggleOverlay('createRoom', false)}
                onSubmit={handleCreateRoom}
                isLoading={isCreating}
            />

            <CreateCollectionDialog
                open={showCollectionDialog}
                onClose={() => toggleOverlay('createCol', false)}
                onSubmit={handleCreateCollection}
                isLoading={isCreatingCollection}
            />

            <PostLinkDialog
                open={showPostLinkDialog}
                onClose={() => toggleOverlay('post', false)}
                onSubmit={handlePostLink}
                isLoading={isPostingLink}
                error={postLinkError}
            />

            <MoveLinkDialog
                open={showMoveDialog}
                onClose={() => toggleOverlay('move', false)}
                onSubmit={handleMoveLink}
                collections={collections}
                currentCollectionId={linkToMove?.collectionId || null}
                isLoading={isMovingLink}
            />

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Delete Collection"
                message="Are you sure you want to delete this collection? All links in this collection will be permanently deleted."
                confirmText="Delete"
                onConfirm={handleDeleteCollection}
                onCancel={() => setDeleteConfirmOpen(false)}
                isLoading={isDeletingCollection}
                variant="danger"
            />
        </>
    );
});
