import { Request, Response } from 'express';
import { AuthService } from '../services';
import logger from '../utils/logger';
import { config } from '../config/env';
import { catchAsync, withAuth } from '../middleware/controllerWrapper';

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

// Service instance
const authService = new AuthService();

// Cookie helper
const setCookie = (res: Response) => (token: string) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000,
        path: '/',
        partitioned: config.nodeEnv === 'production'
    } as any);
};

// ============== Registration & Login ==============

export const registerUser = catchAsync(async (req: Request, res: Response) => {
    const result = await authService.register(req.body, req);
    res.status(201).json({ ...result, message: 'User registered successfully' });
});

export const loginUser = catchAsync(async (req: Request, res: Response) => {
    if (req.body.email) {
        req.body.email = req.body.email.toLowerCase().trim();
    }
    if (req.body.argon2Hash) {
        req.body.argon2Hash = req.body.argon2Hash.toLowerCase();
    }
    if (req.body.legacyHash) {
        req.body.legacyHash = req.body.legacyHash.toLowerCase();
    }
    const result = await authService.login(req.body, req, setCookie(res));

    if ('status' in result && result.status === '2FA_REQUIRED') {
        return res.json({
            status: '2FA_REQUIRED',
            options: result.options,
            message: 'Passkey 2FA required'
        });
    }

    res.json({ ...result, message: 'Login successful' });
});

export const getMe = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await authService.getMe(req.user!.id);
    res.json(result);
});

export const discoverUser = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await authService.discoverUser(req.params.email as string);
    res.json(result);
});

export const updateMe = withAuth(async (req: AuthRequest, res: Response) => {
    const result = await authService.updateProfile(req.user!.id, req.body, req);
    res.json(result);
});

export const logoutUser = catchAsync(async (req: AuthRequest, res: Response) => {
    await authService.logout(req.user?.id, req);

    res.cookie('token', '', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        expires: new Date(0),
        path: '/',
        partitioned: config.nodeEnv === 'production'
    } as any);
    res.json({ message: 'Logged out successfully' });
});

export const getCsrfToken = (req: Request, res: Response) => {
    res.json({ csrfToken: res.locals.csrfToken });
};

// ============== WebAuthn Registration ==============

export const getRegistrationOptions = withAuth(async (req: AuthRequest, res: Response) => {
    const options = await authService.getRegistrationOptions(req.user!.id);
    res.json(options);
});

export const verifyRegistration = withAuth(async (req: AuthRequest, res: Response) => {
    const verified = await authService.verifyRegistration(req.user!.id, req.body, req);
    if (verified) {
        res.json({ verified: true });
    } else {
        res.status(400).json({ verified: false, message: 'Verification failed' });
    }
});

// ============== WebAuthn Authentication ==============

export const getAuthenticationOptions = catchAsync(async (req: Request, res: Response) => {
    const options = await authService.getAuthenticationOptions(req.body.email);
    res.json(options);
});

export const verifyAuthentication = catchAsync(async (req: Request, res: Response) => {
    const { email, body } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : email;
    const result = await authService.verifyAuthentication(normalizedEmail, body, req, setCookie(res));
    res.json({ ...result, message: 'Login successful' });
});

// ============== Password & Passkey Management ==============

export const removePassword = withAuth(async (req: AuthRequest, res: Response) => {
    await authService.removePassword(req.user!.id, req);
    res.json({ message: 'Password removed successfully' });
});

export const setPassword = withAuth(async (req: AuthRequest, res: Response) => {
    await authService.setPassword(req.user!.id, req.body.argon2Hash, req);
    res.json({ message: 'Password set successfully' });
});

export const removePasskey = withAuth(async (req: AuthRequest, res: Response) => {
    const remainingCredentials = await authService.removePasskey(
        req.user!.id,
        req.body.credentialID,
        req
    );
    res.json({ message: 'Passkey removed successfully', remainingCredentials });
});
