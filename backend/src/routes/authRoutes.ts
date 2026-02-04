import { FastifyInstance } from 'fastify';
import {
    registerUser,
    loginUser,
    getMe,
    updateMe,
    logoutUser,
    getCsrfToken,
    getRegistrationOptions,
    verifyRegistration,
    getAuthenticationOptions,
    verifyAuthentication,
    removePasskey,
    discoverUser,
} from '../controllers/authController';

export default async function authRoutes(fastify: FastifyInstance) {
    // Public routes - NO CSRF protection (prevents race condition on fresh page loads)
    fastify.post('/register', registerUser);
    fastify.post('/login', loginUser);

    // CSRF token endpoint - applies CSRF to set the cookie, then returns the token
    fastify.get('/csrf-token', {
        preHandler: [fastify.csrfProtection, fastify.csrfTokenCookie]
    }, getCsrfToken);

    // Protected routes WITH CSRF protection
    fastify.get('/me', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, getMe);
    
    fastify.put('/me', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, updateMe);
    
    fastify.get('/discovery/:email', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, discoverUser);

    // Logout - protected to get user ID for token invalidation, no CSRF (cookie might be stale)
    fastify.post('/logout', {
        preHandler: [fastify.authenticate]
    }, logoutUser);

    // WebAuthn routes
    fastify.post('/webauthn/register-options', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, getRegistrationOptions);
    
    fastify.post('/webauthn/register-verify', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, verifyRegistration);
    
    fastify.post('/webauthn/login-options', getAuthenticationOptions);
    fastify.post('/webauthn/login-verify', verifyAuthentication);
    
    fastify.delete('/webauthn/passkey', {
        preHandler: [fastify.authenticate, fastify.csrfProtection]
    }, removePasskey);
}
