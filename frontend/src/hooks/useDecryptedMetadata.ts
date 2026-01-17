import { useState, useEffect } from 'react';
import { useSocialStore } from '@/stores/useSocialStore';
import type { Room, Collection } from '@/services/socialService';

/**
 * Hook to lazily decrypt room metadata (name and description).
 * Returns the decrypted metadata and a loading state.
 */
export function useDecryptedRoomMetadata(room: Room | null) {
    const decryptRoomMetadata = useSocialStore((state) => state.decryptRoomMetadata);
    const roomKey = useSocialStore((state) => state.roomKeys.get(room?._id || ''));
    const [metadata, setMetadata] = useState<{ name: string; description: string } | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const decrypt = async () => {
            if (!room) {
                setMetadata(null);
                return;
            }

            if (!roomKey) {
                setMetadata({ name: '[Encrypted]', description: '' });
                return;
            }

            if (isMounted) setIsDecrypting(true);
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
        return () => { isMounted = false; };
    }, [room, roomKey, decryptRoomMetadata]);

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
