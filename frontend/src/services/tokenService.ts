/**
 * Token Service - Secure localStorage token management
 * 
 * Security features:
 * - Token validation before use
 * - Automatic expiry checking
 * - Clean token removal on logout/expiry
 */

const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || 'aegis_auth_token';

/**
 * Parse JWT payload without verification (for client-side expiry check only)
 */
function parseJwtPayload(token: string): { exp?: number } | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
    const payload = parseJwtPayload(token);
    if (!payload?.exp) return true;

    // Add 10 second buffer to avoid edge cases
    return Date.now() >= (payload.exp * 1000) - 10000;
}

const tokenService = {
    /**
     * Store token in localStorage
     */
    setToken(token: string): void {
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch (error) {
            console.error('Failed to store token:', error);
        }
    },

    /**
     * Get valid token from localStorage (returns null if expired)
     */
    getToken(): string | null {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) return null;

            // Check expiry client-side (defense in depth)
            if (isTokenExpired(token)) {
                this.removeToken();
                return null;
            }

            return token;
        } catch (error) {
            console.error('Failed to retrieve token:', error);
            return null;
        }
    },

    /**
     * Remove token from localStorage
     */
    removeToken(): void {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error('Failed to remove token:', error);
        }
    },

    /**
     * Check if user has a valid token
     */
    hasValidToken(): boolean {
        return this.getToken() !== null;
    }
};

export default tokenService;
