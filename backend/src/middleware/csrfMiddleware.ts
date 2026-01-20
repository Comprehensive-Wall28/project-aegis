import csrf from 'csurf';
import express from 'express';
import { config } from '../config/env';

// Create CSRF protection middleware (enabled for all environments)
export const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    }
});

// Middleware to expose CSRF token to client via cookie (for Axios)
export const csrfTokenCookie = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
        httpOnly: false,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax'
    });
    next();
};
