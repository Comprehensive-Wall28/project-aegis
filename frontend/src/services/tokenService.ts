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

/**
 * Find any JWT token in localStorage (fallback for key mismatch)
 */
function findAnyJwtToken(): { key: string; token: string } | null {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            const value = localStorage.getItem(key);
            // Check if it looks like a JWT (three dot-separated base64 parts)
            if (value && value.split('.').length === 3 && value.startsWith('eyJ')) {
                return { key, token: value };
            }
        }
    } catch {
        // Silently fail
    }
    return null;
}

const tokenService = {
    /**
     * Store token in localStorage
     */
    setToken(token: string): void {
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch {
            // Storage might be full or disabled
        }
    },

    /**
     * Get valid token from localStorage (returns null if expired)
     */
    getToken(): string | null {
        try {
            let token = localStorage.getItem(TOKEN_KEY);

            // Fallback: Try to find any JWT if primary key doesn't work
            if (!token) {
                const found = findAnyJwtToken();
                if (found) {
                    token = found.token;
                    // Migrate token to correct key for future use
                    localStorage.setItem(TOKEN_KEY, token);
                    if (found.key !== TOKEN_KEY) {
                        localStorage.removeItem(found.key);
                    }
                }
            }

            if (!token) {
                return null;
            }

            // Check expiry client-side (defense in depth)
            if (isTokenExpired(token)) {
                this.removeToken();
                return null;
            }

            return token;
        } catch {
            return null;
        }
    },

    /**
     * Remove token from localStorage
     */
    removeToken(): void {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
            // Ignore
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
