import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LinkPost } from '@/services/socialService';

export function useSocialUrlSync(links: LinkPost[]) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Dialog Visibility State
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showCollectionDialog, setShowCollectionDialog] = useState(false);
    const [showPostLinkDialog, setShowPostLinkDialog] = useState(false);
    const [showMoveDialog, setShowMoveDialog] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [zenModeOpen, setZenModeOpen] = useState(false);

    // Data State (Resolved from URL IDs)
    const [linkToMove, setLinkToMove] = useState<LinkPost | null>(null);
    const [commentsLink, setCommentsLink] = useState<LinkPost | null>(null);
    const [readerLink, setReaderLink] = useState<LinkPost | null>(null);
    const [previewLink, setPreviewLink] = useState<LinkPost | null>(null);

    // URL Synchronization Helper
    const toggleOverlay = useCallback((key: string, value: string | boolean | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (value === null || value === false) {
                next.delete(key);
            } else {
                next.set(key, String(value));
            }
            return next;
        });
    }, [setSearchParams]);

    // Sync URL parameters with local state
    useEffect(() => {
        const commentsId = searchParams.get('comments');
        const readerId = searchParams.get('reader');
        const moveId = searchParams.get('move');
        const previewId = searchParams.get('preview');
        const post = searchParams.get('post') === 'true';
        const createRoom = searchParams.get('createRoom') === 'true';
        const createCol = searchParams.get('createCol') === 'true';
        const zen = searchParams.get('zen') === 'true';

        // Comments Link
        if (commentsId) {

            const link = links.find(l => l._id === commentsId);
            if (link && commentsLink?._id !== commentsId) {
                // Defer state update to avoid synchronous setState in effect
                Promise.resolve().then(() => {
                    setCommentsLink(link);
                });
            }
        } else if (commentsLink) {
            Promise.resolve().then(() => {
                setCommentsLink(null);
            });
        }

        // Reader Link
        if (readerId) {
            const link = links.find(l => l._id === readerId);
            if (link && readerLink?._id !== readerId) {
                Promise.resolve().then(() => {
                    setReaderLink(link);
                });
            }
        } else if (readerLink) {
            Promise.resolve().then(() => {
                setReaderLink(null);
            });
        }

        // Move Link
        if (moveId) {
            const link = links.find(l => l._id === moveId);
            if (link && (linkToMove?._id !== moveId || !showMoveDialog)) {
                Promise.resolve().then(() => {
                    setLinkToMove(link);
                    setShowMoveDialog(true);
                });
            }
        } else if (showMoveDialog) {
            Promise.resolve().then(() => {
                setShowMoveDialog(false);
                setLinkToMove(null);
            });
        }

        // Preview Link
        if (previewId) {
            const link = links.find(l => l._id === previewId);
            if (link && (previewLink?._id !== previewId || !showPreview)) {
                Promise.resolve().then(() => {
                    setPreviewLink(link);
                    setShowPreview(true);
                });
            }
        } else if (showPreview) {
            Promise.resolve().then(() => {
                setShowPreview(false);
                setPreviewLink(null);
            });
        }

        // Boolean Dialogs
        Promise.resolve().then(() => {
            if (post !== showPostLinkDialog) setShowPostLinkDialog(post);
            if (createRoom !== showCreateDialog) setShowCreateDialog(createRoom);
            if (createCol !== showCollectionDialog) setShowCollectionDialog(createCol);
            if (zen !== zenModeOpen) setZenModeOpen(zen);
        });

    }, [searchParams, links, commentsLink, readerLink, linkToMove, showMoveDialog, previewLink, showPreview, showPostLinkDialog, showCreateDialog, showCollectionDialog, zenModeOpen]);

    return {
        // State
        showCreateDialog,
        showCollectionDialog,
        showPostLinkDialog,
        showMoveDialog,
        showPreview,
        zenModeOpen,
        linkToMove,
        commentsLink,
        readerLink,
        previewLink,

        // Actions
        toggleOverlay,
    };
}
