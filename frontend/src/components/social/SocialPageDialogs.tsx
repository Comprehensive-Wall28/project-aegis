import { memo, useMemo } from 'react';
import { CreateRoomDialog, CreateCollectionDialog, RenameCollectionDialog, PostLinkDialog, MoveLinkDialog, DeleteRoomDialog } from './SocialDialogs';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useSocial } from '@/hooks/useSocial';
import { useDecryptedRoomMetadata } from '@/hooks/useDecryptedMetadata';

export const SocialPageDialogs = memo(() => {
    const {
        showCreateDialog,
        toggleOverlay,
        handleCreateRoom,
        isCreating,
        showCollectionDialog,
        handleCreateCollection,
        isCreatingCollection,
        isRenamingCollection,
        collectionToRename,
        setCollectionToRename,
        handleRenameCollection,
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
        isDeletingCollection,
        leaveRoomConfirmOpen,
        setLeaveRoomConfirmOpen,
        handleLeaveRoom,
        isLeavingRoom,
        roomToLeave,
        deleteRoomConfirmOpen,
        setDeleteRoomConfirmOpen,
        handleDeleteRoom,
        isDeletingRoom,
        roomToDelete,
        rooms
    } = useSocial();

    const collectionBeingRenamed = collectionToRename
        ? collections.find(c => c._id === collectionToRename) || null
        : null;

    const roomToBeLeft = useMemo(() =>
        rooms.find(r => r._id === roomToLeave) || null,
        [rooms, roomToLeave]);

    const roomToBeDeleted = useMemo(() =>
        rooms.find(r => r._id === roomToDelete) || null,
        [rooms, roomToDelete]);

    const { name: decryptedRoomName } = useDecryptedRoomMetadata(roomToBeLeft);

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

            <RenameCollectionDialog
                open={!!collectionToRename}
                collection={collectionBeingRenamed}
                onClose={() => setCollectionToRename(null)}
                onSubmit={handleRenameCollection}
                isLoading={isRenamingCollection}
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

            <ConfirmDialog
                open={leaveRoomConfirmOpen}
                title="Leave Room"
                message={`Are you sure you want to leave "${decryptedRoomName || 'this room'}"? You will no longer have access to its contents unless invited back.`}
                confirmText="Leave Room"
                onConfirm={handleLeaveRoom}
                onCancel={() => setLeaveRoomConfirmOpen(false)}
                isLoading={isLeavingRoom}
                variant="danger"
            />

            <DeleteRoomDialog
                open={deleteRoomConfirmOpen}
                room={roomToBeDeleted}
                onClose={() => setDeleteRoomConfirmOpen(false)}
                onConfirm={handleDeleteRoom}
                isLoading={isDeletingRoom}
            />
        </>
    );
});
