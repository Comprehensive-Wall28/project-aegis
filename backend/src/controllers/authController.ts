import { Request, Response } from 'express';
import User from '../models/User';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

export const registerUser = async (req: Request, res: Response) => {
    try {
        const { email, pqcPublicKey, argon2Hash } = req.body;

        // Use a generic error if fields are missing to verify input? 
        // Usually validation errors can be specific, but auth *failures* should be generic.
        // However, missing fields is a bad request, not an auth failure per se.
        if (!email || !pqcPublicKey || !argon2Hash) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            logger.warn(`Failed registration attempt: Email ${email} already exists`);
            return res.status(400).json({ message: 'Invalid data or user already exists' });
        }

        // Hash the client-provided hash again to store it securely 
        const passwordHash = await argon2.hash(argon2Hash);

        const user = await User.create({
            email,
            pqcPublicKey,
            passwordHash,
        });

        if (user) {
            logger.info(`User registered: ${user._id}`);
            res.status(201).json({
                _id: user._id,
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
            const token = generateToken(user._id.toString());

            // HTTP-only cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            logger.info(`User logged in: ${user.email}`);

            res.json({
                _id: user._id,
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
