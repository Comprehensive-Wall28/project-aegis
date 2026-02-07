import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CryptoUtils } from '../utils/crypto.utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private cryptoUtils: CryptoUtils,
  ) {}

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
      // 1. Decrypt (async)
      const decryptedToken = await this.cryptoUtils.decryptToken(token);

      // 2. Verify
      const secret = this.configService.get<string>('app.auth.jwtSecret');
      if (!secret) throw new Error('JWT Secret missing');

      const decoded = jwt.verify(decryptedToken, secret) as any;

      // 3. Attach to request
      request.user = decoded;

      // TODO: Implement User DB check and tokenVersion check here when AuthModule is migrated.
      // For now, infrastructure passes valid tokens.

      return true;
    } catch (error) {
      this.logger.error('Auth failed', error);
      throw new UnauthorizedException('Not authorized, token failed');
    }
  }

  private extractToken(req: any): string | undefined {
    // 1. Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    // 2. Cookie using fastify-cookie (unsigned usually, or signed? Legacy used generic cookie. Fastify cookies are in req.cookies)
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }
    return undefined;
  }
}
