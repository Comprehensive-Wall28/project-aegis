import { Request, Response } from 'express';
import { AuthService, ServiceError } from '../services';
import logger from '../utils/logger';
import { config } from '../config/env';

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
        partitioned: config.nodeEnv === 'production'
    } as any);
};

// ============== Registration & Login ==============

export const registerUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.register(req.body, req);
        res.status(201).json({ ...result, message: 'User registered successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
        handleError(error, res);
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await authService.getMe(req.user.id);
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
};

export const discoverUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await authService.discoverUser(req.params.email);
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const result = await authService.updateProfile(req.user.id, req.body, req);
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
};

export const logoutUser = async (req: AuthRequest, res: Response) => {
    try {
        await authService.logout(req.user?.id, req);

        res.cookie('token', '', {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            expires: new Date(0),
            partitioned: config.nodeEnv === 'production'
        } as any);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

export const getCsrfToken = (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken() });
};

// ============== WebAuthn Registration ==============

export const getRegistrationOptions = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        const options = await authService.getRegistrationOptions(req.user.id);
        res.json(options);
    } catch (error) {
        handleError(error, res);
    }
};

export const verifyRegistration = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        const verified = await authService.verifyRegistration(req.user.id, req.body, req);
        if (verified) {
            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false, message: 'Verification failed' });
        }
    } catch (error) {
        handleError(error, res);
    }
};

// ============== WebAuthn Authentication ==============

export const getAuthenticationOptions = async (req: Request, res: Response) => {
    try {
        const options = await authService.getAuthenticationOptions(req.body.email);
        res.json(options);
    } catch (error) {
        handleError(error, res);
    }
};

export const verifyAuthentication = async (req: Request, res: Response) => {
    try {
        const { email, body } = req.body;
        const normalizedEmail = email ? email.toLowerCase().trim() : email;
        const result = await authService.verifyAuthentication(normalizedEmail, body, req, setCookie(res));
        res.json({ ...result, message: 'Login successful' });
    } catch (error) {
        handleError(error, res);
    }
};

// ============== Password & Passkey Management ==============

export const removePassword = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        await authService.removePassword(req.user.id, req);
        res.json({ message: 'Password removed successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

export const setPassword = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        await authService.setPassword(req.user.id, req.body.argon2Hash, req);
        res.json({ message: 'Password set successfully' });
    } catch (error) {
        handleError(error, res);
    }
};

export const removePasskey = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        const remainingCredentials = await authService.removePasskey(
            req.user.id,
            req.body.credentialID,
            req
        );
        res.json({ message: 'Passkey removed successfully', remainingCredentials });
    } catch (error) {
        handleError(error, res);
    }
};

// ============== Error Handler ==============

function handleError(error: unknown, res: Response): void {
    if (error instanceof ServiceError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    logger.error('Controller error:', error);
    res.status(500).json({ message: 'Server error' });
}
