
import { Injectable, Logger, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { ServiceError } from '../../common/services/base.service';
import { encryptToken } from '../../common/utils/cryptoUtils';
import { AuditService } from '../../common/services/audit.service';
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

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly usersRepository: UsersRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
    ) { }

    private generateToken(userId: string, username: string): string {
        const jwtToken = this.jwtService.sign(
            { id: userId, username },
            { expiresIn: '365d' }
        );
        return encryptToken(jwtToken);
    }

    private formatUserResponse(user: UserDocument): any {
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
            webauthnCredentials: []
        };
    }

    async register(registerDto: RegisterDto, req?: Request): Promise<any> {
        try {
            const { username, email, pqcPublicKey, argon2Hash } = registerDto;

            if (!username || !email || !pqcPublicKey || !argon2Hash) {
                throw new BadRequestException('Missing required fields');
            }

            const normalizedEmail = email.toLowerCase().trim();

            const [existingByEmail, existingByUsername] = await Promise.all([
                this.usersRepository.findByEmail(normalizedEmail),
                this.usersRepository.findByUsername(username)
            ]);

            if (existingByEmail || existingByUsername) {
                this.logger.warn(`Failed registration: Email ${email} or username ${username} exists`);
                throw new BadRequestException('Invalid data or user already exists');
            }

            const passwordHash = await argon2.hash(argon2Hash);
            const passwordHashVersion = 2;

            const user = await this.usersService.create({
                username,
                email: normalizedEmail,
                pqcPublicKey,
                passwordHash,
                passwordHashVersion,
            });

            await this.auditService.logAuditEvent(
                user._id.toString(),
                'REGISTER',
                'SUCCESS',
                req,
                { username: user.username, email: user.email }
            );

            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ConflictException) {
                throw error;
            }
            this.logger.error('Register error:', error);
            throw new BadRequestException('Registration failed');
        }
    }

    async login(
        loginDto: LoginDto,
        req?: Request,
        setCookie?: (token: string) => void
    ): Promise<any> {
        try {
            const { email, argon2Hash, legacyHash } = loginDto;

            if (!email || !argon2Hash) {
                throw new BadRequestException('Missing credentials');
            }

            const normalizedEmail = email.toLowerCase().trim();
            const normalizedArgon2Hash = argon2Hash.toLowerCase();
            const normalizedLegacyHash = legacyHash?.toLowerCase();

            const user = await this.usersRepository.findByEmail(normalizedEmail);
            if (!user || !user.passwordHash) {
                this.logger.warn(`Failed login for email: ${normalizedEmail} (user not found)`);
                await this.auditService.logFailedAuth(
                    normalizedEmail,
                    'LOGIN_FAILED',
                    req,
                    { userAgent: req?.headers?.['user-agent'] }
                );
                throw new UnauthorizedException('Invalid credentials');
            }

            const hashVersion = user.passwordHashVersion || 1;
            let verified = false;

            if (hashVersion === 1) {
                // Migration path: verify against legacyHash if provided
                if (normalizedLegacyHash) {
                    verified = await argon2.verify(user.passwordHash, normalizedLegacyHash);
                } else {
                    // Fallback to argon2Hash
                    verified = await argon2.verify(user.passwordHash, normalizedArgon2Hash);
                }

                if (verified) {
                    // Success! Migrate to version 2
                    const newPasswordHash = await argon2.hash(normalizedArgon2Hash);
                    await this.usersRepository.updateById(user._id.toString(), {
                        $set: {
                            passwordHash: newPasswordHash,
                            passwordHashVersion: 2
                        }
                    } as any);
                }
            } else {
                // Version 2: standard verify against argon2Hash
                verified = await argon2.verify(user.passwordHash, normalizedArgon2Hash);
            }

            if (!verified) {
                this.logger.warn(`Failed login for email: ${normalizedEmail} (invalid password)`);
                await this.auditService.logFailedAuth(
                    normalizedEmail,
                    'LOGIN_FAILED',
                    req,
                    { userAgent: req?.headers?.['user-agent'] }
                );
                throw new UnauthorizedException('Invalid credentials');
            }

            // Check if 2FA required
            if (user.webauthnCredentials && user.webauthnCredentials.length > 0) {
                const options = await generateAuthenticationOptions({
                    rpID: this.configService.get<string>('RP_ID') || 'localhost',
                    allowCredentials: user.webauthnCredentials.map(cred => ({
                        id: cred.credentialID,
                        type: 'public-key',
                        transports: cred.transports as AuthenticatorTransportFuture[]
                    })),
                    userVerification: 'preferred'
                });

                await this.usersRepository.updateChallenge(user._id.toString(), options.challenge);

                return {
                    status: '2FA_REQUIRED',
                    options
                };
            }

            // No 2FA, complete login
            const token = this.generateToken(user._id.toString(), user.username);
            if (setCookie) {
                setCookie(token);
            }

            await this.auditService.logAuditEvent(
                user._id.toString(),
                'LOGIN',
                'SUCCESS',
                req,
                { email: user.email, userAgent: req?.headers?.['user-agent'] }
            );

            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error('Login error:', error);
            throw new UnauthorizedException('Login failed');
        }
    }

    async getMe(userId: string): Promise<any> {
        try {
            const user = await this.usersRepository.findById(userId);
            if (!user) {
                throw new BadRequestException('User not found');
            }
            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('GetMe error:', error);
            throw new BadRequestException('Failed to get user');
        }
    }

    async discoverUser(email: string): Promise<{ username: string; pqcPublicKey: string }> {
        try {
            if (!email) {
                throw new BadRequestException('Email parameter is required');
            }

            const result = await this.usersRepository.findForSharing(email);
            if (!result) {
                throw new BadRequestException('User not found');
            }

            return result;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Discover user error:', error);
            throw new BadRequestException('Discovery failed');
        }
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto, req?: Request): Promise<any> {
        try {
            const updatedUser = await this.usersService.updateProfile(userId, updateProfileDto);

            await this.auditService.logAuditEvent(
                userId,
                'PROFILE_UPDATE',
                'SUCCESS',
                req,
                { updatedFields: Object.keys(updateProfileDto) }
            );

            return this.formatUserResponse(updatedUser);
        } catch (error) {
            this.logger.error('Update profile error:', error);
            throw error;
        }
    }

    async logout(userId: string | undefined, req?: Request): Promise<void> {
        if (userId) {
            await this.auditService.logAuditEvent(userId, 'LOGOUT', 'SUCCESS', req, {});
        }
    }

    // ============== WebAuthn Registration ==============

    async getRegistrationOptions(userId: string): Promise<any> {
        try {
            const user = await this.usersRepository.findById(userId);
            if (!user) {
                throw new BadRequestException('User not found');
            }

            const options = await generateRegistrationOptions({
                rpName: 'Project Aegis',
                rpID: this.configService.get<string>('RP_ID') || 'localhost',
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

            await this.usersRepository.updateChallenge(userId, options.challenge);
            return options;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Get registration options error:', error);
            throw new BadRequestException('Failed to generate registration options');
        }
    }

    async verifyRegistration(userId: string, body: any, req?: Request): Promise<boolean> {
        try {
            const user = await this.usersRepository.findById(userId);
            if (!user || !user.currentChallenge) {
                throw new BadRequestException('Registration challenge not found');
            }

            const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: user.currentChallenge,
                expectedOrigin: this.configService.get<string>('CLIENT_ORIGIN') || 'http://localhost:5173',
                expectedRPID: this.configService.get<string>('RP_ID') || 'localhost'
            });

            if (verification.verified && verification.registrationInfo) {
                const { credential } = verification.registrationInfo;

                await this.usersRepository.addWebAuthnCredential(userId, {
                    credentialID: credential.id,
                    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
                    counter: credential.counter,
                    transports: credential.transports as any
                });

                await this.auditService.logAuditEvent(userId, 'PASSKEY_REGISTER', 'SUCCESS', req, {
                    credentialID: credential.id
                });

                return true;
            }

            return false;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Verify registration error:', error);
            throw new BadRequestException('Failed to verify registration');
        }
    }

    // ============== WebAuthn Authentication ==============

    async getAuthenticationOptions(email: string): Promise<any> {
        try {
            if (!email) {
                throw new BadRequestException('Email required');
            }

            const normalizedEmail = email.toLowerCase().trim();
            const user = await this.usersRepository.findByEmail(normalizedEmail);
            if (!user) {
                throw new BadRequestException('User not found');
            }

            const options = await generateAuthenticationOptions({
                rpID: this.configService.get<string>('RP_ID') || 'localhost',
                allowCredentials: user.webauthnCredentials.map(cred => ({
                    id: cred.credentialID,
                    type: 'public-key',
                    transports: cred.transports as any
                })),
                userVerification: 'preferred'
            });

            await this.usersRepository.updateChallenge(user._id.toString(), options.challenge);
            return options;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Get authentication options error:', error);
            throw new BadRequestException('Failed to generate authentication options');
        }
    }

    async verifyAuthentication(
        email: string,
        body: any,
        req?: Request,
        setCookie?: (token: string) => void
    ): Promise<any> {
        try {
            if (!email || !body) {
                throw new BadRequestException('Email and body required');
            }

            const normalizedEmail = email.toLowerCase().trim();
            const user = await this.usersRepository.findByEmail(normalizedEmail);
            if (!user || !user.currentChallenge) {
                throw new BadRequestException('Authentication challenge not found');
            }

            const dbCredential = user.webauthnCredentials.find(c => c.credentialID === body.id);
            if (!dbCredential) {
                throw new BadRequestException('Credential not found');
            }

            const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge: user.currentChallenge,
                expectedOrigin: this.configService.get<string>('CLIENT_ORIGIN') || 'http://localhost:5173',
                expectedRPID: this.configService.get<string>('RP_ID') || 'localhost',
                credential: {
                    id: dbCredential.credentialID,
                    publicKey: isoBase64URL.toBuffer(dbCredential.publicKey),
                    counter: dbCredential.counter,
                    transports: dbCredential.transports as any
                }
            });

            if (!verification.verified || !verification.authenticationInfo) {
                throw new BadRequestException('Verification failed');
            }

            // Update counter and clear challenge
            dbCredential.counter = verification.authenticationInfo.newCounter;
            user.currentChallenge = undefined;
            await user.save();

            const token = this.generateToken(user._id.toString(), user.username);
            if (setCookie) {
                setCookie(token);
            }

            await this.auditService.logAuditEvent(user._id.toString(), 'PASSKEY_LOGIN', 'SUCCESS', req, {
                email: user.email
            });

            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Verify authentication error:', error);
            throw new BadRequestException('Failed to verify authentication');
        }
    }

    // ============== Password & Passkey Management ==============

    async removePassword(userId: string, req?: Request): Promise<void> {
        try {
            const user = await this.usersRepository.findById(userId);
            if (!user) {
                throw new BadRequestException('User not found');
            }

            if (user.webauthnCredentials.length === 0) {
                throw new BadRequestException('Must have at least one passkey registered to remove password');
            }

            await this.usersRepository.updatePasswordHash(userId, undefined);
            await this.auditService.logAuditEvent(userId, 'PASSWORD_REMOVE', 'SUCCESS', req, {});
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Remove password error:', error);
            throw new BadRequestException('Failed to remove password');
        }
    }

    async setPassword(userId: string, argon2Hash: string, req?: Request): Promise<void> {
        try {
            if (!argon2Hash) {
                throw new BadRequestException('Missing argon2Hash');
            }

            const user = await this.usersRepository.findById(userId);
            if (!user) {
                throw new BadRequestException('User not found');
            }

            const normalizedArgon2Hash = argon2Hash.toLowerCase();
            const passwordHash = await argon2.hash(normalizedArgon2Hash);
            await this.usersRepository.updatePasswordHash(userId, passwordHash);

            await this.auditService.logAuditEvent(userId, 'PASSWORD_UPDATE', 'SUCCESS', req, {
                note: 'Password re-added'
            });
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Set password error:', error);
            throw new BadRequestException('Failed to set password');
        }
    }

    async removePasskey(userId: string, credentialID: string, req?: Request): Promise<number> {
        try {
            if (!credentialID || typeof credentialID !== 'string') {
                throw new BadRequestException('Missing or invalid credentialID');
            }

            const user = await this.usersRepository.findById(userId);
            if (!user) {
                throw new BadRequestException('User not found');
            }

            const credentialExists = user.webauthnCredentials.some(c => c.credentialID === credentialID);
            if (!credentialExists) {
                throw new BadRequestException('Passkey not found');
            }

            await this.usersRepository.removeWebAuthnCredential(userId, credentialID);

            await this.auditService.logAuditEvent(userId, 'PASSKEY_REMOVE', 'SUCCESS', req, { credentialID });

            // Return remaining count
            return user.webauthnCredentials.length - 1;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Remove passkey error:', error);
            throw new BadRequestException('Failed to remove passkey');
        }
    }

}
