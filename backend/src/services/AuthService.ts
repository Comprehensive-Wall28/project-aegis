import { Request } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { BaseService, ServiceError } from './base/BaseService';
import { UserRepository } from '../repositories/UserRepository';
import { IUser } from '../models/User';
import logger from '../utils/logger';
import { logFailedAuth } from '../utils/auditLogger';
import { encryptToken } from '../utils/cryptoUtils';
import { config } from '../config/env';

// DTOs
export interface RegisterDTO {
    username: string;
    email: string;
    pqcPublicKey: string;
    argon2Hash: string;
    legacyHash?: string; // Optional for migration
}

export interface LoginDTO {
    email: string;
    argon2Hash: string;
    legacyHash?: string; // For migration
}

export interface UpdateProfileDTO {
    username?: string;
    email?: string;
    preferences?: {
        sessionTimeout?: number;
        encryptionLevel?: string;
        backgroundImage?: string | null;
        backgroundBlur?: number;
        backgroundOpacity?: number;
    };
}

export interface UserResponse {
    _id: string;
    username: string;
    email: string;
    pqcPublicKey: string;
    preferences: {
        sessionTimeout: number;
        encryptionLevel: string;
        backgroundImage?: string | null;
        backgroundBlur?: number;
        backgroundOpacity?: number;
    };
    hasPassword: boolean;
}

/**
 * AuthService handles authentication and user management business logic
 */
export class AuthService extends BaseService<IUser, UserRepository> {
    constructor() {
        super(new UserRepository());
    }

    private async generateToken(id: string, username: string, tokenVersion: number): Promise<string> {
        const jwtToken = jwt.sign({ id, username, tokenVersion }, config.jwtSecret, {
            expiresIn: '365d'
        });
        return await encryptToken(jwtToken);
    }

    private formatUserResponse(user: IUser): UserResponse {
        return {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            pqcPublicKey: user.pqcPublicKey,
            preferences: user.preferences || {
                sessionTimeout: 60,
                encryptionLevel: 'STANDARD',
                backgroundImage: null,
                backgroundBlur: 8,
                backgroundOpacity: 0.4
            },
            hasPassword: !!user.passwordHash,
        };
    }

    // ============== Registration & Login ==============

    async register(data: RegisterDTO, req: Request): Promise<UserResponse> {
        try {
            if (!data.username || !data.email || !data.pqcPublicKey || !data.argon2Hash) {
                throw new ServiceError('Missing required fields', 400);
            }

            const normalizedEmail = data.email.toLowerCase().trim();

            const [existingByEmail, existingByUsername] = await Promise.all([
                this.repository.findByEmail(normalizedEmail),
                this.repository.findByUsername(data.username)
            ]);

            if (existingByEmail || existingByUsername) {
                logger.warn(`Failed registration: Email ${data.email} or username ${data.username} exists`);
                throw new ServiceError('Invalid data or user already exists', 400);
            }

            const passwordHash = await argon2.hash(data.argon2Hash);
            const passwordHashVersion = 2; // New accounts are version 2

            const user = await this.repository.create({
                username: data.username,
                email: normalizedEmail,
                pqcPublicKey: data.pqcPublicKey,
                passwordHash,
                passwordHashVersion
            } as any);

            await this.logAction(user._id.toString(), 'REGISTER', 'SUCCESS', req, {
                username: user.username,
                email: user.email
            });

            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Register error:', error);
            throw new ServiceError('Registration failed', 500);
        }
    }

    async login(
        data: LoginDTO,
        req: Request,
        setCookie: (token: string) => void
    ): Promise<UserResponse> {
        try {
            if (!data.email || !data.argon2Hash) {
                throw new ServiceError('Missing credentials', 400);
            }

            const normalizedEmail = data.email.toLowerCase().trim();
            const argon2Hash = data.argon2Hash.toLowerCase();
            const legacyHash = data.legacyHash?.toLowerCase();

            const user = await this.repository.findByEmail(normalizedEmail);
            if (!user || !user.passwordHash) {
                logger.warn(`Failed login for email: ${normalizedEmail} (user not found)`);
                await logFailedAuth(normalizedEmail, 'LOGIN_FAILED', req, { userAgent: req.headers['user-agent'] });
                throw new ServiceError('Invalid credentials', 401);
            }

            const hashVersion = user.passwordHashVersion || 1;
            let verified = false;

            if (hashVersion === 1) {
                // Migration path: verify against legacyHash if provided
                if (legacyHash) {
                    verified = await argon2.verify(user.passwordHash, legacyHash);
                } else {
                    // Fallback to argon2Hash if legacyHash not provided (unlikely during migration window)
                    verified = await argon2.verify(user.passwordHash, argon2Hash);
                }

                if (verified) {
                    // Success! Migrate to version 2
                    const newPasswordHash = await argon2.hash(argon2Hash);
                    await this.repository.updateById(user._id.toString(), {
                        $set: {
                            passwordHash: newPasswordHash,
                            passwordHashVersion: 2
                        }
                    } as any);
                }
            } else {
                // Version 2: standard verify against argon2Hash
                verified = await argon2.verify(user.passwordHash, argon2Hash);
            }

            if (!verified) {
                logger.warn(`Failed login for email: ${normalizedEmail} (invalid password)`);
                await logFailedAuth(normalizedEmail, 'LOGIN_FAILED', req, { userAgent: req.headers['user-agent'] });
                throw new ServiceError('Invalid credentials', 401);
            }



            // No 2FA, complete login
            const token = await this.generateToken(user._id.toString(), user.username, user.tokenVersion || 0);
            setCookie(token);

            await this.logAction(user._id.toString(), 'LOGIN', 'SUCCESS', req, {
                email: user.email,
                userAgent: req.headers['user-agent']
            });

            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Login error:', error);
            throw new ServiceError('Login failed', 500);
        }
    }

    async getMe(userId: string): Promise<UserResponse> {
        try {
            const user = await this.repository.findById(userId);
            if (!user) {
                throw new ServiceError('User not found', 404);
            }
            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('GetMe error:', error);
            throw new ServiceError('Failed to get user', 500);
        }
    }

    async discoverUser(email: string): Promise<{ username: string; pqcPublicKey: string }> {
        try {
            if (!email) {
                throw new ServiceError('Email parameter is required', 400);
            }

            const result = await this.repository.findForSharing(email);
            if (!result) {
                throw new ServiceError('User not found', 404);
            }

            return result;
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Discover user error:', error);
            throw new ServiceError('Discovery failed', 500);
        }
    }

    async updateProfile(userId: string, data: UpdateProfileDTO, req: Request): Promise<UserResponse> {
        try {
            const updateFields: any = {};

            if (data.username !== undefined) {
                const sanitizedUsername = String(data.username).trim();
                if (sanitizedUsername.length < 3) {
                    throw new ServiceError('Username must be at least 3 characters', 400);
                }
                if (await this.repository.isUsernameTaken(sanitizedUsername, userId)) {
                    logger.warn(`Profile update failed: username ${sanitizedUsername} already taken`);
                    throw new ServiceError('Username already taken', 400);
                }
                updateFields.username = sanitizedUsername;
            }

            if (data.email !== undefined) {
                const sanitizedEmail = String(data.email).trim().toLowerCase();
                if (sanitizedEmail.length > 254) {
                    throw new ServiceError('Email too long', 400);
                }
                const emailRegex = /^[^\s@]+@[^@\s.]+(\.[^@\s.]+)+$/;
                if (!emailRegex.test(sanitizedEmail)) {
                    throw new ServiceError('Invalid email format', 400);
                }
                if (await this.repository.isEmailTaken(sanitizedEmail, userId)) {
                    logger.warn(`Profile update failed: email ${sanitizedEmail} already taken`);
                    throw new ServiceError('Email already taken', 400);
                }
                updateFields.email = sanitizedEmail;
            }

            if (data.preferences && typeof data.preferences === 'object') {
                if (data.preferences.sessionTimeout !== undefined) {
                    const timeout = Number(data.preferences.sessionTimeout);
                    if (isNaN(timeout) || timeout < 5 || timeout > 480) {
                        throw new ServiceError('Session timeout must be between 5 and 480 minutes', 400);
                    }
                    updateFields['preferences.sessionTimeout'] = timeout;
                }

                if (data.preferences.encryptionLevel !== undefined) {
                    const validLevels = ['STANDARD', 'HIGH', 'PARANOID'];
                    const level = String(data.preferences.encryptionLevel).toUpperCase();
                    if (!validLevels.includes(level)) {
                        throw new ServiceError('Invalid encryption level', 400);
                    }
                    updateFields['preferences.encryptionLevel'] = level;
                }

                if (data.preferences.backgroundImage !== undefined) {
                    const bgImage = data.preferences.backgroundImage;
                    if (bgImage !== null && typeof bgImage !== 'string') {
                        throw new ServiceError('Background image must be a string ID or null', 400);
                    }
                    updateFields['preferences.backgroundImage'] = bgImage;
                }

                if (data.preferences.backgroundBlur !== undefined) {
                    const blur = Number(data.preferences.backgroundBlur);
                    if (isNaN(blur) || blur < 0 || blur > 50) {
                        throw new ServiceError('Background blur must be between 0 and 50', 400);
                    }
                    updateFields['preferences.backgroundBlur'] = blur;
                }

                if (data.preferences.backgroundOpacity !== undefined) {
                    const opacity = Number(data.preferences.backgroundOpacity);
                    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
                        throw new ServiceError('Background opacity must be between 0 and 1', 400);
                    }
                    updateFields['preferences.backgroundOpacity'] = opacity;
                }
            }

            if (Object.keys(updateFields).length === 0) {
                throw new ServiceError('No valid fields to update', 400);
            }

            const updatedUser = await this.repository.updateById(userId, { $set: updateFields } as any);
            if (!updatedUser) {
                throw new ServiceError('User not found', 404);
            }

            await this.logAction(userId, 'PROFILE_UPDATE', 'SUCCESS', req, {
                updatedFields: Object.keys(updateFields)
            });

            return this.formatUserResponse(updatedUser);
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Update profile error:', error);
            throw new ServiceError('Update failed', 500);
        }
    }

    async logout(userId: string | undefined, req: Request): Promise<void> {
        if (userId) {
            // Increment tokenVersion to invalidate all existing tokens for this user
            await this.repository.incrementTokenVersion(userId);
            await this.logAction(userId, 'LOGOUT', 'SUCCESS', req, {});
        }
    }


    // ============== Password & Passkey Management ==============

    async setPassword(userId: string, argon2Hash: string, req: Request): Promise<void> {
        try {
            if (!argon2Hash) {
                throw new ServiceError('Missing argon2Hash', 400);
            }

            const user = await this.repository.findById(userId);
            if (!user) {
                throw new ServiceError('User not found', 404);
            }

            const normalizedArgon2Hash = argon2Hash.toLowerCase();
            const passwordHash = await argon2.hash(normalizedArgon2Hash);
            await this.repository.updateById(userId, {
                $set: {
                    passwordHash,
                    passwordHashVersion: 2
                }
            } as any);

            await this.logAction(userId, 'PASSWORD_UPDATE', 'SUCCESS', req, {
                note: 'Password re-added'
            });
        } catch (error) {
            if (error instanceof ServiceError) throw error;
            logger.error('Set password error:', error);
            throw new ServiceError('Failed to set password', 500);
        }
    }
}
