import type { StateCreator } from 'zustand';
import type { SocialState } from './types';
import socialService, { retryOperation, type LinkPost } from '@/services/socialService';

export const createLinkSlice: StateCreator<SocialState, [], [], Pick<SocialState, keyof import('./types').LinkSlice>> = (set, get) => ({
    links: [],
    linksCache: {},
    viewedLinkIds: new Set(),
    commentCounts: {},
    unviewedCounts: {},
    isLoadingLinks: false,
    isSearchingLinks: false,
    hasMoreLinks: false,

    fetchCollectionLinks: async (collectionId: string, isLoadMore: boolean = false, silent: boolean = false, limit: number = 12) => {
        const state = get();
        if (!state.currentRoom) return;

        if (!silent) {
            set({ isLoadingLinks: true });
        }

        let beforeCursor: { createdAt: string; id: string } | undefined;
        if (isLoadMore && state.links.length > 0) {
            const lastLink = state.links[state.links.length - 1];
            beforeCursor = {
                createdAt: lastLink.createdAt,
                id: lastLink._id
            };
        }

        try {
            const result = await socialService.getCollectionLinks(
                state.currentRoom._id,
                collectionId,
                limit,
                beforeCursor
            );

            const currentState = get();
            if (currentState.currentCollectionId !== collectionId) {
                return;
            }

            set((prev) => {
                if (prev.currentCollectionId !== collectionId) {
                    return prev;
                }

                const existingLinks = new Map(prev.links.map(l => [l._id, l]));

                const reconcileLink = (newL: LinkPost) => {
                    const existing = existingLinks.get(newL._id);
                    if (!existing) return newL;

                    const isExistingBetter = existing.previewData?.scrapeStatus !== 'scraping' &&
                        newL.previewData?.scrapeStatus === 'scraping';

                    return isExistingBetter ? existing : newL;
                };

                let newLinks = prev.links;
                if (!isLoadMore) {
                    if (silent) {
                        const existingLinkIds = new Set(prev.links.map(l => l._id));
                        const refreshedLinks = result.links.map(reconcileLink);

                        const newItems = refreshedLinks.filter(l => !existingLinkIds.has(l._id));
                        const refreshedMap = new Map(refreshedLinks.map(l => [l._id, l]));

                        newLinks = prev.links.map(l => refreshedMap.get(l._id) || reconcileLink(l));
                        newLinks = [...newItems, ...newLinks];
                    } else {
                        newLinks = result.links.map(reconcileLink);
                    }
                } else {
                    const existingIds = new Set(prev.links.map(l => l._id));
                    const uniqueNewLinks = result.links
                        .filter(l => !existingIds.has(l._id))
                        .map(reconcileLink);
                    newLinks = [...prev.links, ...uniqueNewLinks];
                }

                let newViewedLinkIds = prev.viewedLinkIds;
                if (!isLoadMore && !silent) {
                    newViewedLinkIds = new Set(result.viewedLinkIds);
                } else if (result.viewedLinkIds && result.viewedLinkIds.length > 0) {
                    const hasNew = result.viewedLinkIds.some(id => !prev.viewedLinkIds.has(id));
                    if (hasNew) {
                        newViewedLinkIds = new Set([...prev.viewedLinkIds, ...result.viewedLinkIds]);
                    }
                }

                const newCommentCounts = { ...prev.commentCounts, ...result.commentCounts };

                const newLinksCache = {
                    ...prev.linksCache,
                    [collectionId]: {
                        links: newLinks,
                        hasMore: result.hasMore
                    }
                };

                return {
                    links: newLinks,
                    viewedLinkIds: newViewedLinkIds,
                    commentCounts: newCommentCounts,
                    hasMoreLinks: result.hasMore,
                    linksCache: newLinksCache
                };
            });
        } catch (error) {
            console.error('Failed to fetch collection links:', error);
        } finally {
            const finalState = get();
            if (finalState.currentCollectionId === collectionId) {
                set({ isLoadingLinks: false });
            }
        }
    },

    loadMoreLinks: async () => {
        const state = get();
        if (!state.currentCollectionId || !state.hasMoreLinks || state.isLoadingLinks) return;

        await get().fetchCollectionLinks(state.currentCollectionId, true);
    },

    loadAllLinks: async () => {
        const state = get();
        if (!state.currentCollectionId || !state.hasMoreLinks || state.isLoadingLinks) return;

        await get().fetchCollectionLinks(state.currentCollectionId, true, false, 500);
    },

    searchRoomLinks: async (query: string, limit: number = 50) => {
        const state = get();
        if (!state.currentRoom) return;

        set({ isSearchingLinks: true });

        try {
            const result = await socialService.searchRoomLinks(state.currentRoom._id, query, limit);

            set((prev) => ({
                links: result.links,
                viewedLinkIds: new Set([...prev.viewedLinkIds, ...(result.viewedLinkIds || [])]),
                commentCounts: { ...prev.commentCounts, ...(result.commentCounts || {}) },
                isSearchingLinks: false,
                hasMoreLinks: false // Search results are usually fixed limit
            }));
        } catch (error) {
            console.error('Failed to search room links:', error);
            set({ isSearchingLinks: false });
        }
    },

    postLink: async (url: string) => {
        // Validate URL
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('URL must start with http:// or https://');
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            const msg = message === 'URL must start with http:// or https://' ? message : 'Invalid URL format';
            console.error('Validation error:', msg);
            throw new Error(msg);
        }

        const state = get();
        if (!state.currentRoom) {
            throw new Error('No room selected');
        }

        try {
            const linkPost = await socialService.postLink(
                state.currentRoom._id,
                url,
                state.currentCollectionId || undefined
            );

            set((prev) => {
                const existingLink = prev.links.find(l => l._id === linkPost._id);
                if (existingLink) {
                    return prev;
                }
                return { links: [linkPost, ...prev.links] };
            });

            return linkPost;
        } catch (error) {
            console.error('Failed to post link:', error);
            throw error;
        }
    },

    deleteLink: async (linkId: string) => {
        const state = get();
        const originalLinks = state.links;

        // Optimistic update
        set({ links: state.links.filter(l => l._id !== linkId) });

        try {
            await retryOperation(() => socialService.deleteLink(linkId));
        } catch (error) {
            console.error('Failed to delete link:', error);
            // Revert on failure
            set({ links: originalLinks });
        }
    },

    moveLink: async (linkId: string, collectionId: string) => {
        const state = get();
        const originalLinks = state.links;

        // Optimistic update
        set({
            links: state.links.map(l =>
                l._id === linkId ? { ...l, collectionId: collectionId } : l
            )
        });

        try {
            await retryOperation(() => socialService.moveLink(linkId, collectionId));
        } catch (error) {
            console.error('Failed to move link:', error);
            // Revert on failure
            set({ links: originalLinks });
        }
    },

    markLinkViewed: async (linkId: string) => {
        const state = get();
        if (state.viewedLinkIds.has(linkId)) return;

        const newViewedIds = new Set(state.viewedLinkIds);
        newViewedIds.add(linkId);

        const link = state.links.find(l => l._id === linkId);
        const newUnviewedCounts = { ...state.unviewedCounts };
        if (link && newUnviewedCounts[link.collectionId]) {
            newUnviewedCounts[link.collectionId] = Math.max(0, newUnviewedCounts[link.collectionId] - 1);
        }

        set({
            viewedLinkIds: newViewedIds,
            unviewedCounts: newUnviewedCounts
        });

        try {
            await socialService.markLinkViewed(linkId);
        } catch (error) {
            console.error('Failed to mark link as viewed:', error);
            const revertedViewed = new Set(state.viewedLinkIds);
            set({
                viewedLinkIds: revertedViewed,
                unviewedCounts: state.unviewedCounts
            });
        }
    },

    unmarkLinkViewed: async (linkId: string) => {
        const state = get();
        if (!state.viewedLinkIds.has(linkId)) return;

        const newViewedIds = new Set(state.viewedLinkIds);
        newViewedIds.delete(linkId);

        const link = state.links.find(l => l._id === linkId);
        const newUnviewedCounts = { ...state.unviewedCounts };
        if (link) {
            newUnviewedCounts[link.collectionId] = (newUnviewedCounts[link.collectionId] || 0) + 1;
        }

        set({
            viewedLinkIds: newViewedIds,
            unviewedCounts: newUnviewedCounts
        });

        try {
            await socialService.unmarkLinkViewed(linkId);
        } catch (error) {
            console.error('Failed to unmark link as viewed:', error);
            const revertedViewed = new Set(state.viewedLinkIds);
            revertedViewed.add(linkId);
            set({
                viewedLinkIds: revertedViewed,
                unviewedCounts: state.unviewedCounts
            });
        }
    },

    getUnviewedCountByCollection: (collectionId: string) => {
        const state = get();
        return state.unviewedCounts[collectionId] || 0;
    },
});
