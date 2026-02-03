import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../../../common/services/crypto.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRepository } from '../user.repository';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(
        private reflector: Reflector,
        private jwtService: JwtService,
        private configService: ConfigService,
        private cryptoService: CryptoService,
        private userRepository: UserRepository
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('Not authorized, no token');
        }

        try {
            // 1. Decrypt token
            const decryptedToken = await this.cryptoService.decryptToken(token);

            // 2. Verify JWT
            // Note: We use the ConfigService to get the secret ensures we use the same as signing
            const secret = this.configService.get<string>('JWT_SECRET');
            const payload = await this.jwtService.verifyAsync(decryptedToken, {
                secret: secret
            });

            // 3. Check Token Version against DB
            // We only select tokenVersion for efficiency
            // Mongoose model access via repository:
            // The repository methods return User object. 
            // We might need a raw query or just use findById and access property.
            const user = await this.userRepository.findById(payload.id);
            if (!user) {
                throw new UnauthorizedException('Not authorized, user not found');
            }

            const currentTokenVersion = user.tokenVersion || 0;
            const tokenVersion = payload.tokenVersion ?? 0;

            if (tokenVersion !== currentTokenVersion) {
                this.logger.warn(`Token version mismatch for user ${payload.id}: token=${tokenVersion}, current=${currentTokenVersion}`);
                throw new UnauthorizedException('Not authorized, token invalidated');
            }

            // 4. Attach user to request
            // In Fastify request.user is safe? Yes.
            request.user = payload;
            return true;
        } catch (error) {
            this.logger.error('Auth Guard error:', error.message);
            throw new UnauthorizedException('Not authorized, token failed');
        }
    }

    private extractToken(request: any): string | undefined {
        // Check Header: Authorization: Bearer <token>
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.split(' ')[1];
        }

        // Check Cookies: token=<token>
        // Fastify cookies are in request.cookies (if @fastify/cookie registered)
        if (request.cookies && request.cookies.token) {
            return request.cookies.token;
        }

        return undefined;
    }
}
