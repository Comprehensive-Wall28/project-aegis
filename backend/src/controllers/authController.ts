import { Request, Response } from 'express';
import User from '../models/User';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    VerifiedRegistrationResponse,
    VerifiedAuthenticationResponse,
    AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import logger from '../utils/logger';
import { logAuditEvent, logFailedAuth } from '../utils/auditLogger';

const generateToken = (id: string, username: string) => {
    return jwt.sign({ id, username }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '365d', // Long-lived for persistence
    });
};

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { username, email, pqcPublicKey, argon2Hash } = req.body;

        if (!username || !email || !pqcPublicKey || !argon2Hash) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const userExistsByEmail = await User.findOne({ email });
        const userExistsByUsername = await User.findOne({ username });

        if (userExistsByEmail || userExistsByUsername) {
            logger.warn(`Failed registration attempt: Email ${email} or username ${username} already exists`);
            return res.status(400).json({ message: 'Invalid data or user already exists' });
        }

        // Hash the client-provided hash again to store it securely 
        const passwordHash = await argon2.hash(argon2Hash);

        const user = await User.create({
            username,
            email,
            pqcPublicKey,
            passwordHash,
        });

        if (user) {
            logger.info(`User registered: ${user._id}`);

            // Log successful registration
            await logAuditEvent(
                user._id.toString(),
                'REGISTER',
                'SUCCESS',
                req,
                { username: user.username, email: user.email }
            );

            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                pqcPublicKey: user.pqcPublicKey,
                message: 'User registered successfully'
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, argon2Hash } = req.body;

        if (!email || !argon2Hash) {
            return res.status(400).json({ message: 'Missing credentials' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.passwordHash) {
            logger.warn(`Failed login attempt for email: ${email} (user not found or no password)`);
            await logFailedAuth(email, 'LOGIN_FAILED', req, { userAgent: req.headers['user-agent'] });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        if (!(await argon2.verify(user.passwordHash, argon2Hash))) {
            logger.warn(`Failed login attempt for email: ${email} (invalid password)`);
            await logFailedAuth(email, 'LOGIN_FAILED', req, { userAgent: req.headers['user-agent'] });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        logger.info(`Password verified for: ${user.email}`);

        // Check if 2FA is needed
        if (user.webauthnCredentials && user.webauthnCredentials.length > 0) {
            const options = await generateAuthenticationOptions({
                rpID: process.env.RP_ID || 'localhost',
                allowCredentials: user.webauthnCredentials.map(cred => ({
                    id: cred.credentialID,
                    type: 'public-key',
                    transports: cred.transports as AuthenticatorTransportFuture[],
                })),
                userVerification: 'preferred',
            });

            user.currentChallenge = options.challenge;
            await user.save();

            return res.json({
                status: '2FA_REQUIRED',
                options,
                message: 'Passkey 2FA required'
            });
        }

        // No 2FA required, set session
        const token = generateToken(user._id.toString(), user.username);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            partitioned: process.env.NODE_ENV === 'production',
        } as any);

        logger.info(`User logged in: ${user.email}`);

        await logAuditEvent(
            user._id.toString(),
            'LOGIN',
            'SUCCESS',
            req,
            { email: user.email, userAgent: req.headers['user-agent'] }
        );

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            pqcPublicKey: user.pqcPublicKey,
            preferences: user.preferences || { sessionTimeout: 60, encryptionLevel: 'STANDARD' },
            hasPassword: !!user.passwordHash,
            webauthnCredentials: user.webauthnCredentials.map(c => ({
                credentialID: c.credentialID,
                counter: c.counter,
                transports: c.transports
            })),
            message: 'Login successful',
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

interface AuthRequest extends Request {
    user?: { id: string; username: string };
}

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            pqcPublicKey: user.pqcPublicKey,
            preferences: user.preferences || { sessionTimeout: 60, encryptionLevel: 'STANDARD' },
            hasPassword: !!user.passwordHash,
            webauthnCredentials: user.webauthnCredentials.map(c => ({
                credentialID: c.credentialID,
                counter: c.counter,
                transports: c.transports
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { username, email, preferences } = req.body;
        const updateFields: { username?: string; email?: string; preferences?: { sessionTimeout?: number; encryptionLevel?: string } } = {};

        // Validate and sanitize inputs
        if (username !== undefined) {
            const sanitizedUsername = String(username).trim();
            if (sanitizedUsername.length < 3) {
                return res.status(400).json({ message: 'Username must be at least 3 characters' });
            }
            // Check if username is taken by another user
            const existingUser = await User.findOne({
                username: sanitizedUsername,
                _id: { $ne: req.user.id }
            });
            if (existingUser) {
                logger.warn(`Profile update failed: username ${sanitizedUsername} already taken`);
                return res.status(400).json({ message: 'Username already taken' });
            }
            updateFields.username = sanitizedUsername;
        }

        if (email !== undefined) {
            const sanitizedEmail = String(email).trim().toLowerCase();
            // Improved email regex to avoid ReDoS and added length limit
            if (sanitizedEmail.length > 254) {
                return res.status(400).json({ message: 'Email too long' });
            }
            const emailRegex = /^[^\s@]+@[^@\s.]+(\.[^@\s.]+)+$/;
            if (!emailRegex.test(sanitizedEmail)) {
                return res.status(400).json({ message: 'Invalid email format' });
            }
            // Check if email is taken by another user
            const existingUser = await User.findOne({
                email: sanitizedEmail,
                _id: { $ne: req.user.id }
            });
            if (existingUser) {
                logger.warn(`Profile update failed: email ${sanitizedEmail} already taken`);
                return res.status(400).json({ message: 'Email already taken' });
            }
            updateFields.email = sanitizedEmail;
        }

        // Handle preferences updates
        if (preferences !== undefined && typeof preferences === 'object') {
            updateFields.preferences = {};

            if (preferences.sessionTimeout !== undefined) {
                const timeout = Number(preferences.sessionTimeout);
                if (isNaN(timeout) || timeout < 5 || timeout > 480) {
                    return res.status(400).json({ message: 'Session timeout must be between 5 and 480 minutes' });
                }
                updateFields.preferences.sessionTimeout = timeout;
            }

            if (preferences.encryptionLevel !== undefined) {
                const validLevels = ['STANDARD', 'HIGH', 'PARANOID'];
                const level = String(preferences.encryptionLevel).toUpperCase();
                if (!validLevels.includes(level)) {
                    return res.status(400).json({ message: 'Invalid encryption level' });
                }
                updateFields.preferences.encryptionLevel = level;
            }

            // Remove empty preferences object if no valid preferences were provided
            if (Object.keys(updateFields.preferences).length === 0) {
                delete updateFields.preferences;
            }
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        logger.info(`Profile updated for user: ${updatedUser._id}`);

        // Log profile update
        await logAuditEvent(
            req.user.id,
            'PROFILE_UPDATE',
            'SUCCESS',
            req,
            { updatedFields: Object.keys(updateFields) }
        );

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            pqcPublicKey: updatedUser.pqcPublicKey,
            preferences: updatedUser.preferences || { sessionTimeout: 60, encryptionLevel: 'STANDARD' }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const logoutUser = async (req: AuthRequest, res: Response) => {
    try {
        // Log logout before clearing cookie
        if (req.user) {
            await logAuditEvent(
                req.user.id,
                'LOGOUT',
                'SUCCESS',
                req,
                {}
            );
        }

        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            expires: new Date(0),
            partitioned: process.env.NODE_ENV === 'production',
        } as any);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCsrfToken = (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken() });
};

// WebAuthn Registration
export const getRegistrationOptions = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const options = await generateRegistrationOptions({
            rpName: 'Project Aegis',
            rpID: process.env.RP_ID || 'localhost',
            userID: isoUint8Array.fromUTF8String(user._id.toString()),
            userName: user.username,
            attestationType: 'none',
            excludeCredentials: user.webauthnCredentials.map(cred => ({
                id: cred.credentialID,
                type: 'public-key',
                transports: cred.transports as any,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        user.currentChallenge = options.challenge;
        await user.save();

        res.json(options);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to generate registration options' });
    }
};

export const verifyRegistration = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

        const { body } = req;
        const user = await User.findById(req.user.id);
        if (!user || !user.currentChallenge) {
            return res.status(400).json({ message: 'Registration challenge not found' });
        }

        const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
            expectedRPID: process.env.RP_ID || 'localhost',
        });

        if (verification.verified && verification.registrationInfo) {
            const { credential } = verification.registrationInfo;

            user.webauthnCredentials.push({
                credentialID: credential.id,
                publicKey: isoBase64URL.fromBuffer(credential.publicKey),
                counter: credential.counter,
                transports: credential.transports as any,
            });

            user.currentChallenge = undefined;
            await user.save();

            await logAuditEvent(user._id.toString(), 'PASSKEY_REGISTER', 'SUCCESS', req, { credentialID: credential.id });

            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false, message: 'Verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to verify registration' });
    }
};

// WebAuthn Authentication
export const getAuthenticationOptions = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const options = await generateAuthenticationOptions({
            rpID: process.env.RP_ID || 'localhost',
            allowCredentials: user.webauthnCredentials.map(cred => ({
                id: cred.credentialID,
                type: 'public-key',
                transports: cred.transports as any,
            })),
            userVerification: 'preferred',
        });

        user.currentChallenge = options.challenge;
        await user.save();

        res.json(options);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to generate authentication options' });
    }
};

export const verifyAuthentication = async (req: Request, res: Response) => {
    try {
        const { email, body } = req.body;
        if (!email || !body) return res.status(400).json({ message: 'Email and body required' });

        const user = await User.findOne({ email });
        if (!user || !user.currentChallenge) {
            return res.status(400).json({ message: 'Authentication challenge not found' });
        }

        const dbCredential = user.webauthnCredentials.find(c => c.credentialID === body.id);
        if (!dbCredential) return res.status(400).json({ message: 'Credential not found' });

        const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
            expectedRPID: process.env.RP_ID || 'localhost',
            credential: {
                id: dbCredential.credentialID,
                publicKey: isoBase64URL.toBuffer(dbCredential.publicKey),
                counter: dbCredential.counter,
                transports: dbCredential.transports as any,
            },
        });

        if (verification.verified && verification.authenticationInfo) {
            dbCredential.counter = verification.authenticationInfo.newCounter;
            user.currentChallenge = undefined;
            await user.save();

            const token = generateToken(user._id.toString(), user.username);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                partitioned: process.env.NODE_ENV === 'production',
            } as any);

            await logAuditEvent(user._id.toString(), 'PASSKEY_LOGIN', 'SUCCESS', req, { email: user.email });

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                pqcPublicKey: user.pqcPublicKey,
                preferences: user.preferences || { sessionTimeout: 60, encryptionLevel: 'STANDARD' },
                hasPassword: !!user.passwordHash,
                message: 'Login successful',
            });
        } else {
            res.status(400).json({ verified: false, message: 'Verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to verify authentication' });
    }
};

export const removePassword = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.webauthnCredentials.length === 0) {
            return res.status(400).json({ message: 'Must have at least one passkey registered to remove password' });
        }

        user.passwordHash = undefined;
        await user.save();

        await logAuditEvent(user._id.toString(), 'PASSWORD_REMOVE', 'SUCCESS', req, {});

        res.json({ message: 'Password removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const setPassword = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        const { argon2Hash } = req.body;
        if (!argon2Hash) return res.status(400).json({ message: 'Missing argon2Hash' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User find failed' });

        user.passwordHash = await argon2.hash(argon2Hash);
        await user.save();

        await logAuditEvent(user._id.toString(), 'PASSWORD_UPDATE', 'SUCCESS', req, { note: 'Password re-added' });

        res.json({ message: 'Password set successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const removePasskey = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

        const { credentialID } = req.body;
        if (!credentialID || typeof credentialID !== 'string') {
            return res.status(400).json({ message: 'Missing or invalid credentialID' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const credentialIndex = user.webauthnCredentials.findIndex(
            (cred) => cred.credentialID === credentialID
        );

        if (credentialIndex === -1) {
            return res.status(404).json({ message: 'Passkey not found' });
        }

        // Remove the credential
        user.webauthnCredentials.splice(credentialIndex, 1);
        await user.save();

        logger.info(`Passkey removed for user: ${user._id}`);
        await logAuditEvent(user._id.toString(), 'PASSKEY_REMOVE', 'SUCCESS', req, { credentialID });

        res.json({
            message: 'Passkey removed successfully',
            remainingCredentials: user.webauthnCredentials.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to remove passkey' });
    }
};
