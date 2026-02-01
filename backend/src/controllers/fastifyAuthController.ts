import { FastifyReply } from 'fastify';
import { AuthRequest } from '../types/fastify';
import { withAuth, catchAsync } from '../middleware/fastifyControllerWrapper';
import { AuthService } from '../services';

const authService = new AuthService();

export const registerUser = catchAsync(async (request: any, reply: FastifyReply) => {
    const result = await authService.register(request.body as any, request);
    reply.status(201).send({ ...result, message: 'User registered successfully' });
});

export const loginUser = catchAsync(async (request: any, reply: FastifyReply) => {
    if (request.body.email) {
        request.body.email = request.body.email.toLowerCase().trim();
    }

    const result = await authService.login(request.body, request, (token) => {
        reply.setCookie('token', token, {
            httpOnly: true,
            secure: (request.body as any).rememberMe ? false : true,
            sameSite: 'lax',
            maxAge: (request.body as any).rememberMe ? 30 * 24 * 60 * 60 : undefined,
            path: '/'
        });
    });

    // Result is UserResponse or { status: '2FA_REQUIRED' ... }
    reply.send({ ...result, message: 'Login successful' });
});

export const getMe = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await authService.getMe(request.user!.id);
    reply.send(result);
});

export const updateMe = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const result = await authService.updateProfile(request.user!.id, request.body as any, request);
    reply.send(result);
});

export const logoutUser = catchAsync(async (request: any, reply: FastifyReply) => {
    reply.clearCookie('token', { path: '/' });
    reply.send({ message: 'Logged out successfully' });
});

export const getCsrfToken = catchAsync(async (request: any, reply: FastifyReply) => {
    // request.csrfToken is populated by setCsrfTokenCookie middleware
    reply.send({ csrfToken: request.csrfToken });
});

export const discoverUser = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const { email } = request.params as any; // Fastify params are unknown by default
    const result = await authService.discoverUser(email);
    reply.send(result);
});

// WebAuthn controllers
export const getRegistrationOptions = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const options = await authService.getRegistrationOptions(request.user!.id);
    reply.send(options);
});

export const verifyRegistration = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    const verified = await authService.verifyRegistration(request.user!.id, request.body, request);
    if (verified) {
        reply.send({ verified: true });
    } else {
        reply.status(400).send({ verified: false, message: 'Verification failed' });
    }
});

export const getAuthenticationOptions = catchAsync(async (request: any, reply: FastifyReply) => {
    const options = await authService.getAuthenticationOptions(request.body.email);
    reply.send(options);
});

export const verifyAuthentication = catchAsync(async (request: any, reply: FastifyReply) => {
    const result = await authService.verifyAuthentication(request.body.email, request.body, request, (token) => {
        reply.setCookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/'
        });
    });
    reply.send({ ...result, message: 'Login successful' });
});

export const removePasskey = withAuth(async (request: AuthRequest, reply: FastifyReply) => {
    // Passkey ID might be in body or params depending on implementation, 
    // typical DELETE has it in params or body. Let's assume body for now based on standard REST or service sig.
    // Checking AuthService signature if needed but taking best guess from migration doc.
    await authService.removePasskey(request.user!.id, (request.body as any).passkeyId, request);
    reply.send({ message: 'Passkey removed successfully' });
});
