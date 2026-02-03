import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
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

import { BaseService, AuditAction, AuditStatus } from '../../common/services/base.service';
import { ServiceError } from '../../common/services/service.error';
import { UserRepository } from './user.repository';
import { User } from './user.schema';
import { CryptoService } from '../../common/services/crypto.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Interfaces matching Express types
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
    webauthnCredentials: Array<{
        credentialID: string;
        counter: number;
        transports?: string[];
    }>;
}

@Injectable()
export class AuthService extends BaseService<User, UserRepository> {
    constructor(
        repository: UserRepository,
        private jwtService: JwtService,
        private configService: ConfigService,
        private cryptoService: CryptoService
    ) {
        super(repository);
    }

    private async generateToken(id: string, username: string, tokenVersion: number): Promise<string> {
        const payload = { id, username, tokenVersion };
        const secret = this.configService.get<string>('JWT_SECRET');
        const jwtToken = await this.jwtService.signAsync(payload, {
            secret: secret,
            expiresIn: '365d'
        });
        return await this.cryptoService.encryptToken(jwtToken);
    }

    private formatUserResponse(user: User): UserResponse {
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
            webauthnCredentials: user.webauthnCredentials.map(c => ({
                credentialID: c.credentialID,
                counter: c.counter,
                transports: c.transports
            }))
        };
    }

    async register(data: RegisterDto, req: any): Promise<UserResponse> {
        if (!data.username || !data.email || !data.pqcPublicKey || !data.argon2Hash) {
            throw new ServiceError('Missing required fields', 400);
        }

        const normalizedEmail = data.email.toLowerCase().trim();

        const [existingByEmail, existingByUsername] = await Promise.all([
            this.repository.findByEmail(normalizedEmail),
            this.repository.findByUsername(data.username)
        ]);

        if (existingByEmail || existingByUsername) {
            this.logger.warn(`Failed registration: Email ${data.email} or username ${data.username} exists`);
            throw new ServiceError('Invalid data or user already exists', 400);
        }

        const passwordHash = await argon2.hash(data.argon2Hash);
        const passwordHashVersion = 2;

        const user = await this.repository.create({
            username: data.username,
            email: normalizedEmail,
            pqcPublicKey: data.pqcPublicKey,
            passwordHash,
            passwordHashVersion,
            preferences: {
                sessionTimeout: 60,
                encryptionLevel: 'STANDARD',
                backgroundImage: null,
                backgroundBlur: 8,
                backgroundOpacity: 0.4
            },
            webauthnCredentials: [],
            totalStorageUsed: 0
        } as any);

        this.logAction(user._id.toString(), AuditAction.CREATE, AuditStatus.SUCCESS, {
            username: user.username,
            email: user.email,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return this.formatUserResponse(user);
    }

    async login(
        data: LoginDto,
        req: any,
        setCookie: (token: string) => void
    ): Promise<UserResponse | { status: '2FA_REQUIRED'; options: any }> {
        if (!data.email || !data.argon2Hash) {
            throw new ServiceError('Missing credentials', 400);
        }

        const normalizedIdentifier = data.email.toLowerCase().trim();
        const user = await this.repository.findByEmail(normalizedIdentifier);

        if (!user || !user.passwordHash) {
            this.logger.warn(`Failed login for email: ${normalizedIdentifier} (user not found)`);
            throw new ServiceError('Invalid credentials', 401);
        }

        const verified = await argon2.verify(user.passwordHash, data.argon2Hash);
        if (!verified) {
            this.logger.warn(`Failed login for email: ${normalizedIdentifier} (invalid password)`);
            throw new ServiceError('Invalid credentials', 401);
        }

        // Check 2FA
        const rpId = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';

        if (user.webauthnCredentials && user.webauthnCredentials.length > 0) {
            const options = await generateAuthenticationOptions({
                rpID: rpId,
                allowCredentials: user.webauthnCredentials.map(cred => ({
                    id: cred.credentialID,
                    type: 'public-key',
                    transports: cred.transports as AuthenticatorTransportFuture[]
                })),
                userVerification: 'preferred'
            });

            await this.repository.updateChallenge(user._id.toString(), options.challenge);

            return {
                status: '2FA_REQUIRED',
                options
            };
        }

        const token = await this.generateToken(user._id.toString(), user.username, user.tokenVersion || 0);
        setCookie(token);

        this.logAction(user._id.toString(), AuditAction.LOGIN, AuditStatus.SUCCESS, {
            email: user.email,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });

        return this.formatUserResponse(user);
    }

    async getMe(userId: string): Promise<UserResponse> {
        const user = await this.repository.findById(userId);
        if (!user) {
            throw new ServiceError('User not found', 404);
        }
        return this.formatUserResponse(user);
    }

    async logout(userId: string | undefined, req: any): Promise<void> {
        if (userId) {
            await this.repository.incrementTokenVersion(userId);
            this.logAction(userId, AuditAction.LOGOUT, AuditStatus.SUCCESS, {
                ip: req.ip
            });
        }
    }

    async discoverUser(email: string): Promise<{ username: string; pqcPublicKey: string }> {
        if (!email) throw new ServiceError('Email parameter is required', 400);
        const result = await this.repository.findForSharing(email);
        if (!result) throw new ServiceError('User not found', 404);
        return result;
    }

    async updateProfile(userId: string, data: any, req: any): Promise<UserResponse> {
        const updateFields: any = {};

        if (data.username !== undefined) {
            const sanitizedUsername = String(data.username).trim();
            if (sanitizedUsername.length < 3) throw new ServiceError('Username must be at least 3 characters', 400);
            if (await this.repository.isUsernameTaken(sanitizedUsername, userId)) {
                this.logger.warn(`Profile update failed: username ${sanitizedUsername} already taken`);
                throw new ServiceError('Username already taken', 400);
            }
            updateFields.username = sanitizedUsername;
        }

        if (data.email !== undefined) {
            const sanitizedEmail = String(data.email).trim().toLowerCase();
            if (sanitizedEmail.length > 254) throw new ServiceError('Email too long', 400);
            const emailRegex = /^[^\s@]+@[^@\s.]+(\.[^@\s.]+)+$/;
            if (!emailRegex.test(sanitizedEmail)) throw new ServiceError('Invalid email format', 400);
            if (await this.repository.isEmailTaken(sanitizedEmail, userId)) {
                this.logger.warn(`Profile update failed: email ${sanitizedEmail} already taken`);
                throw new ServiceError('Email already taken', 400);
            }
            updateFields.email = sanitizedEmail;
        }

        if (data.preferences && typeof data.preferences === 'object') {
            if (data.preferences.sessionTimeout !== undefined) updateFields['preferences.sessionTimeout'] = Number(data.preferences.sessionTimeout);
            if (data.preferences.encryptionLevel !== undefined) updateFields['preferences.encryptionLevel'] = String(data.preferences.encryptionLevel).toUpperCase();
            if (data.preferences.backgroundImage !== undefined) updateFields['preferences.backgroundImage'] = data.preferences.backgroundImage;
            if (data.preferences.backgroundBlur !== undefined) updateFields['preferences.backgroundBlur'] = Number(data.preferences.backgroundBlur);
            if (data.preferences.backgroundOpacity !== undefined) updateFields['preferences.backgroundOpacity'] = Number(data.preferences.backgroundOpacity);
        }

        if (Object.keys(updateFields).length === 0) throw new ServiceError('No valid fields to update', 400);

        const updatedUser = await this.repository.updateById(userId, { $set: updateFields } as any);
        if (!updatedUser) throw new ServiceError('User not found', 404);

        this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, { updatedFields: Object.keys(updateFields) });
        return this.formatUserResponse(updatedUser);
    }

    // WebAuthn methods...
    async getRegistrationOptions(userId: string): Promise<any> {
        const user = await this.repository.findById(userId);
        if (!user) throw new ServiceError('User not found', 404);

        const rpId = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';

        const options = await generateRegistrationOptions({
            rpName: 'Project Aegis',
            rpID: rpId,
            userID: isoUint8Array.fromUTF8String(user._id.toString()),
            userName: user.username,
            attestationType: 'none',
            excludeCredentials: user.webauthnCredentials.map(cred => ({
                id: cred.credentialID,
                type: 'public-key',
                transports: cred.transports as any
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred'
            }
        });

        await this.repository.updateChallenge(userId, options.challenge);
        return options;
    }

    async verifyRegistration(userId: string, body: any, req: any): Promise<boolean> {
        const user = await this.repository.findById(userId);
        if (!user || !user.currentChallenge) throw new ServiceError('Registration challenge not found', 400);

        const rpId = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';
        const clientOrigin = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

        const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: clientOrigin,
            expectedRPID: rpId
        });

        if (verification.verified && verification.registrationInfo) {
            const { credential } = verification.registrationInfo;

            await this.repository.addWebAuthnCredential(userId, {
                credentialID: credential.id,
                publicKey: isoBase64URL.fromBuffer(credential.publicKey),
                counter: credential.counter,
                transports: credential.transports as any
            });

            this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, {
                type: 'PASSKEY_REGISTER',
                credentialID: credential.id
            });

            return true;
        }

        return false;
    }

    async getAuthenticationOptions(email: string): Promise<any> {
        if (!email) throw new ServiceError('Email required', 400);
        const user = await this.repository.findByEmail(email.toLowerCase().trim());
        if (!user) throw new ServiceError('User not found', 404);

        const rpId = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';

        const options = await generateAuthenticationOptions({
            rpID: rpId,
            allowCredentials: user.webauthnCredentials.map(cred => ({
                id: cred.credentialID,
                type: 'public-key',
                transports: cred.transports as any
            })),
            userVerification: 'preferred'
        });

        await this.repository.updateChallenge(user._id.toString(), options.challenge);
        return options;
    }

    async verifyAuthentication(
        email: string,
        body: any,
        req: any,
        setCookie: (token: string) => void
    ): Promise<UserResponse> {
        if (!email || !body) throw new ServiceError('Email and body required', 400);

        const user = await this.repository.findByEmail(email.toLowerCase().trim());
        if (!user || !user.currentChallenge) throw new ServiceError('Authentication challenge not found', 400);

        const dbCredential = user.webauthnCredentials.find(c => c.credentialID === body.id);
        if (!dbCredential) throw new ServiceError('Credential not found', 400);

        const rpId = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';
        const clientOrigin = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

        const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: clientOrigin,
            expectedRPID: rpId,
            credential: {
                id: dbCredential.credentialID,
                publicKey: isoBase64URL.toBuffer(dbCredential.publicKey),
                counter: dbCredential.counter,
                transports: dbCredential.transports as any
            }
        });

        if (!verification.verified || !verification.authenticationInfo) throw new ServiceError('Verification failed', 400);

        dbCredential.counter = verification.authenticationInfo.newCounter;
        user.currentChallenge = undefined;
        await user.save();

        const token = await this.generateToken(user._id.toString(), user.username, user.tokenVersion || 0);
        setCookie(token);

        this.logAction(user._id.toString(), AuditAction.LOGIN, AuditStatus.SUCCESS, { type: 'PASSKEY_LOGIN', email: user.email });
        return this.formatUserResponse(user);
    }

    async removePasword(userId: string, req: any): Promise<void> {
        const user = await this.repository.findById(userId);
        if (!user) throw new ServiceError('User not found', 404);
        if (user.webauthnCredentials.length === 0) throw new ServiceError('Must have at least one passkey registered to remove password', 400);
        await this.repository.updatePasswordHash(userId, undefined);
        this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, { type: 'PASSWORD_REMOVE' });
    }

    async setPassword(userId: string, password: string, req: any): Promise<void> {
        if (!password) throw new ServiceError('Missing password', 400);
        const user = await this.repository.findById(userId);
        if (!user) throw new ServiceError('User not found', 404);
        const passwordHash = await argon2.hash(password);
        await this.repository.updateById(userId, { $set: { passwordHash, passwordHashVersion: 2 } } as any);
        this.logAction(userId, AuditAction.UPDATE, AuditStatus.SUCCESS, { type: 'PASSWORD_UPDATE' });
    }

    async removePasskey(userId: string, credentialID: string, req: any): Promise<number> {
        if (!credentialID) throw new ServiceError('Missing credentialID', 400);

        const user = await this.repository.findById(userId);
        if (!user) throw new ServiceError('User not found', 404);

        const credentialExists = user.webauthnCredentials.some(c => c.credentialID === credentialID);
        if (!credentialExists) throw new ServiceError('Passkey not found', 404);

        await this.repository.removeWebAuthnCredential(userId, credentialID);

        this.logAction(userId, AuditAction.DELETE, AuditStatus.SUCCESS, {
            type: 'PASSKEY_REMOVE',
            credentialID
        });

        return user.webauthnCredentials.length - 1;
    }
}
