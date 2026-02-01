/**
 * Centralized logout cleanup utility.
 * Clears all stores, caches, and browser storage to ensure
 * no data from the previous user persists after logout.
 */

import { useSessionStore } from '@/stores/sessionStore';
import { useSocialStore } from '@/stores/useSocialStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { useFolderKeyStore } from '@/stores/useFolderKeyStore';
import { useUploadStore } from '@/stores/useUploadStore';
import { queryClient } from '@/api/queryClient';
import { blobCache } from '@/lib/blobCache';
import { backgroundCache } from '@/lib/backgroundCache';
import { clearStoredSeed } from '@/lib/cryptoUtils';
import authService from '@/services/authService';

// Constants for storage keys that need to be cleared
const LOCAL_STORAGE_KEYS_TO_CLEAR = [
    'kanban_sort_mode',
    // Add any other user-specific localStorage keys here
];

const SESSION_STORAGE_KEYS_TO_CLEAR = [
    'pendingInvite',
    // Add any other user-specific sessionStorage keys here
];

/**
 * Clear the service worker cache by sending a message to the SW.
 */
async function clearServiceWorkerCache(): Promise<void> {
    try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Send message to service worker to clear cache
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        }
    } catch (error) {
        console.warn('Failed to clear service worker cache:', error);
    }
}

/**
 * Clear all IndexedDB databases used by the app.
 */
async function clearIndexedDB(): Promise<void> {
    try {
        // Clear background cache (aegis-cache database)
        await backgroundCache.clearAll();
    } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
    }
}

/**
 * Clear authentication cookies from the browser.
 * This ensures cookies are removed even if the backend response fails.
 */
function clearCookies(): void {
    const cookiesToClear = ['token', 'XSRF-TOKEN'];
    
    cookiesToClear.forEach(name => {
        // Clear cookie for current path
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        // Also try with domain variations for localhost development
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost`;
    });
}

/**
 * Clear all browser storage (localStorage and sessionStorage).
 */
function clearBrowserStorage(): void {
    // Clear specific localStorage keys (not all, to preserve non-user data like theme)
    LOCAL_STORAGE_KEYS_TO_CLEAR.forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Failed to remove localStorage key "${key}":`, error);
        }
    });

    // Clear specific sessionStorage keys
    SESSION_STORAGE_KEYS_TO_CLEAR.forEach(key => {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.warn(`Failed to remove sessionStorage key "${key}":`, error);
        }
    });
}

/**
 * Clear all Zustand stores.
 * Exported for use during login to ensure fresh state.
 */
export function clearAllStores(): void {
    // Session store - clear user and auth state
    useSessionStore.getState().clearSession();

    // Social store - clear rooms, collections, links, socket connection
    useSocialStore.getState().clearSocial();

    // Task store - reset tasks
    useTaskStore.getState().reset();

    // Calendar store - reset events
    useCalendarStore.getState().reset();

    // Folder key store - clear decrypted folder keys
    useFolderKeyStore.getState().clearKeys();

    // Upload store - reset upload state
    useUploadStore.getState().reset();
}

/**
 * Clear all caches (React Query, blob cache).
 * Exported for use during login to ensure fresh state.
 */
export function clearAllCaches(): void {
    // React Query cache - clear all cached queries
    queryClient.clear();

    // Blob cache - clear all cached blob URLs
    blobCache.clear();
}

/**
 * Main logout cleanup function.
 * Call this from all logout handlers to ensure complete cleanup.
 */
export async function performLogoutCleanup(): Promise<void> {
    try {
        // 1. Call backend logout endpoint
        await authService.logout();
    } catch (error) {
        // Continue with cleanup even if backend call fails
        console.warn('Backend logout failed, continuing with local cleanup:', error);
    }

    // 2. Clear cookies (token, XSRF-TOKEN) from browser
    clearCookies();

    // 3. Clear PQC seed from sessionStorage
    clearStoredSeed();

    // 4. Clear all Zustand stores
    clearAllStores();

    // 5. Clear all caches
    clearAllCaches();

    // 6. Clear browser storage
    clearBrowserStorage();

    // 7. Clear IndexedDB - await to ensure complete before navigation
    await clearIndexedDB();

    // 8. Clear service worker cache
    await clearServiceWorkerCache();
}

export default performLogoutCleanup;
