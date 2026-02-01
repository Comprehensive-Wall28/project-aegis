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
} from '../controllers/fastifyAuthController';
import { authenticateUser } from '../middleware/fastifyAuthMiddleware';
import { csrfProtection, setCsrfTokenCookie } from '../middleware/fastifyCsrf';

export async function authRoutes(app: FastifyInstance) {
    // Public routes - NO CSRF needed for initial handshake usually, but let's see. 
    // Registration/Login usually don't need CSRF if they don't use cookies for AUTH yet, 
    // but better to follow standard practices. 
    // Migration doc said "Public routes - NO CSRF".

    app.post('/register', registerUser);
    app.post('/login', loginUser);

    // CSRF token endpoint
    // This endpoint sets the CSRF cookie
    app.get('/csrf-token', {
        preHandler: [setCsrfTokenCookie],
        handler: getCsrfToken,
    });

    // Protected routes WITH CSRF
    // Note: verifyCsrf should be added to mutating requests (POST, PUT, DELETE) 
    // or all protected requests if we want strictness.
    // Migration doc used [authenticateUser, csrfProtection].

    app.get('/me', {
        preHandler: [authenticateUser, csrfProtection],
        handler: getMe,
    });

    app.put('/me', {
        preHandler: [authenticateUser, csrfProtection],
        handler: updateMe,
    });

    app.get('/discovery/:email', {
        preHandler: [authenticateUser, csrfProtection],
        handler: discoverUser,
    });

    // Logout
    app.post('/logout', logoutUser);

    // WebAuthn routes
    app.post('/webauthn/register-options', {
        preHandler: [authenticateUser, csrfProtection],
        handler: getRegistrationOptions,
    });

    app.post('/webauthn/register-verify', {
        preHandler: [authenticateUser, csrfProtection],
        handler: verifyRegistration,
    });

    app.post('/webauthn/login-options', getAuthenticationOptions);

    app.post('/webauthn/login-verify', verifyAuthentication);

    app.delete('/webauthn/passkey', {
        preHandler: [authenticateUser, csrfProtection],
        handler: removePasskey,
    });
}
