import { useEffect } from 'react';
import type { Room } from '@/services/socialService';

interface UseShareIntentProps {
    currentRoom: Room | null;
    handlePostLink: (url: string) => void;
    setPendingShareUrl: (url: string) => void;
    showSnackbar: (message: string, severity: 'success' | 'error' | 'info') => void;
}

export function useShareIntent({ currentRoom, handlePostLink, setPendingShareUrl, showSnackbar }: UseShareIntentProps) {
    useEffect(() => {
        const handleShareIntent = (event: CustomEvent<{ url: string }>) => {
            const { url } = event.detail;
            if (!url) return;

            if (currentRoom) {
                // Room is active, auto submit
                handlePostLink(url);
            } else {
                // No room selected, save for later
                setPendingShareUrl(url);
                showSnackbar('Select a room to share this link', 'info');
            }
        };

        window.addEventListener('AEGIS_SHARE_INTENT', handleShareIntent as EventListener);
        return () => {
            window.removeEventListener('AEGIS_SHARE_INTENT', handleShareIntent as EventListener);
        };
    }, [currentRoom, handlePostLink, setPendingShareUrl, showSnackbar]);
}
