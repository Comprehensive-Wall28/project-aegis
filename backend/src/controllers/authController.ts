import { Request, Response } from 'express';
import User from '../models/User';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const generateToken = (id: string, username: string) => {
    return jwt.sign({ id, username }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
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
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
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

        if (user && (await argon2.verify(user.passwordHash, argon2Hash))) {
            const token = generateToken(user._id.toString(), user.username);

            // HTTP-only cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Use 'none' for cross-site in prod
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                partitioned: process.env.NODE_ENV === 'production', // CHIPS compliance for cross-site cookies
            } as any);

            logger.info(`User logged in: ${user.email}`);

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                message: 'Login successful'
            });
        } else {
            logger.warn(`Failed login attempt for email: ${email}`);
            // Generic error
            res.status(401).json({ message: 'Invalid credentials' });
        }

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

        const user = await User.findById(req.user.id).select('-passwordHash -pqcPublicKey');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const logoutUser = async (_req: Request, res: Response) => {
    try {
        res.cookie('token', '', {
            httpOnly: true,
            expires: new Date(0),
        });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
