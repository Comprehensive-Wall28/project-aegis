import { Request, Response } from 'express';
import { AuthService } from '../services';
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
        maxAge: 3 * 24 * 60 * 60 * 1000,
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

