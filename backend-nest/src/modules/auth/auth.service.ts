import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { AuthenticatorTransportFuture } from '@simplewebauthn/typescript-types';

import { UserRepository } from './repositories/user.repository';
import { RegisterRequestDto } from './dto/register-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { UpdateProfileRequestDto } from './dto/update-profile-request.dto';

import { UserResponseDto } from './dto/user-response.dto';
import { UserDocument } from './schemas/user.schema';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditStatus } from '../audit/schemas/audit-log.schema';
import { CryptoUtils } from '../../common/utils/crypto.utils';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly auditService: AuditService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly cryptoUtils: CryptoUtils,
    ) { }


    private formatUserResponse(user: UserDocument): UserResponseDto {
        return {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            pqcPublicKey: user.pqcPublicKey,
            preferences: user.preferences,
            hasPassword: !!user.passwordHash,
            webauthnCredentials: user.webauthnCredentials.map(c => ({
                credentialID: c.credentialID,
                counter: c.counter,
                transports: c.transports
            }))
        };
    }

    async register(data: RegisterRequestDto, clientIp: string): Promise<UserResponseDto> {
        try {
            const normalizedEmail = data.email.toLowerCase().trim();

            const [existingByEmail, existingByUsername] = await Promise.all([
                this.userRepository.findByEmail(normalizedEmail),
                this.userRepository.findByUsername(data.username)
            ]);

            if (existingByEmail || existingByUsername) {
                this.logger.warn(`Failed registration: Email ${data.email} or username ${data.username} exists`);
                throw new BadRequestException('Invalid data or user already exists');
            }

            const passwordHash = await argon2.hash(data.argon2Hash);
            const passwordHashVersion = 2; // New accounts are version 2

            const user = await this.userRepository.create({
                username: data.username,
                email: normalizedEmail,
                pqcPublicKey: data.pqcPublicKey,
                passwordHash,
                passwordHashVersion
            });

            await this.auditService.log({
                userId: user._id.toString(),
                action: AuditAction.REGISTER,
                status: AuditStatus.SUCCESS,
                ipAddress: clientIp,
                metadata: {
                    username: user.username,
                    email: user.email
                }
            });

            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Register error:', error);
            throw new InternalServerErrorException('Registration failed');
        }
    }

    async login(data: LoginRequestDto, req: any, setCookie: (token: string) => void): Promise<UserResponseDto | { status: '2FA_REQUIRED'; options: any }> {
        try {
            if (!data.email || !data.argon2Hash) {
                throw new BadRequestException('Missing credentials');
            }

            const normalizedEmail = data.email.toLowerCase().trim();
            const argon2Hash = data.argon2Hash.toLowerCase();
            const legacyHash = data.legacyHash?.toLowerCase();

            const user = await this.userRepository.findByEmail(normalizedEmail);
            if (!user || !user.passwordHash) {
                this.logger.warn(`Failed login for email: ${normalizedEmail} (user not found)`);
                await this.logFailedAuth(normalizedEmail, 'LOGIN_FAILED', req);
                // Return generic error for security
                throw new BadRequestException('Invalid credentials');
            }

            const hashVersion = user.passwordHashVersion || 1;
            let verified = false;

            if (hashVersion === 1) {
                if (legacyHash) {
                    verified = await argon2.verify(user.passwordHash, legacyHash);
                } else {
                    verified = await argon2.verify(user.passwordHash, argon2Hash);
                }

                if (verified) {
                    const newPasswordHash = await argon2.hash(argon2Hash);
                    await this.userRepository.updateById(user._id.toString(), {
                        $set: {
                            passwordHash: newPasswordHash,
                            passwordHashVersion: 2
                        }
                    } as any);
                }
            } else {
                verified = await argon2.verify(user.passwordHash, argon2Hash);
            }

            if (!verified) {
                this.logger.warn(`Failed login for email: ${normalizedEmail} (invalid password)`);
                await this.logFailedAuth(normalizedEmail, 'LOGIN_FAILED', req);
                throw new BadRequestException('Invalid credentials');
            }

            // Check if 2FA required
            if (user.webauthnCredentials && user.webauthnCredentials.length > 0) {
                const options = await generateAuthenticationOptions({
                    rpID: this.configService.get('app.webAuthn.rpId') || 'localhost',
                    allowCredentials: user.webauthnCredentials.map(cred => ({
                        id: cred.credentialID,
                        type: 'public-key',
                        transports: cred.transports as AuthenticatorTransportFuture[]
                    })),
                    userVerification: 'preferred'
                });

                await this.userRepository.updateChallenge(user._id.toString(), options.challenge);

                return {
                    status: '2FA_REQUIRED',
                    options
                };
            }

            // No 2FA, complete login
            const token = await this.generateToken(user._id.toString(), user.username, user.tokenVersion || 0);
            setCookie(token);

            await this.auditService.log({
                userId: user._id.toString(),
                action: AuditAction.LOGIN,
                status: AuditStatus.SUCCESS,
                ipAddress: req.ip,
                metadata: {
                    email: user.email,
                    userAgent: req.headers['user-agent']
                }
            });

            return this.formatUserResponse(user);
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Login error:', error);
            throw new InternalServerErrorException('Login failed');
        }
    }

    private async generateToken(userId: string, username: string, tokenVersion: number): Promise<string> {
        const token = await this.jwtService.signAsync({
            id: userId,
            username,
            tokenVersion
        });
        return this.cryptoUtils.encryptToken(token);
    }

    async getMe(userId: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BadRequestException('User not found');
        }
        return this.formatUserResponse(user);
    }

    private async logFailedAuth(email: string, action: string, req: any) {
        // Log to logger
        this.logger.warn(`Auth failed: ${action} for ${email} from ${req.ip}`);
    }

    async updateProfile(userId: string, data: UpdateProfileRequestDto, clientIp: string): Promise<UserResponseDto> {
        try {
            if (data.email) {
                data.email = data.email.toLowerCase().trim();
                const emailTaken = await this.userRepository.isEmailTaken(data.email, userId);
                if (emailTaken) {
                    throw new BadRequestException('Email already in use');
                }
            }

            if (data.username) {
                const usernameTaken = await this.userRepository.isUsernameTaken(data.username, userId);
                if (usernameTaken) {
                    throw new BadRequestException('Username already in use');
                }
            }

            const updateData: any = {};
            if (data.username) updateData.username = data.username;
            if (data.email) updateData.email = data.email;

            if (data.preferences) {
                for (const [key, value] of Object.entries(data.preferences)) {
                    if (value !== undefined && value !== null) {
                        updateData[`preferences.${key}`] = value;
                    }
                }
            }

            const updatedUser = await this.userRepository.updateById(userId, { $set: updateData }, { returnNew: true });
            if (!updatedUser) {
                throw new BadRequestException('User not found');
            }

            await this.auditService.log({
                userId: userId,
                action: AuditAction.PROFILE_UPDATE,
                status: AuditStatus.SUCCESS,
                ipAddress: clientIp,
                metadata: {
                    updatedFields: Object.keys(data)
                }
            });

            return this.formatUserResponse(updatedUser);
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error('Update profile error:', error);
            throw new InternalServerErrorException('Failed to update profile');
        }
    }

    async discoverUser(email: string): Promise<{ username: string; pqcPublicKey: string }> {
        try {
            if (!email) {
                throw new BadRequestException('Email parameter is required');
            }

            const result = await this.userRepository.findForSharing(email);
            if (!result) {
                throw new NotFoundException('User not found'); // Matching Express 404/Error behavior
            }

            return { username: result.username, pqcPublicKey: result.pqcPublicKey };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
            this.logger.error('Discover user error:', error);
            throw new InternalServerErrorException('Discovery failed');
        }
    }

    async logout(userId: string): Promise<void> {
        // In the future, we might want to invalidate refresh tokens or clear sessions in Redis
        // For now, we just rely on the client clearing the cookie
        // But we could also update the user's token version to invalidate all existing tokens if needed
        // await this.userRepository.incrementTokenVersion(userId);
        this.logger.log(`User ${userId} logged out`);
    }
}
