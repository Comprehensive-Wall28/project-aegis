
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

            // No 2FA in this implementation (skip WebAuthn check)
            // Complete login
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
}
