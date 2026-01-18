import type { StateCreator } from 'zustand';
import type { SocialState } from './types';
import socketService from '@/services/socketService';
import type { Collection, LinkPost } from '@/services/socialService';

export const createSocketSlice: StateCreator<SocialState, [], [], Pick<SocialState, keyof import('./types').SocketSlice>> = (set, get) => ({
    socketListenersAttached: false,

    setupSocketListeners: () => {
        const state = get();
        if (state.socketListenersAttached) return;

        socketService.removeAllListeners('NEW_LINK');
        socketService.removeAllListeners('NEW_COMMENT');
        socketService.removeAllListeners('LINK_UPDATED');
        socketService.removeAllListeners('LINK_DELETED');
        socketService.removeAllListeners('LINK_MOVED');
        socketService.removeAllListeners('COLLECTION_CREATED');
        socketService.removeAllListeners('COLLECTION_DELETED');
        socketService.removeAllListeners('COLLECTIONS_REORDERED');

        socketService.on('COLLECTION_CREATED', (data: { collection: Collection }) => {
            set((prev) => {
                const exists = prev.collections.some(c => c._id === data.collection._id);
                if (exists) return prev;
                return { collections: [...prev.collections, data.collection] };
            });
        });

        socketService.on('COLLECTION_DELETED', (data: { collectionId: string, roomId: string }) => {
            set((prev) => {
                const updatedCollections = prev.collections.filter(c => c._id !== data.collectionId);
                const updatedLinks = prev.links.filter(l => l.collectionId !== data.collectionId);
                let newCollectionId = prev.currentCollectionId;

                if (prev.currentCollectionId === data.collectionId) {
                    newCollectionId = updatedCollections[0]?._id || null;
                }

                return {
                    collections: updatedCollections,
                    links: updatedLinks,
                    currentCollectionId: newCollectionId
                };
            });
        });

        socketService.on('COLLECTIONS_REORDERED', (data: { collectionIds: string[] }) => {
            set((prev) => {
                const ordered = data.collectionIds.map(id =>
                    prev.collections.find(c => c._id === id)
                ).filter(Boolean) as Collection[];

                return { collections: ordered };
            });
        });

        socketService.on('NEW_LINK', (data: { link: LinkPost, collectionId: string }) => {
            const currentState = get();

            if (currentState.currentCollectionId === data.collectionId) {
                const exists = currentState.links.some(l => l._id === data.link._id);
                if (!exists) {
                    set((prev) => ({
                        links: [data.link, ...prev.links]
                    }));
                }
            }

            const cache = currentState.linksCache[data.collectionId];
            if (cache) {
                const exists = cache.links.some(l => l._id === data.link._id);
                if (!exists) {
                    set((prev) => ({
                        linksCache: {
                            ...prev.linksCache,
                            [data.collectionId]: {
                                ...cache,
                                links: [data.link, ...cache.links]
                            }
                        }
                    }));
                }
            }
        });

        socketService.on('NEW_COMMENT', (data: { linkId: string, commentCount: number }) => {
            set((prev) => ({
                commentCounts: {
                    ...prev.commentCounts,
                    [data.linkId]: data.commentCount
                }
            }));
        });

        socketService.on('LINK_UPDATED', (data: { link: LinkPost }) => {
            set((prev) => {
                const collectionId = data.link.collectionId;
                const linkExistsInState = prev.links.some(l => l._id === data.link._id);
                const currentCollectionId = get().currentCollectionId;

                let updatedLinks;
                if (linkExistsInState) {
                    updatedLinks = prev.links.map(l => l._id === data.link._id ? data.link : l);
                } else if (currentCollectionId === collectionId) {
                    updatedLinks = [data.link, ...prev.links];
                } else {
                    updatedLinks = prev.links;
                }

                const cache = prev.linksCache[collectionId];
                let newCache = prev.linksCache;
                if (cache) {
                    const cacheExists = cache.links.some(l => l._id === data.link._id);
                    newCache = {
                        ...prev.linksCache,
                        [collectionId]: {
                            ...cache,
                            links: cacheExists
                                ? cache.links.map(l => l._id === data.link._id ? data.link : l)
                                : [data.link, ...cache.links]
                        }
                    };
                }

                return {
                    links: updatedLinks,
                    linksCache: newCache
                };
            });
        });

        socketService.on('LINK_DELETED', (data: { linkId: string, collectionId: string }) => {
            set((prev) => {
                const updatedLinks = prev.links.filter(l => l._id !== data.linkId);

                const cache = prev.linksCache[data.collectionId];
                let newCache = prev.linksCache;

                if (cache) {
                    newCache = {
                        ...prev.linksCache,
                        [data.collectionId]: {
                            ...cache,
                            links: cache.links.filter(l => l._id !== data.linkId)
                        }
                    };
                }

                return {
                    links: updatedLinks,
                    linksCache: newCache
                };
            });
        });

        socketService.on('LINK_MOVED', (data: { linkId: string, newCollectionId: string, link: LinkPost }) => {
            const currentState = get();

            if (currentState.currentCollectionId === data.newCollectionId) {
                const exists = currentState.links.some(l => l._id === data.linkId);
                if (!exists) {
                    set((prev) => ({
                        links: [data.link, ...prev.links]
                    }));
                } else {
                    set((prev) => ({
                        links: prev.links.map(l => l._id === data.linkId ? data.link : l)
                    }));
                }
            } else {
                set((prev) => ({
                    links: prev.links.filter(l => l._id !== data.linkId)
                }));
            }

            set((prev) => {
                let newCache = { ...prev.linksCache };

                Object.keys(newCache).forEach(cId => {
                    const cache = newCache[cId];

                    if (cId === data.newCollectionId) {
                        const exists = cache.links.some(l => l._id === data.linkId);
                        if (!exists) {
                            newCache[cId] = {
                                ...cache,
                                links: [data.link, ...cache.links]
                            };
                        }
                    } else {
                        if (cache.links.some(l => l._id === data.linkId)) {
                            newCache[cId] = {
                                ...cache,
                                links: cache.links.filter(l => l._id !== data.linkId)
                            };
                        }
                    }
                });

                return { linksCache: newCache };
            });
        });

        socketService.on('disconnect', () => {
            console.log('[Store] Socket disconnected - data may become stale');
        });

        socketService.on('connect', () => {
            const state = get();
            console.log('[Store] Socket Reconnected - refreshing data');

            if (state.currentRoom) {
                set({ linksCache: {} });

                const collectionId = state.currentCollectionId;
                if (collectionId) {
                    setTimeout(() => {
                        const currentState = get();
                        if (currentState.currentCollectionId === collectionId) {
                            get().fetchCollectionLinks(collectionId, false, true);
                        }
                    }, 150);
                }
            }
        });

        set({ socketListenersAttached: true });
    }
});
