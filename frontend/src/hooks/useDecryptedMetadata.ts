import { useState, useEffect, useRef } from 'react';
import { useSocialStore } from '@/stores/useSocialStore';
import type { Room, Collection } from '@/services/socialService';

/**
 * Hook to lazily decrypt room metadata (name and description).
 * Returns the decrypted metadata and a loading state.
 * 
 * Key improvement: Instead of showing "[Encrypted]" immediately while waiting for
 * room keys to be decrypted, we show a loading state. We only show "[Encrypted]"
 * if the key has been explicitly set as unavailable or after a timeout.
 */
export function useDecryptedRoomMetadata(room: Room | null) {
    const decryptRoomMetadata = useSocialStore((state) => state.decryptRoomMetadata);
    const roomKey = useSocialStore((state) => state.roomKeys.get(room?._id || ''));
    const isLoadingRooms = useSocialStore((state) => state.isLoadingRooms);
    const [metadata, setMetadata] = useState<{ name: string; description: string } | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(true); // Start as true to avoid flicker
    const hasAttemptedDecrypt = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let isMounted = true;

        const decrypt = async () => {
            if (!room) {
                setMetadata(null);
                setIsDecrypting(false);
                return;
            }

            // If we don't have a key yet and rooms are still loading, keep showing loading
            if (!roomKey) {
                // Only show encrypted state after a reasonable timeout or if we've confirmed no key
                if (!isLoadingRooms && hasAttemptedDecrypt.current) {
                    setMetadata({ name: '[Encrypted]', description: '' });
                    setIsDecrypting(false);
                } else {
                    // Wait for key with a timeout fallback
                    setIsDecrypting(true);
                    timeoutRef.current = setTimeout(() => {
                        if (isMounted && !roomKey) {
                            hasAttemptedDecrypt.current = true;
                            setMetadata({ name: '[Encrypted]', description: '' });
                            setIsDecrypting(false);
                        }
                    }, 2000); // 2 second timeout before showing encrypted
                }
                return;
            }

            // Clear any pending timeout since we have a key now
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            if (isMounted) setIsDecrypting(true);
            hasAttemptedDecrypt.current = true;
            try {
                const results = await decryptRoomMetadata(room);
                if (isMounted) setMetadata(results);
            } catch (err) {
                console.error('Failed to decrypt room metadata:', err);
                if (isMounted) setMetadata({ name: '[Encrypted]', description: '' });
            } finally {
                if (isMounted) setIsDecrypting(false);
            }
        };

        decrypt();
        return () => {
            isMounted = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [room, roomKey, isLoadingRooms, decryptRoomMetadata]);

    return {
        name: metadata?.name || null,
        description: metadata?.description || null,
        isDecrypting
    };
}

/**
 * Hook to lazily decrypt collection metadata (name).
 * Returns the decrypted name and a loading state.
 */
export function useDecryptedCollectionMetadata(collection: Collection | null) {
    const decryptCollectionMetadata = useSocialStore((state) => state.decryptCollectionMetadata);
    const [decryptedName, setDecryptedName] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const decrypt = async () => {
            if (!collection) {
                setDecryptedName(null);
                return;
            }

            if (collection.type === 'links' && !collection.name) {
                if (isMounted) setDecryptedName('Links');
                return;
            }

            if (isMounted) setIsDecrypting(true);
            try {
                const { name } = await decryptCollectionMetadata(collection);
                if (isMounted) setDecryptedName(name);
            } catch (err) {
                console.error('Failed to decrypt collection metadata:', err);
                if (isMounted) setDecryptedName('[Encrypted]');
            } finally {
                if (isMounted) setIsDecrypting(false);
            }
        };

        decrypt();
        return () => { isMounted = false; };
    }, [collection, decryptCollectionMetadata]);

    return {
        name: decryptedName,
        isDecrypting
    };
}
