import type { StateCreator } from 'zustand';
import type { SocialState } from './types';
import socketService from '@/services/socketService';
import type { Collection, LinkPost } from '@/services/socialService';

export const createSocketSlice: StateCreator<SocialState, [], [], Pick<SocialState, keyof import('./types').SocketSlice>> = (set, get) => ({
    socketListenersAttached: false,

    cleanupSocketListeners: () => {
        socketService.removeAllListeners('NEW_LINK');
        socketService.removeAllListeners('NEW_COMMENT');
        socketService.removeAllListeners('LINK_UPDATED');
        socketService.removeAllListeners('LINK_DELETED');
        socketService.removeAllListeners('LINK_MOVED');
        socketService.removeAllListeners('COLLECTION_CREATED');
        socketService.removeAllListeners('COLLECTION_DELETED');
        socketService.removeAllListeners('COLLECTIONS_REORDERED');
        set({ socketListenersAttached: false });
    },

    setupSocketListeners: () => {
        const state = get();
        if (state.socketListenersAttached) return;

        get().cleanupSocketListeners();

        socketService.on('COLLECTION_CREATED', (data: { collection: Collection }) => {
            set((prev) => {
                const exists = prev.collections.some(c => c._id === data.collection._id);
                if (exists) return prev;
                return {
                    collections: [...prev.collections, data.collection],
                    unviewedCounts: {
                        ...prev.unviewedCounts,
                        [data.collection._id]: 0
                    }
                };
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

                // Remove from unviewed counts
                const newUnviewedCounts = { ...prev.unviewedCounts };
                delete newUnviewedCounts[data.collectionId];

                return {
                    collections: updatedCollections,
                    links: updatedLinks,
                    currentCollectionId: newCollectionId,
                    unviewedCounts: newUnviewedCounts
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
            set((prev) => {
                const isCurrentCollection = prev.currentCollectionId === data.collectionId;
                const exists = prev.links.some(l => l._id === data.link._id);

                let newLinks = prev.links;
                if (isCurrentCollection && !exists) {
                    newLinks = [data.link, ...prev.links];
                }

                // Update unviewed counts if it's not our own link or just always to be safe
                // (Backend will typically exclude viewed links from counts anyway)
                const newUnviewedCounts = { ...prev.unviewedCounts };
                if (newUnviewedCounts[data.collectionId] !== undefined) {
                    newUnviewedCounts[data.collectionId]++;
                }

                const cache = prev.linksCache[data.collectionId];
                let newLinksCache = prev.linksCache;
                if (cache) {
                    const cacheExists = cache.links.some(l => l._id === data.link._id);
                    if (!cacheExists) {
                        newLinksCache = {
                            ...prev.linksCache,
                            [data.collectionId]: {
                                ...cache,
                                links: [data.link, ...cache.links]
                            }
                        };
                    }
                }

                return {
                    links: newLinks,
                    unviewedCounts: newUnviewedCounts,
                    linksCache: newLinksCache
                };
            });
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
                const isCurrentCollection = prev.currentCollectionId === collectionId;

                let updatedLinks = prev.links;
                if (linkExistsInState) {
                    updatedLinks = prev.links.map(l => l._id === data.link._id ? data.link : l);
                } else if (isCurrentCollection) {
                    updatedLinks = [data.link, ...prev.links];
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
                const wasViewed = prev.viewedLinkIds.has(data.linkId);
                const updatedLinks = prev.links.filter(l => l._id !== data.linkId);

                // Update unviewed counts if link was unviewed
                const newUnviewedCounts = { ...prev.unviewedCounts };
                if (!wasViewed && newUnviewedCounts[data.collectionId] > 0) {
                    newUnviewedCounts[data.collectionId]--;
                }

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
                    linksCache: newCache,
                    unviewedCounts: newUnviewedCounts
                };
            });
        });

        socketService.on('LINK_MOVED', (data: { linkId: string, oldCollectionId: string, newCollectionId: string, link: LinkPost }) => {
            set((prev) => {
                const isCurrentNew = prev.currentCollectionId === data.newCollectionId;
                const isCurrentOld = prev.currentCollectionId === data.oldCollectionId;
                const wasViewed = prev.viewedLinkIds.has(data.linkId);

                let updatedLinks = prev.links;
                if (isCurrentNew) {
                    const exists = prev.links.some(l => l._id === data.linkId);
                    if (!exists) {
                        updatedLinks = [data.link, ...prev.links];
                    } else {
                        updatedLinks = prev.links.map(l => l._id === data.linkId ? data.link : l);
                    }
                } else if (isCurrentOld) {
                    updatedLinks = prev.links.filter(l => l._id !== data.linkId);
                }

                // Update unviewed counts
                const newUnviewedCounts = { ...prev.unviewedCounts };
                if (!wasViewed) {
                    if (newUnviewedCounts[data.oldCollectionId] > 0) {
                        newUnviewedCounts[data.oldCollectionId]--;
                    }
                    if (newUnviewedCounts[data.newCollectionId] !== undefined) {
                        newUnviewedCounts[data.newCollectionId]++;
                    }
                }

                // Update caches
                let newCache = { ...prev.linksCache };
                Object.keys(newCache).forEach(cId => {
                    const cache = newCache[cId];
                    if (cId === data.newCollectionId) {
                        const exists = cache.links.some(l => l._id === data.linkId);
                        newCache[cId] = {
                            ...cache,
                            links: exists
                                ? cache.links.map(l => l._id === data.linkId ? data.link : l)
                                : [data.link, ...cache.links]
                        };
                    } else if (cId === data.oldCollectionId) {
                        newCache[cId] = {
                            ...cache,
                            links: cache.links.filter(l => l._id !== data.linkId)
                        };
                    }
                });

                return {
                    links: updatedLinks,
                    linksCache: newCache,
                    unviewedCounts: newUnviewedCounts
                };
            });
        });

        socketService.on('disconnect', () => {
            console.log('[Store] Socket disconnected - data may become stale');
        });

        socketService.on('connect', () => {
            const state = get();
            console.log('[Store] Socket Reconnected - refreshing data');

            if (state.currentRoom) {
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
