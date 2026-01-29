import { doubleCsrf } from 'csrf-csrf';
import express from 'express';
import { config } from '../config/env';

/**
 * Configure Double-Submit Cookie CSRF protection.
 * - This implements the "Stateless Double-Submit Cookie" pattern.
 * - Ideally, secrets should be rotated, but for this implementation we use a static secret from env.
 */
const {
    doubleCsrfProtection,
    generateCsrfToken
} = doubleCsrf({
    getSecret: () => config.csrfSecret,
    getSessionIdentifier: (req) => "", // Stateless: we key it to nothing specific if not using sessions
    // This is the name of the "secret" cookie (encrypted/signed) used by the library.
    // It is separate from the token we expose to the client.
    cookieName: 'x-csrf-token',
    cookieOptions: {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax', // Must match cors creds
        path: '/',
    },
    size: 64, // The size of the generated token in bits
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Methods to ignore CSRF checks
    getCsrfTokenFromRequest: (req: express.Request) => {
        // We look for the token in the standard header Axios sends
        // Type assertion needed because headers can be string | string[]
        return req.headers['x-xsrf-token'] as string | undefined;
    }
});

// Export the middleware
export const csrfProtection = doubleCsrfProtection;

// Middleware to expose CSRF token to client via cookie
// The frontend (Axios) reads 'XSRF-TOKEN' from document.cookie and sends it back in 'X-XSRF-TOKEN' header.
export const csrfTokenCookie = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        // Generate the token (and set the secret cookie internally)
        const token = generateCsrfToken(req, res);

        // Attach to locals for use in controllers (e.g. authController returning it in JSON)
        res.locals.csrfToken = token;

        // Manually set the exposed cookie for the frontend to read
        res.cookie('XSRF-TOKEN', token, {
            httpOnly: false, // Must be accessible to JS
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax'
        });

        next();
    } catch (err) {
        next(err);
    }
};
