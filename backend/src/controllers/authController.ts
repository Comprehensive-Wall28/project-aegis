import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services';
import { config } from '../config/env';

// Service instance
const authService = new AuthService();

// Cookie helper for Fastify
const setCookie = (reply: FastifyReply) => (token: string) => {
    reply.setCookie('token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000,
        path: '/',
        partitioned: config.nodeEnv === 'production'
    } as any);
};

// ============== Registration & Login ==============

export const registerUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authService.register(request.body as any, request as any);
    reply.code(201).send({ ...result, message: 'User registered successfully' });
};

export const loginUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    if (body.email) {
        body.email = body.email.toLowerCase().trim();
    }
    if (body.argon2Hash) {
        body.argon2Hash = body.argon2Hash.toLowerCase();
    }
    if (body.legacyHash) {
        body.legacyHash = body.legacyHash.toLowerCase();
    }
    const result = await authService.login(body, request as any, setCookie(reply));

    if ('status' in result && result.status === '2FA_REQUIRED') {
        return reply.send({
            status: '2FA_REQUIRED',
            options: result.options,
            message: 'Passkey 2FA required'
        });
    }

    reply.send({ ...result, message: 'Login successful' });
};

export const getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await authService.getMe(userId);
    reply.send(result);
};

export const discoverUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const result = await authService.discoverUser(params.email);
    reply.send(result);
};

export const updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const result = await authService.updateProfile(userId, request.body as any, request as any);
    reply.send(result);
};

export const logoutUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    await authService.logout(userId, request as any);

    reply.setCookie('token', '', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        expires: new Date(0),
        path: '/',
        partitioned: config.nodeEnv === 'production'
    } as any);
    reply.send({ message: 'Logged out successfully' });
};

export const getCsrfToken = (request: FastifyRequest, reply: FastifyReply) => {
    // CSRF token is set in cookie by csrfTokenCookie hook
    reply.send({ csrfToken: 'token-in-cookie' });
};

// ============== WebAuthn Registration ==============

export const getRegistrationOptions = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const options = await authService.getRegistrationOptions(userId);
    reply.send(options);
};

export const verifyRegistration = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const verified = await authService.verifyRegistration(userId, request.body as any, request as any);
    if (verified) {
        reply.send({ verified: true });
    } else {
        reply.code(400).send({ verified: false, message: 'Verification failed' });
    }
};

// ============== WebAuthn Authentication ==============

export const getAuthenticationOptions = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const options = await authService.getAuthenticationOptions(body.email);
    reply.send(options);
};

export const verifyAuthentication = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, body } = request.body as any;
    const normalizedEmail = email ? email.toLowerCase().trim() : email;
    const result = await authService.verifyAuthentication(normalizedEmail, body, request as any, setCookie(reply));
    reply.send({ ...result, message: 'Login successful' });
};

// ============== Password & Passkey Management ==============

export const removePassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    await authService.removePassword(userId, request as any);
    reply.send({ message: 'Password removed successfully' });
};

export const setPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const body = request.body as any;
    await authService.setPassword(userId, body.argon2Hash, request as any);
    reply.send({ message: 'Password set successfully' });
};

export const removePasskey = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    const userId = user?.id || user?._id;
    const body = request.body as any;
    const remainingCredentials = await authService.removePasskey(
        userId,
        body.credentialID,
        request as any
    );
    reply.send({ message: 'Passkey removed successfully', remainingCredentials });
};
