import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserRepository } from './repositories/user.repository';
import { RegisterRequestDto } from './dto/register-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserDocument } from './schemas/user.schema';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditStatus } from '../audit/schemas/audit-log.schema';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly auditService: AuditService,
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
}
